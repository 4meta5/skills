/**
 * Middleware module exports
 *
 * This module provides the corrective loop for skill enforcement:
 * - detectToolCalls: Parse Claude responses for Skill() calls
 * - createMiddleware: Low-level middleware for request/response processing
 * - createCorrectiveLoop: High-level orchestration with retry logic
 */

export { createMiddleware, detectToolCalls } from './middleware.js';
export { createCorrectiveLoop } from './corrective-loop.js';
export type {
  AgentMiddleware,
  MiddlewareState,
  MiddlewareResult,
  MiddlewareOptions,
  DetectedToolCall,
  MiddlewareHooks,
} from './types.js';
export type {
  CorrectiveLoopOptions,
  CorrectiveLoopResult,
} from './corrective-loop.js';
