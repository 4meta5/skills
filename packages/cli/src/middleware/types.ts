/**
 * Types for the Agent Middleware
 *
 * Implements the corrective loop for skill enforcement:
 * - Tracks required tools based on routing result
 * - Detects tool calls in Claude's response
 * - Rejects non-compliant responses and triggers retry
 */

import type { ActivationMode, RoutingResult, SkillMatch } from '../router/types.js';

/**
 * State maintained by the middleware across request/response cycle
 */
export interface MiddlewareState {
  /** Skills that MUST be called (from immediate mode) */
  requiredTools: string[];

  /** Activation mode from router */
  mode: ActivationMode;

  /** Current retry attempt (0 = first attempt) */
  retryCount: number;

  /** Maximum retries before surfacing error */
  maxRetries: number;

  /** Routing result that triggered this state */
  routingResult?: RoutingResult;
}

/**
 * Result of processing a response through middleware
 */
export interface MiddlewareResult {
  /** Whether the response was accepted (tool requirements met) */
  accepted: boolean;

  /** The response (modified with rejection message if not accepted) */
  response: string;

  /** Reason for rejection (if not accepted) */
  reason?: string;

  /** Tools that were found in the response */
  foundTools: string[];

  /** Tools that were required but missing */
  missingTools: string[];
}

/**
 * Options for creating middleware
 */
export interface MiddlewareOptions {
  /** Maximum retries before giving up (default: 3) */
  maxRetries?: number;

  /** Custom rejection message template */
  rejectionTemplate?: string;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Default middleware options
 */
export const DEFAULT_MIDDLEWARE_OPTIONS: Required<MiddlewareOptions> = {
  maxRetries: 3,
  rejectionTemplate: 'COMPLIANCE ERROR: You MUST call Skill({tools}). Attempt {attempt}/{max}.',
  verbose: false,
};

/**
 * Tool call detected in response
 */
export interface DetectedToolCall {
  /** Tool name (e.g., 'Skill') */
  tool: string;

  /** Arguments (e.g., skill name) */
  args: string[];

  /** Raw matched text */
  raw: string;
}

/**
 * Hook signatures for middleware
 */
export interface MiddlewareHooks {
  /**
   * Called before request is sent to Claude
   * Can modify the prompt to inject requirements
   */
  'request:before': (prompt: string, state: MiddlewareState) => Promise<string>;

  /**
   * Called after response is received from Claude
   * Returns whether response is accepted or should be retried
   */
  'response:after': (response: string, state: MiddlewareState) => Promise<MiddlewareResult>;
}

/**
 * Middleware instance interface
 */
export interface AgentMiddleware {
  /**
   * Set the current middleware state based on routing result
   */
  setState(state: Partial<MiddlewareState>): void;

  /**
   * Get current middleware state
   */
  getState(): MiddlewareState;

  /**
   * Reset state to defaults
   */
  reset(): void;

  /**
   * Process prompt before sending to Claude
   */
  processRequest(prompt: string): Promise<string>;

  /**
   * Process response from Claude
   * Returns result with acceptance status and possibly modified response
   */
  processResponse(response: string): Promise<MiddlewareResult>;

  /**
   * Check if we should retry after rejection
   */
  shouldRetry(): boolean;

  /**
   * Increment retry counter
   */
  incrementRetry(): void;
}
