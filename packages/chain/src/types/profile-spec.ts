import { z } from 'zod';
import { EvidenceType } from './skill-spec.js';

/**
 * Strictness levels for profile enforcement
 */
export const Strictness = z.enum(['strict', 'advisory', 'permissive']);
export type Strictness = z.infer<typeof Strictness>;

/**
 * Completion requirement - what must exist before task is considered done
 */
export const CompletionRequirement = z.object({
  name: z.string().describe('Requirement identifier'),
  type: EvidenceType,
  pattern: z.string().optional().describe('Glob pattern for file_exists, regex for marker_found'),
  file: z.string().optional().describe('File to search for marker_found'),
  command: z.string().optional().describe('Command for command_success'),
  expected_exit_code: z.number().optional().default(0),
  description: z.string().optional().describe('Human-readable description'),
});
export type CompletionRequirement = z.infer<typeof CompletionRequirement>;

/**
 * Profile specification - defines a workflow for a type of task
 */
export const ProfileSpec = z.object({
  name: z.string().describe('Unique profile identifier'),
  description: z.string().optional().describe('Human-readable description'),
  match: z.array(z.string()).default([]).describe('Regex patterns to match user prompts'),
  capabilities_required: z.array(z.string()).describe('Ordered list of capabilities to satisfy'),
  strictness: Strictness.default('advisory'),
  completion_requirements: z.array(CompletionRequirement).default([]),
  priority: z.number().optional().default(0).describe('Higher priority profiles win ties'),
});
export type ProfileSpec = z.infer<typeof ProfileSpec>;

/**
 * Profiles configuration file schema
 */
export const ProfilesConfig = z.object({
  version: z.string().default('1.0'),
  profiles: z.array(ProfileSpec),
  default_profile: z.string().optional().describe('Profile to use when no patterns match'),
});
export type ProfilesConfig = z.infer<typeof ProfilesConfig>;
