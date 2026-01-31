/**
 * Corrective Loop Implementation
 *
 * Orchestrates the middleware enforcement with retry logic.
 * This is the integration point between router, middleware, and chain.
 */

import type { RoutingResult } from '../router/types.js';
import type { AgentMiddleware, MiddlewareResult } from './types.js';
import { createMiddleware } from './middleware.js';
import type { ChainIntegration } from './chain-integration.js';
import type { ActivationResult } from '@4meta5/chain';

/**
 * Options for the corrective loop
 */
export interface CorrectiveLoopOptions {
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** Threshold for including skills in required list (default: uses routing result's top score * 0.7) */
  suggestionThreshold?: number;

  /** Chain integration for automatic activation (optional) */
  chainIntegration?: ChainIntegration;

  /** Callback when response is rejected */
  onRejection?: (result: MiddlewareResult, attempt: number) => void;

  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: (result: MiddlewareResult) => void;

  /** Callback when response is accepted */
  onAccepted?: (result: MiddlewareResult) => void;

  /** Callback when chain is activated (optional) */
  onChainActivated?: (result: ActivationResult) => void;
}

/**
 * Result of a corrective loop cycle
 */
export interface CorrectiveLoopResult {
  /** Final acceptance status */
  accepted: boolean;

  /** Number of attempts made */
  attempts: number;

  /** Final middleware result */
  result: MiddlewareResult;

  /** Error message if max retries exceeded */
  error?: string;
}

/**
 * Create a corrective loop handler
 *
 * Usage:
 * ```typescript
 * const loop = createCorrectiveLoop({ maxRetries: 3 });
 *
 * // Initialize from routing result
 * loop.initializeFromRouting(routingResult);
 *
 * // Process each response
 * const result = await loop.processResponse(claudeResponse);
 * if (!result.accepted && loop.shouldRetry()) {
 *   // Retry with enhanced prompt
 *   const retryPrompt = loop.getRetryPrompt(originalPrompt);
 * }
 * ```
 */
export function createCorrectiveLoop(options: CorrectiveLoopOptions = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const suggestionThreshold = options.suggestionThreshold;
  const middleware = createMiddleware({ maxRetries });

  let initialized = false;
  let lastChainActivation: ActivationResult | null = null;

  return {
    /**
     * Initialize middleware state from routing result
     *
     * When chainIntegration is provided and mode is immediate/suggestion,
     * automatically activates the skill chain for tool-time enforcement.
     */
    async initializeFromRouting(routingResult: RoutingResult): Promise<ActivationResult | null> {
      // Activate chain if integration is provided and mode requires it
      if (options.chainIntegration && routingResult.mode !== 'chat') {
        const activation = await options.chainIntegration.activateFromRouting(
          routingResult,
          routingResult.query
        );
        lastChainActivation = activation;
        if (activation?.activated) {
          options.onChainActivated?.(activation);
        }
      }

      if (routingResult.mode === 'immediate') {
        // Extract skill names from high-confidence matches
        // Use provided threshold, or derive from top score (70% of top score as minimum)
        const topScore = routingResult.matches[0]?.score ?? 0;
        const threshold = suggestionThreshold ?? Math.min(0.70, topScore * 0.7);

        const requiredSkills = routingResult.matches
          .filter((m) => m.score >= threshold)
          .map((m) => m.skillName);

        middleware.setState({
          requiredTools: requiredSkills,
          mode: 'immediate',
          routingResult,
        });
      } else if (routingResult.mode === 'suggestion') {
        // Use half the suggestion threshold for suggestions
        const topScore = routingResult.matches[0]?.score ?? 0;
        const halfThreshold = suggestionThreshold
          ? suggestionThreshold / 2
          : Math.min(0.50, topScore * 0.5);

        const suggestedSkills = routingResult.matches
          .filter((m) => m.score >= halfThreshold)
          .map((m) => m.skillName);

        middleware.setState({
          requiredTools: suggestedSkills,
          mode: 'suggestion',
          routingResult,
        });
      } else {
        middleware.setState({
          requiredTools: [],
          mode: 'chat',
          routingResult,
        });
      }

      initialized = true;
      return lastChainActivation;
    },

    /**
     * Check if loop is initialized
     */
    isInitialized(): boolean {
      return initialized;
    },

    /**
     * Get the last chain activation result (if chain integration is enabled)
     */
    getChainActivation(): ActivationResult | null {
      return lastChainActivation;
    },

    /**
     * Process a response through the middleware
     */
    async processResponse(response: string): Promise<MiddlewareResult> {
      const result = await middleware.processResponse(response);

      if (result.accepted) {
        options.onAccepted?.(result);
      } else {
        const attempt = middleware.getState().retryCount + 1;
        options.onRejection?.(result, attempt);
      }

      return result;
    },

    /**
     * Check if we should retry after rejection
     */
    shouldRetry(): boolean {
      return middleware.shouldRetry();
    },

    /**
     * Increment retry counter and check if we've exceeded max
     * Returns true if we can continue, false if max exceeded
     */
    prepareRetry(): boolean {
      if (!middleware.shouldRetry()) {
        const state = middleware.getState();
        options.onMaxRetriesExceeded?.({
          accepted: false,
          response: '',
          foundTools: [],
          missingTools: state.requiredTools,
          reason: `Max retries (${maxRetries}) exceeded`,
        });
        return false;
      }

      middleware.incrementRetry();
      return true;
    },

    /**
     * Get enhanced prompt for retry
     */
    getRetryPrompt(originalPrompt: string, rejectionReason: string): string {
      const state = middleware.getState();
      const attempt = state.retryCount + 1;

      return `
[RETRY ${attempt}/${maxRetries}]
${rejectionReason}

You MUST call Skill() for these skills BEFORE proceeding:
${state.requiredTools.map((t) => `- Skill("${t}")`).join('\n')}

Do NOT ignore this requirement. Do NOT proceed with implementation without calling these skills first.

---
${originalPrompt}
`.trim();
    },

    /**
     * Get the underlying middleware state
     */
    getState() {
      return middleware.getState();
    },

    /**
     * Reset the loop for a new request
     */
    reset(): void {
      middleware.reset();
      initialized = false;
    },

    /**
     * Run a full corrective loop cycle
     *
     * This is a convenience method that handles the full retry flow.
     * In practice, the individual methods above give more control.
     */
    async runCycle(
      getResponse: () => Promise<string>,
      originalPrompt: string
    ): Promise<CorrectiveLoopResult> {
      let attempts = 0;
      let lastResult: MiddlewareResult;

      while (true) {
        attempts++;
        const response = await getResponse();
        lastResult = await this.processResponse(response);

        if (lastResult.accepted) {
          return {
            accepted: true,
            attempts,
            result: lastResult,
          };
        }

        if (!this.prepareRetry()) {
          return {
            accepted: false,
            attempts,
            result: lastResult,
            error: `Max retries (${maxRetries}) exceeded. Required skills not called: ${lastResult.missingTools.join(', ')}`,
          };
        }
      }
    },
  };
}
