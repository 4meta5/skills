import { z } from 'zod';

/**
 * Activation mode from the router
 * - IMMEDIATE: Score > 0.85 - Force skill activation, skip LLM decision
 * - SUGGESTION: Score 0.70-0.85 - Suggest skill to LLM
 * - CHAT: Score < 0.70 - Normal conversation, no skill enforcement
 */
export const ActivationMode = z.enum(['immediate', 'suggestion', 'chat']);
export type ActivationMode = z.infer<typeof ActivationMode>;

/**
 * A matched profile from the router/matcher
 */
export const ProfileMatch = z.object({
  name: z.string().describe('Profile identifier'),
  score: z.number().describe('Match confidence 0-1'),
  matched_patterns: z.array(z.string()).default([]).describe('Keywords/patterns that matched'),
});
export type ProfileMatch = z.infer<typeof ProfileMatch>;

/**
 * RouteDecision - Payload from router/middleware to chain
 *
 * This is the integration point between the Semantic Router and the Chain.
 * When the router determines a prompt matches a workflow profile, it creates
 * a RouteDecision and passes it to chain.activate().
 *
 * Idempotency: If a RouteDecision with the same request_id is received,
 * the chain returns the existing session without modification.
 */
export const RouteDecision = z.object({
  /**
   * Unique identifier for this routing decision.
   * Used for idempotency - same request_id returns existing session.
   */
  request_id: z.string(),

  /**
   * Optional session identifier.
   * If provided, the chain uses this ID. Otherwise, generates one.
   */
  session_id: z.string().optional(),

  /**
   * The original user prompt/query that triggered routing.
   */
  query: z.string(),

  /**
   * Activation mode determined by the router.
   * - immediate: High confidence, activate now
   * - suggestion: Medium confidence, suggest to LLM
   * - chat: Low confidence, no activation
   */
  mode: ActivationMode,

  /**
   * Matched profiles ordered by score (highest first).
   * Empty for chat mode.
   */
  candidates: z.array(ProfileMatch).default([]),

  /**
   * The profile to activate.
   * For immediate mode, this is set by the router.
   * For suggestion mode, may be set after user confirmation.
   */
  selected_profile: z.string().optional(),

  /**
   * Time spent in routing (for metrics).
   */
  routing_time_ms: z.number().optional(),

  /**
   * Timestamp when the decision was made.
   */
  decided_at: z.string().optional().describe('ISO timestamp'),
});
export type RouteDecision = z.infer<typeof RouteDecision>;

/**
 * Result of activating a chain from a RouteDecision
 */
export const ActivationResult = z.object({
  /**
   * Whether activation was successful
   */
  activated: z.boolean(),

  /**
   * The session ID (new or existing)
   */
  session_id: z.string(),

  /**
   * Whether this was a new activation or existing session
   */
  is_new: z.boolean(),

  /**
   * The profile that was activated
   */
  profile_id: z.string().optional(),

  /**
   * The skill chain that was resolved
   */
  chain: z.array(z.string()).default([]),

  /**
   * Intents that are currently blocked
   */
  blocked_intents: z.record(z.string(), z.string()).default({}),

  /**
   * If activation failed, the reason
   */
  error: z.string().optional(),

  /**
   * If request_id was seen before, indicates idempotent return
   */
  idempotent: z.boolean().default(false),
});
export type ActivationResult = z.infer<typeof ActivationResult>;
