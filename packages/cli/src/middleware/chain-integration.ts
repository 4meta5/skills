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

        if (result.activated) {
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
  };
}

/**
 * Type for the chain integration
 */
export type ChainIntegration = ReturnType<typeof createChainIntegration>;
