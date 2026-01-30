import type { SessionState, ProfileSpec, CompletionRequirement } from '../types/index.js';
import { StateManager } from '../session/index.js';
import { EvidenceChecker, type EvidenceResult } from '../session/evidence-checker.js';
import { formatCompletionDenial, formatStatusSummary } from './denial-formatter.js';

export interface StopHookResult {
  allowed: boolean;
  message?: string;
  missingRequirements?: Array<{
    requirement: CompletionRequirement;
    result: EvidenceResult;
  }>;
}

/**
 * Stop hook that checks if the workflow can be completed
 * based on completion requirements.
 */
export class StopHook {
  private stateManager: StateManager;
  private evidenceChecker: EvidenceChecker;
  private profile: ProfileSpec | null;

  constructor(cwd: string, profile: ProfileSpec | null = null) {
    this.stateManager = new StateManager(cwd);
    this.evidenceChecker = new EvidenceChecker(cwd);
    this.profile = profile;
  }

  /**
   * Check if the workflow can be stopped/completed.
   *
   * @returns Result indicating if stop is allowed and any denial message
   */
  async check(): Promise<StopHookResult> {
    // Load current session state
    const sessionState = await this.stateManager.loadCurrent();

    // If no active session, allow stop
    if (!sessionState) {
      return { allowed: true };
    }

    // If strictness is not 'strict', allow stop with advisory message
    if (sessionState.strictness !== 'strict') {
      return {
        allowed: true,
        message: formatStatusSummary(sessionState, 'allowed'),
      };
    }

    // Get completion requirements from profile or empty array
    const requirements = this.profile?.completion_requirements || [];

    // If no completion requirements, allow stop
    if (requirements.length === 0) {
      return {
        allowed: true,
        message: formatStatusSummary(sessionState, 'allowed'),
      };
    }

    // Check all completion requirements
    const results = await this.evidenceChecker.checkAllRequirements(requirements);

    // Find missing requirements
    const missing: Array<{
      requirement: CompletionRequirement;
      result: EvidenceResult;
    }> = [];

    for (const requirement of requirements) {
      const result = results.get(requirement.name);
      if (result && !result.satisfied) {
        missing.push({ requirement, result });
      }
    }

    // If all requirements are satisfied, allow stop
    if (missing.length === 0) {
      return {
        allowed: true,
        message: formatStatusSummary(sessionState, 'allowed'),
      };
    }

    // Some requirements are missing - format denial message
    const denialMessage = formatCompletionDenial(missing, sessionState);

    return {
      allowed: false,
      message: denialMessage,
      missingRequirements: missing,
    };
  }

  /**
   * Convenience method to check and return exit code suitable for shell scripts.
   * Returns 0 for allowed, 1 for blocked.
   */
  async checkWithExitCode(): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const result = await this.check();

    if (result.allowed) {
      return {
        exitCode: 0,
        stdout: result.message || '',
        stderr: '',
      };
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: result.message || 'Stop blocked by chain enforcement',
    };
  }
}

/**
 * Standalone function to check stop without instantiating the class.
 * Useful for CLI and shell script integration.
 */
export async function checkStop(
  cwd: string,
  profile: ProfileSpec | null = null
): Promise<StopHookResult> {
  const hook = new StopHook(cwd, profile);
  return hook.check();
}
