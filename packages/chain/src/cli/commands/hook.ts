import { loadConfig } from '../../loader/index.js';
import { PreToolUseHook } from '../../hooks/pre-tool-use.js';
import { StopHook } from '../../hooks/stop-hook.js';
import type { SkillSpec, ProfileSpec } from '../../types/index.js';
import { StateManager } from '../../session/index.js';

interface HookPreToolUseOptions {
  tool: string;
  cwd?: string;
  skills?: string;
  profiles?: string;
  /** Optional prompt for auto-activation */
  prompt?: string;
  /** Set to false to disable auto-selection (default: true) */
  auto?: boolean;
}

interface HookStopOptions {
  cwd?: string;
  skills?: string;
  profiles?: string;
}

/**
 * Load skills from config
 */
async function loadSkills(
  cwd: string,
  skillsPath?: string,
  profilesPath?: string
): Promise<{ skills: SkillSpec[]; profiles: ProfileSpec[] }> {
  try {
    const config = await loadConfig(cwd, skillsPath, profilesPath);
    return {
      skills: config.skills,
      profiles: config.profiles,
    };
  } catch {
    // If config doesn't exist, return empty arrays
    return { skills: [], profiles: [] };
  }
}

/**
 * Get current profile from session state
 */
async function getCurrentProfile(
  cwd: string,
  profiles: ProfileSpec[]
): Promise<ProfileSpec | null> {
  const stateManager = new StateManager(cwd);
  const state = await stateManager.loadCurrent();

  if (!state) {
    return null;
  }

  return profiles.find((p) => p.name === state.profile_id) || null;
}

/**
 * Handle PreToolUse hook command
 */
export async function hookPreToolUseCommand(options: HookPreToolUseOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Debug: log options
  // console.error('[DEBUG] hookPreToolUseCommand called with options:', JSON.stringify(options));

  // Check if options.tool exists
  if (!options.tool) {
    console.error('Error: --tool option is required');
    process.exit(1);
  }

  // Parse tool input from JSON
  let toolInput: { tool: string; input?: Record<string, unknown> };
  try {
    toolInput = JSON.parse(options.tool);
  } catch {
    console.error('Error: Invalid tool JSON');
    process.exit(1);
  }

  // Load skills and profiles config
  const { skills, profiles } = await loadSkills(cwd, options.skills, options.profiles);

  // Create and run hook with profiles for auto-activation
  const hook = new PreToolUseHook(cwd, skills, profiles);
  const result = await hook.checkWithExitCode(toolInput, {
    prompt: options.prompt,
    autoSelect: options.auto !== false, // default to true
  });

  // Output result
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }

  process.exit(result.exitCode);
}

/**
 * Handle Stop hook command
 */
export async function hookStopCommand(options: HookStopOptions): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  // Load profiles config
  const { profiles } = await loadSkills(cwd, options.skills, options.profiles);

  // Get current profile
  const profile = await getCurrentProfile(cwd, profiles);

  // Create and run hook
  const hook = new StopHook(cwd, profile);
  const result = await hook.checkWithExitCode();

  // Output result
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }

  process.exit(result.exitCode);
}
