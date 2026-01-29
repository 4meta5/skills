/**
 * Workflow State Machine Types
 *
 * Defines the state machine for skill activation workflow.
 * Based on "Iris" architecture from NEW_RESEARCH.md.
 */

import type { ActivationMode } from '../router/types.js';

/**
 * Workflow states
 */
export type WorkflowState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'reviewing'
  | 'error_recovery';

/**
 * Events that trigger state transitions
 */
export type WorkflowEvent =
  | { type: 'ROUTER_IMMEDIATE'; skills: string[] }
  | { type: 'ROUTER_SUGGESTION'; skills: string[] }
  | { type: 'ROUTER_CHAT' }
  | { type: 'PLAN_APPROVED' }
  | { type: 'PLAN_REJECTED' }
  | { type: 'TOOL_CALLED'; toolName: string }
  | { type: 'TOOL_SKIPPED' }
  | { type: 'REVIEW_PASSED' }
  | { type: 'REVIEW_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'MAX_RETRIES_EXCEEDED' }
  | { type: 'RESET' };

/**
 * Workflow context maintained during state transitions
 */
export interface WorkflowContext {
  /** Skills that must be activated */
  requiredSkills: string[];

  /** Number of retry attempts */
  attemptCount: number;

  /** Maximum allowed retries */
  maxRetries: number;

  /** Last error message if any */
  lastError?: string;

  /** How the workflow was activated */
  activationMode: ActivationMode;

  /** Tool calls made during execution */
  toolCalls: string[];

  /** Timestamp when workflow started */
  startedAt?: string;
}

/**
 * Default workflow context
 */
export const DEFAULT_WORKFLOW_CONTEXT: WorkflowContext = {
  requiredSkills: [],
  attemptCount: 0,
  maxRetries: 3,
  activationMode: 'chat',
  toolCalls: [],
};

/**
 * Result of workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  state: WorkflowState;
  context: WorkflowContext;
  error?: string;
}
