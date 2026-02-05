import { parse as parseYaml } from 'yaml';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { SandboxConfig, SandboxPolicy, TDDPhase } from './types.js';
import { isValidTDDPhase } from './types.js';

/**
 * Interface for frontmatter that may contain a sandbox section
 */
export interface ParsedSandboxFrontmatter {
  sandbox?: SandboxConfig;
}

/**
 * Create a default sandbox policy for a given phase name
 */
function createDefaultPolicy(phaseName: string): SandboxPolicy {
  return {
    name: phaseName,
    allowCommands: [],
    denyCommands: [],
    allowWrite: [],
    denyWrite: []
  };
}

/**
 * Normalize a policy by filling in defaults for missing fields
 */
function normalizePolicy(phaseName: string, rawPolicy: Record<string, unknown>): SandboxPolicy {
  const defaults = createDefaultPolicy(phaseName);
  return {
    name: typeof rawPolicy.name === 'string' ? rawPolicy.name : defaults.name,
    allowCommands: Array.isArray(rawPolicy.allowCommands) ? rawPolicy.allowCommands : defaults.allowCommands,
    denyCommands: Array.isArray(rawPolicy.denyCommands) ? rawPolicy.denyCommands : defaults.denyCommands,
    allowWrite: Array.isArray(rawPolicy.allowWrite) ? rawPolicy.allowWrite : defaults.allowWrite,
    denyWrite: Array.isArray(rawPolicy.denyWrite) ? rawPolicy.denyWrite : defaults.denyWrite
  };
}

/**
 * Parse sandbox section from frontmatter YAML object
 */
export function parseSandboxConfig(frontmatter: Record<string, unknown>): SandboxConfig | undefined {
  // Return undefined if no sandbox field
  if (!('sandbox' in frontmatter) || frontmatter.sandbox === undefined) {
    return undefined;
  }

  const sandbox = frontmatter.sandbox as Record<string, unknown>;

  // Validate required fields
  if (!('state' in sandbox) || typeof sandbox.state !== 'string') {
    throw new Error('Invalid sandbox config: missing required "state" field');
  }

  if (!('profiles' in sandbox) || typeof sandbox.profiles !== 'object' || sandbox.profiles === null) {
    throw new Error('Invalid sandbox config: missing required "profiles" field');
  }

  // Validate that state is a valid TDDPhase
  if (!isValidTDDPhase(sandbox.state)) {
    throw new Error(`Invalid sandbox config: state "${sandbox.state}" is not a valid TDD phase (BLOCKED, RED, GREEN, COMPLETE)`);
  }

  const state = sandbox.state;
  const rawProfiles = sandbox.profiles as Record<string, Record<string, unknown>>;

  // Validate that state exists in profiles
  if (!(state in rawProfiles)) {
    throw new Error(`Invalid sandbox config: state "${state}" not found in profiles`);
  }

  // Normalize all profiles by filling in defaults
  const profiles: Partial<Record<TDDPhase, SandboxPolicy>> = {};
  for (const [phaseName, rawPolicy] of Object.entries(rawProfiles)) {
    profiles[phaseName as TDDPhase] = normalizePolicy(phaseName, rawPolicy);
  }

  return {
    state,
    profiles: profiles as Record<TDDPhase, SandboxPolicy>
  };
}

/**
 * Parse YAML frontmatter from SKILL.md content
 *
 * Expects format:
 * ```
 * ---
 * key: value
 * ---
 * body content
 * ```
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(FRONTMATTER_PATTERN);

  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter delimiters');
  }

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;

  return {
    frontmatter,
    body: match[2].trim()
  };
}

/**
 * Load sandbox config from SKILL.md file path
 */
export async function loadSandboxPolicy(skillPath: string): Promise<SandboxConfig | undefined> {
  const skillMdPath = join(skillPath, 'SKILL.md');

  // Check if file exists
  try {
    await stat(skillMdPath);
  } catch {
    throw new Error(`SKILL.md not found at: ${skillMdPath}`);
  }

  // Read and parse the file
  const content = await readFile(skillMdPath, 'utf-8');
  const { frontmatter } = parseFrontmatter(content);

  return parseSandboxConfig(frontmatter);
}

/**
 * Get policy for a specific phase
 */
export function getPolicyForPhase(config: SandboxConfig, phase: TDDPhase): SandboxPolicy {
  const policy = config.profiles[phase];

  if (!policy) {
    throw new Error(`Phase "${phase}" not found in sandbox profiles`);
  }

  return policy;
}
