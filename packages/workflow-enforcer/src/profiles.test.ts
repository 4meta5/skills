import { describe, it, expect } from 'vitest';
import {
  TDD_PROFILE,
  CODE_REVIEW_PROFILE,
  DOCS_FIRST_PROFILE,
  NO_WORKAROUNDS_PROFILE,
  BUILTIN_PROFILES,
  getProfile,
  listProfiles,
  matchProfile,
} from './profiles.js';

describe('profiles', () => {
  describe('TDD_PROFILE', () => {
    it('has correct structure', () => {
      expect(TDD_PROFILE.name).toBe('tdd');
      expect(TDD_PROFILE.strictness).toBe('strict');
      expect(TDD_PROFILE.initialPhase).toBe('red');
      expect(Object.keys(TDD_PROFILE.phases)).toEqual(['red', 'green', 'refactor']);
    });

    it('has RED phase that blocks write_impl', () => {
      const red = TDD_PROFILE.phases.red;
      expect(red.blockedIntents).toContain('write_impl');
      expect(red.allowedIntents).toContain('write_test');
    });

    it('has GREEN phase that allows write_impl', () => {
      const green = TDD_PROFILE.phases.green;
      expect(green.allowedIntents).toContain('write_impl');
      expect(green.blockedIntents).toContain('commit');
    });

    it('has REFACTOR phase that allows commit', () => {
      const refactor = TDD_PROFILE.phases.refactor;
      expect(refactor.allowedIntents).toContain('commit');
      expect(refactor.blockedIntents).toHaveLength(0);
    });

    it('has match patterns', () => {
      expect(TDD_PROFILE.matchPatterns).toBeDefined();
      expect(TDD_PROFILE.matchPatterns).toContain('tdd');
    });
  });

  describe('CODE_REVIEW_PROFILE', () => {
    it('has correct structure', () => {
      expect(CODE_REVIEW_PROFILE.name).toBe('code-review');
      expect(CODE_REVIEW_PROFILE.strictness).toBe('advisory');
      expect(CODE_REVIEW_PROFILE.initialPhase).toBe('draft');
    });

    it('has three phases', () => {
      expect(Object.keys(CODE_REVIEW_PROFILE.phases)).toEqual(['draft', 'review', 'approved']);
    });
  });

  describe('DOCS_FIRST_PROFILE', () => {
    it('has correct structure', () => {
      expect(DOCS_FIRST_PROFILE.name).toBe('docs-first');
      expect(DOCS_FIRST_PROFILE.initialPhase).toBe('spec');
    });

    it('blocks write_impl in spec phase', () => {
      expect(DOCS_FIRST_PROFILE.phases.spec.blockedIntents).toContain('write_impl');
    });
  });

  describe('NO_WORKAROUNDS_PROFILE', () => {
    it('has correct structure', () => {
      expect(NO_WORKAROUNDS_PROFILE.name).toBe('no-workarounds');
      expect(NO_WORKAROUNDS_PROFILE.strictness).toBe('strict');
    });
  });

  describe('BUILTIN_PROFILES', () => {
    it('contains all profiles', () => {
      expect(BUILTIN_PROFILES.tdd).toBe(TDD_PROFILE);
      expect(BUILTIN_PROFILES['code-review']).toBe(CODE_REVIEW_PROFILE);
      expect(BUILTIN_PROFILES['docs-first']).toBe(DOCS_FIRST_PROFILE);
      expect(BUILTIN_PROFILES['no-workarounds']).toBe(NO_WORKAROUNDS_PROFILE);
    });
  });

  describe('getProfile', () => {
    it('returns profile by name', () => {
      expect(getProfile('tdd')).toBe(TDD_PROFILE);
      expect(getProfile('code-review')).toBe(CODE_REVIEW_PROFILE);
    });

    it('returns undefined for unknown profile', () => {
      expect(getProfile('unknown')).toBeUndefined();
    });
  });

  describe('listProfiles', () => {
    it('returns all profile names', () => {
      const names = listProfiles();
      expect(names).toContain('tdd');
      expect(names).toContain('code-review');
      expect(names).toContain('docs-first');
      expect(names).toContain('no-workarounds');
    });
  });

  describe('matchProfile', () => {
    it('matches TDD prompts', () => {
      expect(matchProfile('use tdd workflow')).toBe(TDD_PROFILE);
      expect(matchProfile('test-driven development')).toBe(TDD_PROFILE);
      expect(matchProfile('red green refactor')).toBe(TDD_PROFILE);
      expect(matchProfile('write tests first')).toBe(TDD_PROFILE);
    });

    it('matches code review prompts', () => {
      expect(matchProfile('code review please')).toBe(CODE_REVIEW_PROFILE);
      expect(matchProfile('review before merge')).toBe(CODE_REVIEW_PROFILE);
      expect(matchProfile('PR review')).toBe(CODE_REVIEW_PROFILE);
    });

    it('matches docs-first prompts', () => {
      expect(matchProfile('docs first approach')).toBe(DOCS_FIRST_PROFILE);
      expect(matchProfile('spec first')).toBe(DOCS_FIRST_PROFILE);
      expect(matchProfile('documentation-driven development')).toBe(DOCS_FIRST_PROFILE);
    });

    it('matches no-workarounds prompts', () => {
      expect(matchProfile('no workarounds')).toBe(NO_WORKAROUNDS_PROFILE);
      expect(matchProfile('fix the tool')).toBe(NO_WORKAROUNDS_PROFILE);
    });

    it('returns undefined for non-matching prompts', () => {
      expect(matchProfile('hello world')).toBeUndefined();
      expect(matchProfile('random text')).toBeUndefined();
    });

    it('is case insensitive', () => {
      expect(matchProfile('TDD')).toBe(TDD_PROFILE);
      expect(matchProfile('CODE REVIEW')).toBe(CODE_REVIEW_PROFILE);
    });
  });
});
