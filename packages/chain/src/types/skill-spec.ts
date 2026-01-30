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
 * Tool intents that can be gated by capabilities
 */
export const ToolIntent = z.enum(['write', 'commit', 'push', 'deploy', 'delete']);
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
