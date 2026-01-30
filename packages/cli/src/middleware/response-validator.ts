/**
 * Response Validator Hook
 *
 * Validates Claude's responses to ensure required skill calls are made.
 * Part of the corrective loop for skill enforcement.
 */

import { detectToolCalls } from './middleware.js';

/**
 * Result of validating a response
 */
export interface ResponseValidation {
  hasRequiredSkillCalls: boolean;
  missingSkills: string[];
  extraneousCalls: string[];
  suggestedRetryPrompt?: string;
}

/**
 * Options for the response validator
 */
export interface ValidatorOptions {
  /** Required skill names that MUST be called */
  requiredSkills: string[];

  /** Optional skills that are suggested but not required */
  suggestedSkills?: string[];

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Whether to include retry prompt in validation result */
  includeRetryPrompt?: boolean;
}

/**
 * Default options for validator
 */
export const DEFAULT_VALIDATOR_OPTIONS = {
  suggestedSkills: [] as string[],
  maxRetries: 3,
  includeRetryPrompt: false,
} as const;

/**
 * Validate a response against required skills
 *
 * Checks if all required skills are called in the response,
 * identifies missing skills, and flags extraneous calls.
 */
export function validateResponse(
  response: string,
  options: ValidatorOptions
): ResponseValidation {
  const {
    requiredSkills,
    suggestedSkills = DEFAULT_VALIDATOR_OPTIONS.suggestedSkills,
    includeRetryPrompt = DEFAULT_VALIDATOR_OPTIONS.includeRetryPrompt,
    maxRetries = DEFAULT_VALIDATOR_OPTIONS.maxRetries,
  } = options;

  // Detect skill calls in the response
  const detectedCalls = detectToolCalls(response);
  const calledSkills = detectedCalls.map((call) => call.args[0]);

  // Determine missing required skills
  const missingSkills = requiredSkills.filter((skill) => !calledSkills.includes(skill));

  // Determine extraneous calls (not required and not suggested)
  const allowedSkills = new Set([...requiredSkills, ...suggestedSkills]);
  const extraneousCalls = calledSkills.filter((skill) => !allowedSkills.has(skill));

  // Check if all requirements are met
  const hasRequiredSkillCalls = missingSkills.length === 0;

  // Build result
  const result: ResponseValidation = {
    hasRequiredSkillCalls,
    missingSkills,
    extraneousCalls,
  };

  // Add retry prompt if requested and skills are missing
  if (includeRetryPrompt && !hasRequiredSkillCalls) {
    result.suggestedRetryPrompt = generateRetryPrompt(missingSkills, 1, maxRetries);
  }

  return result;
}

/**
 * Generate a retry prompt for missing skills
 *
 * Creates a clear, actionable message to instruct Claude
 * to invoke the missing required skills.
 */
export function generateRetryPrompt(
  missingSkills: string[],
  attemptNumber: number,
  maxAttempts: number
): string {
  const skillList = missingSkills.map((skill) => `Skill(skill: "${skill}")`).join(', ');
  const missingList = missingSkills.join(', ');

  return `COMPLIANCE ERROR: You MUST call ${skillList} before proceeding.
Missing skills: ${missingList}
Attempt ${attemptNumber}/${maxAttempts}.

Please invoke the required skills using the Skill tool.`;
}

/**
 * Check if validation should trigger a retry
 *
 * Returns true if skills are missing AND we have attempts remaining.
 * Returns false if all skills are present OR max attempts reached.
 */
export function shouldRetry(
  validation: ResponseValidation,
  attemptNumber: number,
  maxAttempts: number
): boolean {
  // If all required skills are present, no retry needed
  if (validation.hasRequiredSkillCalls) {
    return false;
  }

  // If we've reached or exceeded max attempts, stop retrying
  if (attemptNumber >= maxAttempts) {
    return false;
  }

  // Skills are missing and we have attempts left
  return true;
}
