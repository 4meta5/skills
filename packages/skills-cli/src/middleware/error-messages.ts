/**
 * Enhanced Error Messages for Validation Failures
 *
 * Provides formatted error messages for skill validation failures
 * and retry prompts for the corrective loop.
 */

/**
 * Validation error information
 */
export interface ValidationError {
  /** Skills that were required but not invoked */
  missingSkills: string[];
  /** Skills that were found in the response */
  foundSkills: string[];
  /** Current attempt number (1-indexed) */
  attemptNumber: number;
  /** Maximum number of attempts allowed */
  maxAttempts: number;
}

/**
 * Format a list of items as comma-separated string, or "(none)" if empty
 */
function formatList(items: string[]): string {
  return items.length > 0 ? items.join(', ') : '(none)';
}

/**
 * Format a validation error into a human-readable message
 *
 * Output format:
 * ```
 * VALIDATION FAILURE: Required skill invocation missing.
 *
 * Missing: tdd, no-workarounds
 * Found: code-review
 * Attempt: 2/3
 * ```
 */
export function formatValidationError(error: ValidationError): string {
  const { missingSkills, foundSkills, attemptNumber, maxAttempts } = error;

  return `VALIDATION FAILURE: Required skill invocation missing.

Missing: ${formatList(missingSkills)}
Found: ${formatList(foundSkills)}
Attempt: ${attemptNumber}/${maxAttempts}`;
}

/**
 * Format a retry prompt with skill invocation instructions
 *
 * Output format:
 * ```
 * You MUST invoke:
 * - Skill(skill: "tdd")
 * - Skill(skill: "no-workarounds")
 * ```
 */
export function formatRetryPrompt(error: ValidationError): string {
  const { missingSkills } = error;

  const skillItems = missingSkills
    .map((skill) => `- Skill(skill: "${skill}")`)
    .join('\n');

  return `You MUST invoke:
${skillItems}`;
}
