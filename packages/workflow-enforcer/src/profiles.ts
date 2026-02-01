/**
 * Pre-built workflow profiles
 */

import type { EnforcerProfile } from './types.js';

/**
 * TDD (Test-Driven Development) Profile
 *
 * Enforces RED → GREEN → REFACTOR workflow:
 * 1. RED: Write a failing test first
 * 2. GREEN: Write minimum code to pass
 * 3. REFACTOR: Clean up while keeping tests green
 */
export const TDD_PROFILE: EnforcerProfile = {
  name: 'tdd',
  description: 'Test-Driven Development: RED → GREEN → REFACTOR',
  strictness: 'strict',
  initialPhase: 'red',
  matchPatterns: [
    'tdd',
    'test.?driven',
    'red.?green.?refactor',
    'write.?tests?.?first',
  ],
  phases: {
    red: {
      name: 'red',
      description: 'Write a failing test',
      provides: ['failing_test'],
      requires: [],
      blockedIntents: ['write_impl', 'commit', 'push', 'deploy'],
      allowedIntents: ['write_test', 'read', 'run', 'write_config'],
    },
    green: {
      name: 'green',
      description: 'Write minimum code to pass the test',
      provides: ['passing_test'],
      requires: ['failing_test'],
      blockedIntents: ['commit', 'push', 'deploy'],
      allowedIntents: ['write_impl', 'edit_impl', 'run', 'read'],
    },
    refactor: {
      name: 'refactor',
      description: 'Clean up code while keeping tests green',
      provides: ['refactored'],
      requires: ['passing_test'],
      blockedIntents: [],
      allowedIntents: ['write_impl', 'edit_impl', 'write_test', 'edit_test', 'commit', 'run', 'read'],
    },
  },
};

/**
 * Code Review Profile
 *
 * Enforces review before merge workflow:
 * 1. DRAFT: Work in progress, not ready for review
 * 2. REVIEW: Ready for review, no new code
 * 3. APPROVED: Changes approved, ready to merge
 */
export const CODE_REVIEW_PROFILE: EnforcerProfile = {
  name: 'code-review',
  description: 'Code Review workflow: DRAFT → REVIEW → APPROVED',
  strictness: 'advisory',
  initialPhase: 'draft',
  matchPatterns: [
    'code.?review',
    'review.?before.?merge',
    'pr.?review',
  ],
  phases: {
    draft: {
      name: 'draft',
      description: 'Work in progress, not ready for review',
      provides: ['code_complete'],
      requires: [],
      blockedIntents: ['push', 'deploy'],
      allowedIntents: ['write', 'write_impl', 'write_test', 'edit', 'edit_impl', 'edit_test', 'commit', 'run', 'read'],
    },
    review: {
      name: 'review',
      description: 'Ready for review, avoid new code',
      provides: ['review_complete'],
      requires: ['code_complete'],
      blockedIntents: ['write_impl', 'deploy'],
      allowedIntents: ['read', 'run', 'write_docs', 'edit_docs', 'push'],
    },
    approved: {
      name: 'approved',
      description: 'Changes approved, ready to merge',
      provides: ['merge_ready'],
      requires: ['review_complete'],
      blockedIntents: [],
      allowedIntents: ['push', 'deploy', 'read', 'run'],
    },
  },
};

/**
 * Documentation First Profile
 *
 * Enforces documentation before implementation:
 * 1. SPEC: Write specification/docs first
 * 2. IMPLEMENT: Implement according to spec
 * 3. VERIFY: Verify implementation matches spec
 */
export const DOCS_FIRST_PROFILE: EnforcerProfile = {
  name: 'docs-first',
  description: 'Documentation First: SPEC → IMPLEMENT → VERIFY',
  strictness: 'advisory',
  initialPhase: 'spec',
  matchPatterns: [
    'docs?.?first',
    'spec.?first',
    'design.?first',
    'documentation.?driven',
  ],
  phases: {
    spec: {
      name: 'spec',
      description: 'Write specification and documentation',
      provides: ['spec_complete'],
      requires: [],
      blockedIntents: ['write_impl', 'edit_impl'],
      allowedIntents: ['write_docs', 'edit_docs', 'read', 'run', 'write_config'],
    },
    implement: {
      name: 'implement',
      description: 'Implement according to specification',
      provides: ['impl_complete'],
      requires: ['spec_complete'],
      blockedIntents: ['deploy'],
      allowedIntents: ['write_impl', 'edit_impl', 'write_test', 'edit_test', 'run', 'read', 'commit'],
    },
    verify: {
      name: 'verify',
      description: 'Verify implementation matches specification',
      provides: ['verified'],
      requires: ['impl_complete'],
      blockedIntents: [],
      allowedIntents: ['run', 'read', 'write_docs', 'edit_docs', 'commit', 'push', 'deploy'],
    },
  },
};

/**
 * No Workarounds Profile
 *
 * Prevents manual workarounds when building tools.
 * If the tool fails, you must fix the tool.
 */
export const NO_WORKAROUNDS_PROFILE: EnforcerProfile = {
  name: 'no-workarounds',
  description: 'Fix the tool, do not work around failures',
  strictness: 'strict',
  initialPhase: 'building',
  matchPatterns: [
    'no.?workarounds?',
    'fix.?the.?tool',
    'build.?tool',
    'cli.?development',
  ],
  phases: {
    building: {
      name: 'building',
      description: 'Building the tool - all actions allowed',
      provides: ['tool_ready'],
      requires: [],
      blockedIntents: [],
      allowedIntents: ['write', 'write_impl', 'write_test', 'edit', 'run', 'read', 'commit'],
    },
    testing: {
      name: 'testing',
      description: 'Testing the tool - manual workarounds blocked',
      provides: ['tool_verified'],
      requires: ['tool_ready'],
      // Block manual file operations that would work around tool failures
      blockedIntents: ['write', 'edit'],
      allowedIntents: ['run', 'read', 'write_test', 'edit_test'],
    },
    verified: {
      name: 'verified',
      description: 'Tool verified working',
      provides: ['verified'],
      requires: ['tool_verified'],
      blockedIntents: [],
      allowedIntents: ['commit', 'push', 'read', 'run'],
    },
  },
};

/**
 * All pre-built profiles
 */
export const BUILTIN_PROFILES: Record<string, EnforcerProfile> = {
  tdd: TDD_PROFILE,
  'code-review': CODE_REVIEW_PROFILE,
  'docs-first': DOCS_FIRST_PROFILE,
  'no-workarounds': NO_WORKAROUNDS_PROFILE,
};

/**
 * Get a profile by name
 */
export function getProfile(name: string): EnforcerProfile | undefined {
  return BUILTIN_PROFILES[name];
}

/**
 * List all available profile names
 */
export function listProfiles(): string[] {
  return Object.keys(BUILTIN_PROFILES);
}

/**
 * Match a prompt against profile patterns
 * Returns the best matching profile or undefined
 */
export function matchProfile(prompt: string): EnforcerProfile | undefined {
  const normalized = prompt.toLowerCase();

  for (const profile of Object.values(BUILTIN_PROFILES)) {
    if (!profile.matchPatterns) continue;

    for (const pattern of profile.matchPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(normalized)) {
        return profile;
      }
    }
  }

  return undefined;
}
