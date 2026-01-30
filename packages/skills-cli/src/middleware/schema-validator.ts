/**
 * Schema Validator - Zod-based validation for skill invocations
 *
 * Provides type-safe validation for tool calls with actionable error messages.
 */

import { z } from 'zod';

/**
 * Schema for validating skill invocation tool calls
 * Uses strict mode to reject unknown fields
 */
export const SkillInvocationSchema = z
  .object({
    skill: z.string().min(1, 'Skill name is required'),
    args: z.string().optional(),
  })
  .strict();

/**
 * Type for validated skill invocation data
 */
export type SkillInvocation = z.infer<typeof SkillInvocationSchema>;

/**
 * Result of validation - discriminated union for type safety
 */
export type ValidationResult =
  | { success: true; data: SkillInvocation; error?: undefined }
  | { success: false; data?: undefined; error: string };

/**
 * Validates a tool call against the SkillInvocationSchema
 *
 * @param call - Unknown input to validate
 * @returns ValidationResult with either parsed data or error message
 */
export function validateToolCall(call: unknown): ValidationResult {
  const result = SkillInvocationSchema.safeParse(call);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: formatSchemaError(result.error),
  };
}

/**
 * Formats a Zod error into an actionable error message
 *
 * @param error - Zod error to format
 * @returns Human-readable error message with field paths
 */
export function formatSchemaError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'input';

    // Handle unrecognized keys specially for better error messages
    if (issue.code === 'unrecognized_keys' && 'keys' in issue) {
      const keys = issue.keys as string[];
      return `${path}: unknown field(s): ${keys.join(', ')}`;
    }

    return `${path}: ${issue.message}`;
  });

  return issues.join('; ');
}
