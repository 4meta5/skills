/**
 * Agent Middleware Implementation
 *
 * Implements the corrective loop for skill enforcement:
 * - Detects Skill() tool calls in responses
 * - Injects requirements for immediate mode
 * - Rejects non-compliant responses
 */

import type {
  AgentMiddleware,
  MiddlewareState,
  MiddlewareResult,
  MiddlewareOptions,
  DetectedToolCall,
  DEFAULT_MIDDLEWARE_OPTIONS,
} from './types.js';

/**
 * Regex patterns to detect Skill() calls in Claude responses
 */
const SKILL_CALL_PATTERNS = [
  // With named arg first (more specific): Skill(skill: "tdd") or Skill(skill: "tdd", args: "...")
  /Skill\s*\(\s*skill\s*[=:]\s*["']([a-zA-Z0-9_-]+)["']/gi,
  // Function-style: Skill("tdd") or Skill(tdd) or Skill('tdd')
  /Skill\s*\(\s*["']?([a-zA-Z0-9_-]+)["']?\s*[,)]/gi,
];

/**
 * Detect Skill() tool calls in a response
 */
export function detectToolCalls(response: string): DetectedToolCall[] {
  const calls: DetectedToolCall[] = [];
  const seen = new Set<string>();

  for (const pattern of SKILL_CALL_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const skillName = match[1];
      // Avoid duplicates
      if (!seen.has(skillName)) {
        seen.add(skillName);
        calls.push({
          tool: 'Skill',
          args: [skillName],
          raw: match[0],
        });
      }
    }
  }

  return calls;
}

/**
 * Create default middleware state
 */
function createDefaultState(maxRetries: number): MiddlewareState {
  return {
    requiredTools: [],
    mode: 'chat',
    retryCount: 0,
    maxRetries,
  };
}

/**
 * Create an agent middleware instance
 */
export function createMiddleware(options: MiddlewareOptions = {}): AgentMiddleware {
  const maxRetries = options.maxRetries ?? 3;
  const rejectionTemplate =
    options.rejectionTemplate ??
    'COMPLIANCE ERROR: You MUST call Skill({tools}). Attempt {attempt}/{max}.';
  const verbose = options.verbose ?? false;

  let state = createDefaultState(maxRetries);

  return {
    setState(partial: Partial<MiddlewareState>): void {
      state = {
        ...state,
        ...partial,
        maxRetries: partial.maxRetries ?? state.maxRetries,
      };
    },

    getState(): MiddlewareState {
      return { ...state };
    },

    reset(): void {
      state = createDefaultState(maxRetries);
    },

    async processRequest(prompt: string): Promise<string> {
      if (state.mode === 'chat') {
        return prompt;
      }

      if (state.mode === 'immediate' && state.requiredTools.length > 0) {
        const toolList = state.requiredTools.join(', ');
        const instruction = `\n\n[MUST_CALL: Skill(${toolList})]\nYou MUST call these skills before proceeding with implementation.\n\n`;
        return instruction + prompt;
      }

      if (state.mode === 'suggestion' && state.requiredTools.length > 0) {
        const toolList = state.requiredTools.join(', ');
        const instruction = `\n\n[CONSIDER_CALLING: Skill(${toolList})]\nThese skills may be relevant to this task.\n\n`;
        return instruction + prompt;
      }

      return prompt;
    },

    async processResponse(response: string): Promise<MiddlewareResult> {
      // Chat mode: always accept
      if (state.mode === 'chat') {
        return {
          accepted: true,
          response,
          foundTools: [],
          missingTools: [],
        };
      }

      // Suggestion mode: accept but note found tools
      if (state.mode === 'suggestion') {
        const calls = detectToolCalls(response);
        return {
          accepted: true,
          response,
          foundTools: calls.map((c) => c.args[0]),
          missingTools: [],
        };
      }

      // Immediate mode: enforce tool calls
      const calls = detectToolCalls(response);
      const foundTools = calls.map((c) => c.args[0]);
      const missingTools = state.requiredTools.filter(
        (tool) => !foundTools.includes(tool)
      );

      if (missingTools.length === 0) {
        return {
          accepted: true,
          response,
          foundTools,
          missingTools: [],
        };
      }

      // Rejection - tools are missing
      const attempt = state.retryCount + 1;
      const reason = rejectionTemplate
        .replace('{tools}', missingTools.join(', '))
        .replace('{attempt}', String(attempt))
        .replace('{max}', String(state.maxRetries));

      return {
        accepted: false,
        response,
        reason,
        foundTools,
        missingTools,
      };
    },

    shouldRetry(): boolean {
      return state.retryCount < state.maxRetries;
    },

    incrementRetry(): void {
      state.retryCount += 1;
    },
  };
}
