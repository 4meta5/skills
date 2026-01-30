import { readFile, access } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { glob } from 'glob';
import type { ArtifactSpec, CompletionRequirement, EvidenceType, CapabilityEvidence } from '../types/index.js';

const execAsync = promisify(exec);

/**
 * Result of checking evidence
 */
export interface EvidenceResult {
  satisfied: boolean;
  evidence_type: EvidenceType;
  evidence_path?: string;
  error?: string;
}

/**
 * Check if a file exists matching a glob pattern
 */
export async function checkFileExists(
  pattern: string,
  cwd: string = process.cwd()
): Promise<EvidenceResult> {
  try {
    const matches = await glob(pattern, { cwd, nodir: true });

    if (matches.length > 0) {
      return {
        satisfied: true,
        evidence_type: 'file_exists',
        evidence_path: matches[0],
      };
    }

    return {
      satisfied: false,
      evidence_type: 'file_exists',
      error: `No files match pattern: ${pattern}`,
    };
  } catch (error) {
    return {
      satisfied: false,
      evidence_type: 'file_exists',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a marker (regex) is found in a file
 */
export async function checkMarkerFound(
  file: string,
  pattern: string,
  cwd: string = process.cwd()
): Promise<EvidenceResult> {
  try {
    const filePath = file.startsWith('/') ? file : `${cwd}/${file}`;

    // Check if file exists
    try {
      await access(filePath);
    } catch {
      return {
        satisfied: false,
        evidence_type: 'marker_found',
        error: `File not found: ${file}`,
      };
    }

    const content = await readFile(filePath, 'utf-8');
    const regex = new RegExp(pattern);

    if (regex.test(content)) {
      return {
        satisfied: true,
        evidence_type: 'marker_found',
        evidence_path: file,
      };
    }

    return {
      satisfied: false,
      evidence_type: 'marker_found',
      error: `Pattern "${pattern}" not found in ${file}`,
    };
  } catch (error) {
    return {
      satisfied: false,
      evidence_type: 'marker_found',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a command succeeds with expected exit code
 */
export async function checkCommandSuccess(
  command: string,
  expectedExitCode: number = 0,
  cwd: string = process.cwd()
): Promise<EvidenceResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });

    return {
      satisfied: true,
      evidence_type: 'command_success',
      evidence_path: command,
    };
  } catch (error) {
    // exec throws on non-zero exit code
    const execError = error as { code?: number; message?: string };

    if (execError.code === expectedExitCode) {
      return {
        satisfied: true,
        evidence_type: 'command_success',
        evidence_path: command,
      };
    }

    return {
      satisfied: false,
      evidence_type: 'command_success',
      error: `Command failed with exit code ${execError.code}: ${execError.message}`,
    };
  }
}

/**
 * Check evidence based on type
 */
export async function checkEvidence(
  spec: ArtifactSpec | CompletionRequirement,
  cwd: string = process.cwd()
): Promise<EvidenceResult> {
  switch (spec.type) {
    case 'file_exists':
      if (!spec.pattern) {
        return {
          satisfied: false,
          evidence_type: 'file_exists',
          error: 'Pattern is required for file_exists check',
        };
      }
      return checkFileExists(spec.pattern, cwd);

    case 'marker_found':
      if (!spec.file || !spec.pattern) {
        return {
          satisfied: false,
          evidence_type: 'marker_found',
          error: 'File and pattern are required for marker_found check',
        };
      }
      return checkMarkerFound(spec.file, spec.pattern, cwd);

    case 'command_success':
      if (!spec.command) {
        return {
          satisfied: false,
          evidence_type: 'command_success',
          error: 'Command is required for command_success check',
        };
      }
      return checkCommandSuccess(
        spec.command,
        spec.expected_exit_code ?? 0,
        cwd
      );

    case 'manual':
      // Manual evidence requires explicit user confirmation
      return {
        satisfied: false,
        evidence_type: 'manual',
        error: 'Manual evidence requires explicit confirmation',
      };

    default:
      return {
        satisfied: false,
        evidence_type: spec.type,
        error: `Unknown evidence type: ${spec.type}`,
      };
  }
}

/**
 * EvidenceChecker class for checking multiple artifacts/requirements
 */
export class EvidenceChecker {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Check a single artifact specification
   */
  async checkArtifact(spec: ArtifactSpec): Promise<EvidenceResult> {
    return checkEvidence(spec, this.cwd);
  }

  /**
   * Check a completion requirement
   */
  async checkRequirement(req: CompletionRequirement): Promise<EvidenceResult> {
    return checkEvidence(req, this.cwd);
  }

  /**
   * Check all completion requirements
   */
  async checkAllRequirements(
    requirements: CompletionRequirement[]
  ): Promise<Map<string, EvidenceResult>> {
    const results = new Map<string, EvidenceResult>();

    for (const req of requirements) {
      results.set(req.name, await this.checkRequirement(req));
    }

    return results;
  }

  /**
   * Check all artifacts for a skill
   */
  async checkAllArtifacts(
    artifacts: ArtifactSpec[]
  ): Promise<Map<string, EvidenceResult>> {
    const results = new Map<string, EvidenceResult>();

    for (const artifact of artifacts) {
      results.set(artifact.name, await this.checkArtifact(artifact));
    }

    return results;
  }

  /**
   * Create capability evidence from a successful check
   */
  createEvidence(
    capability: string,
    satisfiedBy: string,
    result: EvidenceResult
  ): CapabilityEvidence {
    return {
      capability,
      satisfied_at: new Date().toISOString(),
      satisfied_by: satisfiedBy,
      evidence_type: result.evidence_type,
      evidence_path: result.evidence_path,
    };
  }
}
