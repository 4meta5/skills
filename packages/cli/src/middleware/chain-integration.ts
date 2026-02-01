/**
 * Chain Integration for Middleware
 *
 * Bridges the Semantic Router and Chain packages.
 * When routing determines immediate/suggestion mode, automatically
 * activates the skill chain for tool-time enforcement.
 */

import type { RoutingResult } from '../router/types.js';
import {
  ChainActivator,
  createRouteDecision,
  UsageTracker,
  type ActivationResult,
  type RouteDecision,
  type SkillSpec,
  type ProfileSpec,
} from '@4meta5/chain';

/**
 * Options for chain-aware middleware
 */
export interface ChainIntegrationOptions {
  /** Working directory for chain state */
  cwd: string;

  /** Skills configuration */
  skills: SkillSpec[];

  /** Profiles configuration */
  profiles: ProfileSpec[];

  /** Enable usage tracking (default: true) */
  trackUsage?: boolean;

  /** Callback when chain is activated */
  onActivation?: (result: ActivationResult) => void;

  /** Callback when activation fails */
  onActivationError?: (error: Error) => void;
}

/**
 * ChainIntegration - Connects router output to chain activation
 *
 * Usage:
 * ```typescript
 * const integration = createChainIntegration({
 *   cwd: process.cwd(),
 *   skills: config.skills,
 *   profiles: config.profiles,
 * });
 *
 * // After routing
 * const routingResult = await router.route(prompt);
 * const activationResult = await integration.activateFromRouting(routingResult, prompt);
 * ```
 */
export function createChainIntegration(options: ChainIntegrationOptions) {
  const activator = new ChainActivator(
    options.cwd,
    options.skills,
    options.profiles
  );

  const tracker = options.trackUsage !== false
    ? new UsageTracker(options.cwd)
    : null;

  let lastActivation: ActivationResult | null = null;

  return {
    /**
     * Activate chain based on routing result
     *
     * Called when router returns immediate or suggestion mode.
     * Creates a RouteDecision and activates the chain.
     *
     * @param routingResult - Result from semantic router
     * @param query - Original user query
     * @returns ActivationResult or null if no activation needed
     */
    async activateFromRouting(
      routingResult: RoutingResult,
      query: string
    ): Promise<ActivationResult | null> {
      // Chat mode: no activation needed
      if (routingResult.mode === 'chat') {
        return null;
      }

      try {
        // Convert routing matches to profile candidates
        // Note: Router matches skills, Chain works with profiles
        // For now, we use the query for profile matching
        const requestId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const decision: RouteDecision = createRouteDecision(
          requestId,
          query,
          routingResult.mode,
          [], // Let chain do profile matching from query
          { routingTimeMs: routingResult.processingTimeMs }
        );

        const result = await activator.activate(decision);
        lastActivation = result;

        // Track decision event
        if (tracker && result.session_id) {
          await tracker.track({
            type: 'decision',
            session_id: result.session_id,
            request_id: requestId,
            mode: routingResult.mode,
            selected_profile: result.chain?.[0] ?? '',
            timestamp: new Date().toISOString(),
          });
        }

        // Track activation event
        if (result.activated && tracker && result.session_id) {
          await tracker.track({
            type: 'activation',
            session_id: result.session_id,
            profile_id: result.chain?.[0] ?? 'unknown',
            timestamp: new Date().toISOString(),
          });
          options.onActivation?.(result);
        }

        return result;
      } catch (error) {
        options.onActivationError?.(error instanceof Error ? error : new Error(String(error)));
        return null;
      }
    },

    /**
     * Activate chain with explicit profile selection
     *
     * Used when the profile is known (e.g., from user selection in suggestion mode)
     */
    async activateWithProfile(
      query: string,
      profileName: string,
      mode: 'immediate' | 'suggestion' = 'immediate'
    ): Promise<ActivationResult> {
      const requestId = `explicit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const decision = createRouteDecision(
        requestId,
        query,
        mode,
        [{ name: profileName, score: 1.0 }],
        { selectedProfile: profileName }
      );

      const result = await activator.activate(decision);
      lastActivation = result;

      if (result.activated) {
        options.onActivation?.(result);
      }

      return result;
    },

    /**
     * Get the last activation result
     */
    getLastActivation(): ActivationResult | null {
      return lastActivation;
    },

    /**
     * Check if a request_id has been processed
     */
    hasRequest(requestId: string): boolean {
      return activator.hasRequest(requestId);
    },

    /**
     * Get the underlying activator for advanced use cases
     */
    getActivator(): ChainActivator {
      return activator;
    },

    /**
     * Clear cached state (mainly for testing)
     */
    clearCache(): void {
      activator.clearCache();
      lastActivation = null;
    },

    /**
     * Track a block event (tool was denied)
     */
    async trackBlock(
      sessionId: string,
      intent: string,
      reason: string
    ): Promise<void> {
      if (tracker) {
        await tracker.track({
          type: 'block',
          session_id: sessionId,
          intent,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
    },

    /**
     * Track a retry event (user retried after block)
     */
    async trackRetry(
      sessionId: string,
      intent: string,
      attempt: number
    ): Promise<void> {
      if (tracker) {
        await tracker.track({
          type: 'retry',
          session_id: sessionId,
          intent,
          attempt,
          timestamp: new Date().toISOString(),
        });
      }
    },

    /**
     * Track a completion event (capability satisfied)
     */
    async trackCompletion(
      sessionId: string,
      capability: string,
      satisfiedBy: string
    ): Promise<void> {
      if (tracker) {
        await tracker.track({
          type: 'completion',
          session_id: sessionId,
          capability,
          satisfied_by: satisfiedBy,
          timestamp: new Date().toISOString(),
        });
      }
    },

    /**
     * Get the usage tracker (for analytics)
     */
    getTracker(): UsageTracker | null {
      return tracker;
    },
  };
}

/**
 * Type for the chain integration
 */
export type ChainIntegration = ReturnType<typeof createChainIntegration>;
