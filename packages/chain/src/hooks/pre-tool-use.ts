import type { SessionState, SkillSpec, ProfileSpec } from '../types/index.js';
import { StateManager } from '../session/index.js';
import { findBlockedIntents, type ToolInput } from './intent-mapper.js';
import { formatIntentDenial } from './denial-formatter.js';
import { getSkillGuidance, formatGuidanceOutput } from './skill-guidance.js';
import { matchProfileToPrompt } from '../resolver/profile-matcher.js';
import { resolve } from '../resolver/resolver.js';

export interface PreToolUseResult {
  allowed: boolean;
  message?: string;
  blockedIntents?: Array<{ intent: string; reason: string }>;
}

export interface PreToolUseOptions {
  /** The user's prompt/task to auto-match profiles against */
  prompt?: string;
  /** Set to false to disable auto-selection (default: true) */
  autoSelect?: boolean;
}

/**
 * PreToolUse hook that checks if a tool invocation should be allowed
 * based on the current session state and blocked intents.
 * 
 * Supports auto-activation: when no session exists and a prompt is provided,
 * matches the prompt to profiles and auto-activates the best match.
 */
export class PreToolUseHook {
  private stateManager: StateManager;
  private skills: SkillSpec[];
  private profiles: ProfileSpec[];

  constructor(cwd: string, skills: SkillSpec[], profiles: ProfileSpec[] = []) {
    this.stateManager = new StateManager(cwd);
    this.skills = skills;
    this.profiles = profiles;
  }

  /**
   * Auto-activate a profile based on prompt matching.
   * Returns the created session state or null if no match.
   */
  private async autoActivate(prompt: string): Promise<{
    state: SessionState;
    autoActivated: boolean;
  } | null> {
    const match = matchProfileToPrompt(prompt, this.profiles);
    
    if (!match) {
      return null;
    }

    // Filter skills to only those with valid provides arrays
    const validSkills = this.skills.filter(
      s => Array.isArray(s.provides) && s.provides.length > 0
    );

    // Resolve skill chain for this profile
    // resolve() expects (profile, skills) where profile has capabilities_required
    const resolution = match.capabilities_required.length > 0 && validSkills.length > 0
      ? resolve(match, validSkills)
      : { chain: [], blocked_intents: {} };
    
    const chain = resolution.chain;
    const blockedIntents = resolution.blocked_intents || {};

    const sessionState: SessionState = {
      session_id: `auto-${Date.now()}`,
      profile_id: match.name,
      activated_at: new Date().toISOString(),
      chain,
      capabilities_required: match.capabilities_required,
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: match.strictness,
      blocked_intents: blockedIntents,
    };

    await this.stateManager.create(sessionState);

    return { state: sessionState, autoActivated: true };
  }

  /**
   * Check if a tool invocation should be allowed.
   *
   * @param toolInput - The tool name and input parameters
   * @param options - Optional settings including prompt for auto-activation
   * @returns Result indicating if the tool is allowed and any denial message
   */
  async check(
    toolInput: ToolInput,
    options: PreToolUseOptions = {}
  ): Promise<PreToolUseResult> {
    const { prompt, autoSelect = true } = options;

    // Load current session state
    let sessionState = await this.stateManager.loadCurrent();
    let autoActivated = false;

    // If no active chain and auto-selection enabled, try to match profile
    if (!sessionState && prompt && autoSelect && this.profiles.length > 0) {
      const result = await this.autoActivate(prompt);
      if (result) {
        sessionState = result.state;
        autoActivated = result.autoActivated;
      }
    }

    // If still no active chain, allow all tools
    if (!sessionState) {
      return { allowed: true };
    }

    // Find any blocked intents for this tool
    const blocked = findBlockedIntents(toolInput, sessionState.blocked_intents);

    // If no blocked intents, allow the tool with guidance
    if (blocked.length === 0) {
      const guidance = getSkillGuidance(sessionState, this.skills);
      let message = formatGuidanceOutput(guidance, sessionState.profile_id);
      
      if (autoActivated) {
        message = `[chain] auto-activated profile: ${sessionState.profile_id}\n${message}`;
      }
      
      return {
        allowed: true,
        message,
      };
    }

    // Tool is blocked - format denial message
    const denialMessage = formatIntentDenial(
      blocked,
      sessionState,
      this.skills
    );

    return {
      allowed: false,
      message: autoActivated 
        ? `[chain] auto-activated profile: ${sessionState.profile_id}\n${denialMessage}`
        : denialMessage,
      blockedIntents: blocked,
    };
  }

  /**
   * Convenience method to check and return exit code suitable for shell scripts.
   * Returns 0 for allowed, 1 for blocked.
   */
  async checkWithExitCode(
    toolInput: ToolInput,
    options: PreToolUseOptions = {}
  ): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const result = await this.check(toolInput, options);

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
      stderr: result.message || 'Tool blocked by chain enforcement',
    };
  }
}

/**
 * Standalone function to check tool use without instantiating the class.
 * Useful for CLI and shell script integration.
 */
export async function checkPreToolUse(
  cwd: string,
  skills: SkillSpec[],
  toolInput: ToolInput,
  profiles: ProfileSpec[] = [],
  options: PreToolUseOptions = {}
): Promise<PreToolUseResult> {
  const hook = new PreToolUseHook(cwd, skills, profiles);
  return hook.check(toolInput, options);
}
