/**
 * Chain Activator
 *
 * Receives RouteDecisions from the router/middleware and activates
 * the appropriate skill chain. Provides idempotency via request_id tracking.
 */

import type {
  RouteDecision,
  ActivationResult,
  SessionState,
  SkillSpec,
  ProfileSpec,
} from '../types/index.js';
import { StateManager } from '../session/index.js';
import { resolve } from '../resolver/resolver.js';
import { matchProfileToPrompt } from '../resolver/profile-matcher.js';

/**
 * In-memory cache for request_id → session_id mapping
 * Used for idempotency within the same process lifetime
 */
const requestCache = new Map<string, string>();

/**
 * Options for the ChainActivator
 */
export interface ChainActivatorOptions {
  /**
   * Maximum number of request_ids to cache (LRU eviction)
   * Default: 1000
   */
  maxCacheSize?: number;
}

/**
 * ChainActivator - Activates skill chains from RouteDecisions
 *
 * This is the integration point between the router/middleware and the chain.
 * When a prompt matches a workflow profile, the middleware creates a
 * RouteDecision and calls activate() to start enforcement.
 */
export class ChainActivator {
  private stateManager: StateManager;
  private skills: SkillSpec[];
  private profiles: ProfileSpec[];
  private maxCacheSize: number;

  constructor(
    cwd: string,
    skills: SkillSpec[],
    profiles: ProfileSpec[],
    options: ChainActivatorOptions = {}
  ) {
    this.stateManager = new StateManager(cwd);
    this.skills = skills;
    this.profiles = profiles;
    this.maxCacheSize = options.maxCacheSize ?? 1000;
  }

  /**
   * Activate a skill chain based on a RouteDecision
   *
   * Idempotency: If the same request_id is seen again, returns the
   * existing session without modification.
   *
   * @param decision - The routing decision from router/middleware
   * @returns ActivationResult with session info and blocked intents
   */
  async activate(decision: RouteDecision): Promise<ActivationResult> {
    // Check for idempotent request
    const cachedSessionId = requestCache.get(decision.request_id);
    if (cachedSessionId) {
      const existingState = await this.stateManager.loadCurrent();
      if (existingState && existingState.session_id === cachedSessionId) {
        return {
          activated: true,
          session_id: cachedSessionId,
          is_new: false,
          idempotent: true,
          profile_id: existingState.profile_id,
          chain: existingState.chain,
          blocked_intents: existingState.blocked_intents,
        };
      }
    }

    // For chat mode, no activation needed
    if (decision.mode === 'chat') {
      return {
        activated: false,
        session_id: '',
        is_new: false,
        error: 'Chat mode does not activate skill chains',
      };
    }

    // Determine the profile to activate
    let profileId = decision.selected_profile;

    // If no profile selected, try to match from candidates or query
    if (!profileId) {
      if (decision.candidates.length > 0) {
        // Use the top candidate
        profileId = decision.candidates[0].name;
      } else {
        // Try to match from query
        const matched = matchProfileToPrompt(decision.query, this.profiles);
        if (matched) {
          profileId = matched.name;
        }
      }
    }

    if (!profileId) {
      return {
        activated: false,
        session_id: '',
        is_new: false,
        error: 'No matching profile found for activation',
      };
    }

    // Find the profile
    const profile = this.profiles.find((p) => p.name === profileId);
    if (!profile) {
      return {
        activated: false,
        session_id: '',
        is_new: false,
        error: `Profile "${profileId}" not found`,
      };
    }

    // Resolve skill chain
    const validSkills = this.skills.filter(
      (s) => Array.isArray(s.provides) && s.provides.length > 0
    );

    const resolution =
      profile.capabilities_required.length > 0 && validSkills.length > 0
        ? resolve(profile, validSkills)
        : { chain: [], blocked_intents: {}, explanations: [], warnings: [] };

    // Generate or use provided session_id
    const sessionId = decision.session_id ?? `route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create session state
    const sessionState: SessionState = {
      session_id: sessionId,
      profile_id: profileId,
      activated_at: decision.decided_at ?? new Date().toISOString(),
      chain: resolution.chain,
      capabilities_required: profile.capabilities_required,
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: profile.strictness,
      blocked_intents: resolution.blocked_intents,
    };

    // Persist session
    await this.stateManager.create(sessionState);

    // Cache request_id for idempotency
    this.cacheRequest(decision.request_id, sessionId);

    return {
      activated: true,
      session_id: sessionId,
      is_new: true,
      idempotent: false,
      profile_id: profileId,
      chain: resolution.chain,
      blocked_intents: resolution.blocked_intents,
    };
  }

  /**
   * Check if a request_id has already been processed
   */
  hasRequest(requestId: string): boolean {
    return requestCache.has(requestId);
  }

  /**
   * Get the session_id for a previously processed request_id
   */
  getSessionForRequest(requestId: string): string | undefined {
    return requestCache.get(requestId);
  }

  /**
   * Clear the request cache (mainly for testing)
   */
  clearCache(): void {
    requestCache.clear();
  }

  /**
   * Cache a request_id → session_id mapping with LRU eviction
   */
  private cacheRequest(requestId: string, sessionId: string): void {
    // Simple LRU: if at capacity, delete oldest (first) entry
    if (requestCache.size >= this.maxCacheSize) {
      const firstKey = requestCache.keys().next().value;
      if (firstKey) {
        requestCache.delete(firstKey);
      }
    }
    requestCache.set(requestId, sessionId);
  }
}

/**
 * Create a RouteDecision from router output
 *
 * Helper function to convert router's RoutingResult to a RouteDecision
 * that can be passed to ChainActivator.activate()
 */
export function createRouteDecision(
  requestId: string,
  query: string,
  mode: 'immediate' | 'suggestion' | 'chat',
  candidates: Array<{ name: string; score: number; matched_patterns?: string[] }> = [],
  options: {
    sessionId?: string;
    selectedProfile?: string;
    routingTimeMs?: number;
  } = {}
): RouteDecision {
  return {
    request_id: requestId,
    session_id: options.sessionId,
    query,
    mode,
    candidates: candidates.map((c) => ({
      name: c.name,
      score: c.score,
      matched_patterns: c.matched_patterns ?? [],
    })),
    selected_profile: options.selectedProfile ?? (candidates.length > 0 ? candidates[0].name : undefined),
    routing_time_ms: options.routingTimeMs,
    decided_at: new Date().toISOString(),
  };
}
