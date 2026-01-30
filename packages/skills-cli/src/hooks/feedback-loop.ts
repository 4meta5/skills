/**
 * Feedback Loop Hook
 *
 * Validates Claude's responses and outputs retry prompts for non-compliant responses.
 * Part of the corrective loop for skill enforcement.
 *
 * Shell hook reads response from stdin, validates against expected skill calls,
 * and outputs retry prompt to stdout if non-compliant.
 *
 * Exit codes:
 *   0 - Response is compliant
 *   1 - Response is non-compliant, retry prompt written to stdout
 *   2 - Error (invalid input)
 */

import {
  validateResponse,
  generateRetryPrompt,
  DEFAULT_VALIDATOR_OPTIONS,
} from '../middleware/response-validator.js';

/**
 * Options for the feedback loop
 */
export interface FeedbackLoopOptions {
  /** Required skill names that MUST be called */
  requiredSkills: string[];

  /** Optional skills that are suggested but not required */
  suggestedSkills?: string[];

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
}

/**
 * Result of running the feedback loop
 */
export interface FeedbackLoopResult {
  /** Whether the response is compliant (all required skills called) */
  compliant: boolean;

  /** Retry prompt to send if non-compliant */
  retryPrompt?: string;

  /** List of missing required skills */
  missingSkills: string[];

  /** Current attempt number */
  attemptNumber: number;
}

/**
 * Default options for the feedback loop
 */
export const DEFAULT_FEEDBACK_LOOP_OPTIONS = {
  suggestedSkills: [] as string[],
  maxRetries: 3,
} as const;

/**
 * Run the feedback loop validation
 *
 * Validates a response against required skills and returns the result
 * with retry prompt if non-compliant.
 *
 * @param response - The response to validate
 * @param options - Feedback loop options
 * @param attemptNumber - Current attempt number (1-based, default: 1)
 * @returns Feedback loop result
 */
export async function runFeedbackLoop(
  response: string,
  options: FeedbackLoopOptions,
  attemptNumber: number = 1
): Promise<FeedbackLoopResult> {
  const {
    requiredSkills,
    suggestedSkills = DEFAULT_FEEDBACK_LOOP_OPTIONS.suggestedSkills,
    maxRetries = DEFAULT_FEEDBACK_LOOP_OPTIONS.maxRetries,
  } = options;

  // Validate the response using the response validator
  const validation = validateResponse(response, {
    requiredSkills,
    suggestedSkills,
    maxRetries,
    includeRetryPrompt: false, // We'll generate our own
  });

  // Build the result
  const result: FeedbackLoopResult = {
    compliant: validation.hasRequiredSkillCalls,
    missingSkills: validation.missingSkills,
    attemptNumber,
  };

  // Generate retry prompt if non-compliant
  if (!result.compliant) {
    result.retryPrompt = generateRetryPrompt(
      validation.missingSkills,
      attemptNumber,
      maxRetries
    );
  }

  return result;
}

/**
 * Parse comma-separated skills from environment variable
 *
 * @param value - Comma-separated skill names
 * @returns Array of trimmed skill names
 */
function parseSkillsEnv(value: string | undefined): string[] {
  if (!value || value.trim() === '') {
    return [];
  }
  return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Parse integer from environment variable
 *
 * @param value - String value
 * @param defaultValue - Default if parsing fails
 * @returns Parsed integer or default
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Hook entry point for CLI usage
 *
 * Parses environment variables and stdin to run the feedback loop.
 * Returns exit code and stdout content.
 *
 * Environment variables:
 *   REQUIRED_SKILLS - Comma-separated list of required skill names
 *   SUGGESTED_SKILLS - Comma-separated list of suggested skill names
 *   MAX_RETRIES - Maximum retry attempts (default: 3)
 *   ATTEMPT_NUMBER - Current attempt number (default: 1)
 *
 * @param stdin - Response content from stdin
 * @param env - Environment variables
 * @returns Object with exitCode and stdout
 */
export async function feedbackLoopHook(
  stdin: string,
  env: Record<string, string | undefined>
): Promise<{ exitCode: number; stdout: string }> {
  // Parse REQUIRED_SKILLS - this is required
  if (env.REQUIRED_SKILLS === undefined) {
    return {
      exitCode: 2,
      stdout: 'Error: REQUIRED_SKILLS environment variable is required',
    };
  }

  const requiredSkills = parseSkillsEnv(env.REQUIRED_SKILLS);
  const suggestedSkills = parseSkillsEnv(env.SUGGESTED_SKILLS);
  const maxRetries = parseIntEnv(env.MAX_RETRIES, DEFAULT_FEEDBACK_LOOP_OPTIONS.maxRetries);
  const attemptNumber = parseIntEnv(env.ATTEMPT_NUMBER, 1);

  // Run the feedback loop
  const result = await runFeedbackLoop(
    stdin,
    {
      requiredSkills,
      suggestedSkills,
      maxRetries,
    },
    attemptNumber
  );

  // Return appropriate exit code and output
  if (result.compliant) {
    return {
      exitCode: 0,
      stdout: '',
    };
  }

  return {
    exitCode: 1,
    stdout: result.retryPrompt || '',
  };
}
