import { describe, it, expect } from 'vitest';
import { matchProfileToPrompt, calculateMatchScore } from './profile-matcher.js';
import type { ProfileSpec } from '../types/profile-spec.js';

describe('profile-matcher', () => {
  const mockProfiles: ProfileSpec[] = [
    {
      name: 'bug-fix',
      description: 'Workflow for fixing bugs',
      match: ['fix', 'bug', 'broken', 'failing test', 'error', 'issue', 'regression'],
      capabilities_required: ['test_written', 'test_green'],
      strictness: 'strict',
      priority: 10,
      completion_requirements: [],
    },
    {
      name: 'new-feature',
      description: 'Workflow for implementing new features',
      match: ['add', 'implement', 'create', 'build', 'new feature', 'feature'],
      capabilities_required: ['test_written', 'test_green'],
      strictness: 'strict',
      priority: 5,
      completion_requirements: [],
    },
    {
      name: 'docs-only',
      description: 'Documentation updates only',
      match: ['document', 'readme', 'update docs', 'write documentation', 'PLAN\\.md'],
      capabilities_required: ['docs_updated'],
      strictness: 'advisory',
      priority: 3,
      completion_requirements: [],
    },
    {
      name: 'permissive',
      description: 'Default permissive workflow',
      match: [],
      capabilities_required: [],
      strictness: 'permissive',
      priority: 0,
      completion_requirements: [],
    },
  ];

  describe('calculateMatchScore', () => {
    it('should return 0 for no matches', () => {
      const profile = mockProfiles.find(p => p.name === 'bug-fix')!;
      const score = calculateMatchScore('hello world', profile);
      expect(score).toBe(0);
    });

    it('should return positive score for single keyword match', () => {
      const profile = mockProfiles.find(p => p.name === 'bug-fix')!;
      const score = calculateMatchScore('fix the login button', profile);
      expect(score).toBeGreaterThan(0);
    });

    it('should return higher score for multiple keyword matches', () => {
      const profile = mockProfiles.find(p => p.name === 'bug-fix')!;
      const singleMatch = calculateMatchScore('fix the button', profile);
      const multiMatch = calculateMatchScore('fix the bug in login', profile);
      expect(multiMatch).toBeGreaterThan(singleMatch);
    });

    it('should be case-insensitive', () => {
      const profile = mockProfiles.find(p => p.name === 'bug-fix')!;
      const lower = calculateMatchScore('fix the bug', profile);
      const upper = calculateMatchScore('FIX THE BUG', profile);
      expect(lower).toBe(upper);
    });

    it('should handle regex patterns', () => {
      const profile = mockProfiles.find(p => p.name === 'docs-only')!;
      const score = calculateMatchScore('update PLAN.md', profile);
      expect(score).toBeGreaterThan(0);
    });

    it('should handle multi-word patterns', () => {
      const profile = mockProfiles.find(p => p.name === 'bug-fix')!;
      const score = calculateMatchScore('the failing test needs attention', profile);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('matchProfileToPrompt', () => {
    it('should return null for empty prompt', () => {
      const result = matchProfileToPrompt('', mockProfiles);
      expect(result).toBeNull();
    });

    it('should return null when only permissive profile matches', () => {
      const result = matchProfileToPrompt('hello world', mockProfiles);
      expect(result).toBeNull();
    });

    it('should return bug-fix profile for bug-related prompts', () => {
      const result = matchProfileToPrompt('fix the login error', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('bug-fix');
    });

    it('should return new-feature profile for feature prompts', () => {
      const result = matchProfileToPrompt('add a new search feature', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('new-feature');
    });

    it('should return docs-only profile for documentation prompts', () => {
      const result = matchProfileToPrompt('update the readme', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('docs-only');
    });

    it('should prefer higher priority profiles on tie', () => {
      // "add fix" matches both new-feature (add) and bug-fix (fix)
      // bug-fix has priority 10, new-feature has priority 5
      const result = matchProfileToPrompt('add a fix for the button', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('bug-fix');
    });

    it('should prefer higher score over priority when score difference is significant', () => {
      // "fix bug error regression" heavily matches bug-fix
      const result = matchProfileToPrompt('fix bug error regression', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('bug-fix');
    });

    it('should handle empty profiles array', () => {
      const result = matchProfileToPrompt('fix the bug', []);
      expect(result).toBeNull();
    });

    it('should return matched profile with score metadata', () => {
      const result = matchProfileToPrompt('fix the bug', mockProfiles);
      expect(result).not.toBeNull();
      expect(result!.matchScore).toBeGreaterThan(0);
      expect(result!.matchedPatterns).toContain('fix');
    });
  });
});
