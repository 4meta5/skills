import type { SessionState, SkillSpec } from '../types/index.js';
import { StateManager } from '../session/index.js';
import { findBlockedIntents, type ToolInput } from './intent-mapper.js';
import { formatIntentDenial } from './denial-formatter.js';
import { getSkillGuidance, formatGuidanceOutput } from './skill-guidance.js';

export interface PreToolUseResult {
  allowed: boolean;
  message?: string;
  blockedIntents?: Array<{ intent: string; reason: string }>;
}

/**
 * PreToolUse hook that checks if a tool invocation should be allowed
 * based on the current session state and blocked intents.
 */
export class PreToolUseHook {
  private stateManager: StateManager;
  private skills: SkillSpec[];

  constructor(cwd: string, skills: SkillSpec[]) {
    this.stateManager = new StateManager(cwd);
    this.skills = skills;
  }

  /**
   * Check if a tool invocation should be allowed.
   *
   * @param toolInput - The tool name and input parameters
   * @returns Result indicating if the tool is allowed and any denial message
   */
  async check(toolInput: ToolInput): Promise<PreToolUseResult> {
    // Load current session state
    const sessionState = await this.stateManager.loadCurrent();

    // If no active chain, allow all tools
    if (!sessionState) {
      return { allowed: true };
    }

    // Find any blocked intents for this tool
    const blocked = findBlockedIntents(toolInput, sessionState.blocked_intents);

    // If no blocked intents, allow the tool with guidance
    if (blocked.length === 0) {
      const guidance = getSkillGuidance(sessionState, this.skills);
      const message = formatGuidanceOutput(guidance, sessionState.profile_id);
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
      message: denialMessage,
      blockedIntents: blocked,
    };
  }

  /**
   * Convenience method to check and return exit code suitable for shell scripts.
   * Returns 0 for allowed, 1 for blocked.
   */
  async checkWithExitCode(toolInput: ToolInput): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const result = await this.check(toolInput);

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
  toolInput: ToolInput
): Promise<PreToolUseResult> {
  const hook = new PreToolUseHook(cwd, skills);
  return hook.check(toolInput);
}
