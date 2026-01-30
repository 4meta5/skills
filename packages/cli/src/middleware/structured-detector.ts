/**
 * Structured Detector - Parse Claude structured outputs for tool calls
 *
 * Provides schema-based detection for skill invocations using Zod,
 * replacing regex-based patterns with structured output parsing.
 */

import { z } from 'zod';

/**
 * Valid action types for tool calls
 */
const ACTION_TYPES = ['invoke_skill', 'respond', 'request_info'] as const;

/**
 * Schema for validating tool call actions from Claude structured outputs
 */
export const ToolCallSchema = z.object({
  action: z.enum(ACTION_TYPES),
  skill: z.string().optional(),
  response: z.string().optional(),
});

/**
 * Type for validated tool call actions
 */
export type ToolCallAction = z.infer<typeof ToolCallSchema>;

/**
 * Type for valid action types
 */
export type ActionType = (typeof ACTION_TYPES)[number];

/**
 * Configuration options for structured detector
 * (for future API integration)
 */
export interface StructuredDetectorConfig {
  apiKey?: string;
  model?: string;
}

/**
 * Parse a structured response string and extract tool call actions
 *
 * Handles:
 * - JSON arrays of actions
 * - Single action objects
 * - Malformed JSON (returns empty array)
 * - Invalid actions are filtered out
 *
 * @param response - Raw response string (expected to be JSON)
 * @returns Array of validated ToolCallAction objects
 */
export function parseStructuredResponse(response: string): ToolCallAction[] {
  // Handle null/undefined/empty input
  if (!response || typeof response !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(response);

    // Handle single object (wrap in array)
    const items = Array.isArray(parsed) ? parsed : [parsed];

    // Validate and filter each item
    const validActions: ToolCallAction[] = [];
    for (const item of items) {
      const result = ToolCallSchema.safeParse(item);
      if (result.success) {
        validActions.push(result.data);
      }
    }

    return validActions;
  } catch {
    // Return empty array for malformed JSON
    return [];
  }
}

/**
 * Extract skill names from invoke_skill actions
 *
 * @param actions - Array of ToolCallAction objects
 * @returns Array of skill names that were invoked
 */
export function detectSkillInvocations(actions: ToolCallAction[]): string[] {
  return actions
    .filter(
      (action): action is ToolCallAction & { skill: string } =>
        action.action === 'invoke_skill' && typeof action.skill === 'string'
    )
    .map((action) => action.skill);
}

/**
 * Type guard to check if an unknown value is a valid ToolCallAction
 *
 * @param action - Unknown value to check
 * @returns True if the value is a valid ToolCallAction
 */
export function isValidToolCall(action: unknown): action is ToolCallAction {
  const result = ToolCallSchema.safeParse(action);
  return result.success;
}
