import { z } from 'zod';

/**
 * Risk levels for skills - affects ordering in resolution
 */
export const RiskLevel = z.enum(['low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevel>;

/**
 * Cost levels for skills - affects ordering in resolution
 */
export const CostLevel = z.enum(['low', 'medium', 'high']);
export type CostLevel = z.infer<typeof CostLevel>;

/**
 * Enforcement tiers for skills
 *
 * - hard: Block all denied intents until capabilities satisfied (default)
 * - soft: Block high-impact intents, allow low-impact ones until acknowledged
 * - none: Guidance only, no blocking (tracking still active)
 */
export const EnforcementTier = z.enum(['hard', 'soft', 'none']);
export type EnforcementTier = z.infer<typeof EnforcementTier>;

/**
 * Intents classified as high-impact (blocked in soft tier)
 */
export const HIGH_IMPACT_INTENTS = [
  'write_impl',
  'commit',
  'push',
  'deploy',
  'delete',
] as const;

/**
 * Intents classified as low-impact (allowed in soft tier)
 */
export const LOW_IMPACT_INTENTS = [
  'write_test',
  'write_docs',
  'write_config',
] as const;

/**
 * Tool intents that can be gated by capabilities
 *
 * Path-aware intents (write_test, write_impl, etc.) subdivide the base
 * intent for fine-grained blocking. The classifier uses language-agnostic
 * patterns to determine file category.
 *
 * Intent hierarchy:
 *   write → write_test, write_impl, write_docs, write_config
 *   edit  → edit_test, edit_impl, edit_docs, edit_config
 */
export const ToolIntent = z.enum([
  // Base intents
  'write',
  'commit',
  'push',
  'deploy',
  'delete',
  // Path-aware write intents
  'write_test',
  'write_impl',
  'write_docs',
  'write_config',
  // Path-aware edit intents
  'edit_test',
  'edit_impl',
  'edit_docs',
  'edit_config',
]);
export type ToolIntent = z.infer<typeof ToolIntent>;

/**
 * Evidence types for artifact verification
 */
export const EvidenceType = z.enum(['file_exists', 'marker_found', 'command_success', 'manual']);
export type EvidenceType = z.infer<typeof EvidenceType>;

/**
 * Artifact specification - what a skill produces
 */
export const ArtifactSpec = z.object({
  name: z.string().describe('Artifact identifier'),
  type: EvidenceType,
  pattern: z.string().optional().describe('Glob pattern for file_exists, regex for marker_found'),
  file: z.string().optional().describe('File to search for marker_found'),
  command: z.string().optional().describe('Command for command_success'),
  expected_exit_code: z.number().optional().default(0),
});
export type ArtifactSpec = z.infer<typeof ArtifactSpec>;

/**
 * Tool policy - defines which intents are blocked until capabilities are met
 */
export const ToolPolicyRule = z.object({
  until: z.string().describe('Capability that must be satisfied'),
  reason: z.string().describe('Human-readable explanation'),
});
export type ToolPolicyRule = z.infer<typeof ToolPolicyRule>;

export const ToolPolicy = z.object({
  deny_until: z.record(z.string(), ToolPolicyRule).optional(),
});
export type ToolPolicy = z.infer<typeof ToolPolicy>;

/**
 * Complete skill specification
 */
export const SkillSpec = z.object({
  name: z.string().describe('Unique skill identifier'),
  skill_path: z.string().describe('Path to SKILL.md relative to .claude/skills/'),
  description: z.string().optional().describe('Human-readable description'),
  provides: z.array(z.string()).default([]).describe('Capabilities this skill provides'),
  requires: z.array(z.string()).default([]).describe('Capabilities required before this skill'),
  conflicts: z.array(z.string()).default([]).describe('Skills that cannot coexist in same chain'),
  risk: RiskLevel.default('medium'),
  cost: CostLevel.default('medium'),
  tier: EnforcementTier.default('hard').describe('Enforcement tier: hard, soft, or none'),
  artifacts: z.array(ArtifactSpec).default([]).describe('Evidence this skill produces'),
  tool_policy: ToolPolicy.optional(),
});
export type SkillSpec = z.infer<typeof SkillSpec>;

/**
 * Skills configuration file schema
 */
export const SkillsConfig = z.object({
  version: z.string().default('1.0'),
  skills: z.array(SkillSpec),
});
export type SkillsConfig = z.infer<typeof SkillsConfig>;
