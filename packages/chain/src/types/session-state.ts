import { z } from 'zod';
import { Strictness } from './profile-spec.js';
import { EvidenceType } from './skill-spec.js';

/**
 * Evidence that a capability has been satisfied
 */
export const CapabilityEvidence = z.object({
  capability: z.string(),
  satisfied_at: z.string().describe('ISO timestamp'),
  satisfied_by: z.string().describe('Skill that provided this capability'),
  evidence_type: EvidenceType,
  evidence_path: z.string().optional().describe('File path or command that proved satisfaction'),
});
export type CapabilityEvidence = z.infer<typeof CapabilityEvidence>;

/**
 * Blocked intent with reason
 */
export const BlockedIntent = z.object({
  intent: z.string(),
  reason: z.string(),
  blocked_until: z.string().describe('Capability required to unblock'),
});
export type BlockedIntent = z.infer<typeof BlockedIntent>;

/**
 * Session state - persisted between hook invocations
 */
export const SessionState = z.object({
  session_id: z.string(),
  profile_id: z.string(),
  activated_at: z.string().describe('ISO timestamp'),
  chain: z.array(z.string()).describe('Ordered skill names'),
  capabilities_required: z.array(z.string()),
  capabilities_satisfied: z.array(CapabilityEvidence).default([]),
  current_skill_index: z.number().default(0),
  strictness: Strictness,
  blocked_intents: z.record(z.string(), z.string()).default({}).describe('intent → reason'),
});
export type SessionState = z.infer<typeof SessionState>;

/**
 * Resolution result from the resolver
 */
export const ResolutionResult = z.object({
  chain: z.array(z.string()),
  explanations: z.array(z.object({
    skill: z.string(),
    reason: z.string(),
    provides: z.array(z.string()),
    requires: z.array(z.string()),
  })),
  blocked_intents: z.record(z.string(), z.string()),
  warnings: z.array(z.string()).default([]),
});
export type ResolutionResult = z.infer<typeof ResolutionResult>;
