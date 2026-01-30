/**
 * Sandbox Policy Types
 *
 * Types for TDD workflow sandbox enforcement.
 * Different from workflow/types.ts WorkflowState - these are TDD-specific phases.
 */

/**
 * TDD workflow phases for sandbox enforcement
 */
export type TDDPhase = 'BLOCKED' | 'RED' | 'GREEN' | 'COMPLETE';

/**
 * Valid TDD phases as a constant array for runtime validation
 */
export const VALID_TDD_PHASES: readonly TDDPhase[] = ['BLOCKED', 'RED', 'GREEN', 'COMPLETE'];

/**
 * Sandbox policy defining allowed/denied commands and file writes
 */
export interface SandboxPolicy {
  name: string;
  allowCommands: string[];
  denyCommands: string[];
  allowWrite: string[];  // glob patterns
  denyWrite: string[];   // glob patterns
}

/**
 * Sandbox configuration with policies for each TDD phase
 */
export interface SandboxConfig {
  state: TDDPhase;
  profiles: Partial<Record<TDDPhase, SandboxPolicy>>;
}

/**
 * Type guard to validate if a string is a valid TDD phase
 */
export function isValidTDDPhase(phase: string): phase is TDDPhase {
  return VALID_TDD_PHASES.includes(phase as TDDPhase);
}

/**
 * Helper to check if a value is a non-null object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Helper to check if a value is an array of strings
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * Type guard to validate if an unknown value is a valid SandboxPolicy
 */
export function isValidSandboxPolicy(policy: unknown): policy is SandboxPolicy {
  if (!isObject(policy)) {
    return false;
  }

  // Check required string field
  if (typeof policy.name !== 'string') {
    return false;
  }

  // Check required array fields
  if (!isStringArray(policy.allowCommands)) {
    return false;
  }

  if (!isStringArray(policy.denyCommands)) {
    return false;
  }

  if (!isStringArray(policy.allowWrite)) {
    return false;
  }

  if (!isStringArray(policy.denyWrite)) {
    return false;
  }

  return true;
}

/**
 * Validate if a string is a valid glob pattern
 *
 * A valid glob pattern:
 * - Is not empty or whitespace-only
 * - Does not contain null bytes
 */
export function isValidGlobPattern(pattern: string): boolean {
  // Empty or whitespace-only patterns are invalid
  if (!pattern || pattern.trim().length === 0) {
    return false;
  }

  // Patterns with null bytes are invalid (potential security issue)
  if (pattern.includes('\0')) {
    return false;
  }

  return true;
}
