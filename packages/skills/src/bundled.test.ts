import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Track SKILL.md reads specifically (not all fs reads).
 * This tests lazy loading of skills without coupling to other fs usage.
 */
const skillFileReads: string[] = [];
const EXPECTED_SKILLS = [
  'tdd',
  'unit-test-workflow',
  'suggest-tests',
  'no-workarounds',
  'code-review',
  'code-review-ts',
  'code-review-js',
  'code-review-rust',
  'pr-description',
  'refactor-suggestions',
  'security-analysis',
  'describe-codebase',
];

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) => {
      const [path] = args;
      // Only track SKILL.md reads (the lazy loading target)
      if (typeof path === 'string' && path.endsWith('SKILL.md')) {
        skillFileReads.push(path);
      }
      return actual.readFileSync(...args);
    },
  };
});

/**
 * Tests for bundled.ts
 *
 * Verifies:
 * 1. Path resolution finds the skills directory
 * 2. Lazy loading: NO SKILL.md reads on module import
 * 3. Caching: same object returned on repeated calls
 * 4. Missing files return undefined
 */

describe('bundled skills', () => {
  beforeEach(() => {
    skillFileReads.length = 0;
    vi.resetModules();
  });

  describe('path resolution', () => {
    it('finds the skills directory containing tdd/SKILL.md', async () => {
      const bundled = await import('./bundled.js');
      const tdd = bundled.getBundledSkill('tdd');

      expect(tdd).toBeDefined();
      expect(tdd?.metadata.name).toBe('tdd');
    });

    it('resolves skill path that exists on disk', async () => {
      const bundled = await import('./bundled.js');
      const tdd = bundled.getBundledSkill('tdd');

      expect(tdd).toBeDefined();
      expect(existsSync(join(tdd!.path, 'SKILL.md'))).toBe(true);
    });
  });

  describe('getBundledSkill', () => {
    it('returns a valid skill object for known skills', async () => {
      const bundled = await import('./bundled.js');
      const tdd = bundled.getBundledSkill('tdd');

      expect(tdd).toBeDefined();
      expect(tdd?.metadata).toBeDefined();
      expect(tdd?.metadata.name).toBe('tdd');
      expect(tdd?.metadata.description).toBeDefined();
      expect(tdd?.content).toBeDefined();
      expect(tdd?.path).toBeDefined();
    });

    it('returns undefined for nonexistent skills', async () => {
      const bundled = await import('./bundled.js');
      const nonexistent = bundled.getBundledSkill('nonexistent-skill-that-does-not-exist');

      expect(nonexistent).toBeUndefined();
    });

    it('returns undefined for skill not in registry', async () => {
      const bundled = await import('./bundled.js');
      const missing = bundled.getBundledSkill('not-in-registry');
      expect(missing).toBeUndefined();
    });

    it('loads all expected bundled skills', async () => {
      const bundled = await import('./bundled.js');
      for (const skillName of EXPECTED_SKILLS) {
        const skill = bundled.getBundledSkill(skillName);
        expect(skill, `Expected bundled skill '${skillName}' to be defined`).toBeDefined();
      }
    });
  });

  describe('listBundledSkillNames', () => {
    it('returns an array of skill names', async () => {
      const bundled = await import('./bundled.js');
      const names = bundled.listBundledSkillNames();

      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('tdd');
    });

    it('returns all bundled skill names', async () => {
      const bundled = await import('./bundled.js');
      const names = bundled.listBundledSkillNames();

      expect(names.length).toBe(EXPECTED_SKILLS.length);
    });
  });

  describe('lazy loading', () => {
    it('does NOT read SKILL.md files at module import time', async () => {
      skillFileReads.length = 0;

      await import('./bundled.js');

      // No SKILL.md reads on import (lazy loading)
      expect(skillFileReads).toHaveLength(0);
    });

    it('reads SKILL.md only after getBundledSkill() is called', async () => {
      skillFileReads.length = 0;

      const bundled = await import('./bundled.js');

      // Before getBundledSkill: no skill file reads
      expect(skillFileReads).toHaveLength(0);

      // Call getBundledSkill
      bundled.getBundledSkill('tdd');

      // After getBundledSkill: skill file was read
      expect(skillFileReads.length).toBeGreaterThan(0);
      expect(skillFileReads.some(p => p.includes('tdd/SKILL.md'))).toBe(true);
    });

    it('listBundledSkillNames does NOT trigger SKILL.md reads', async () => {
      skillFileReads.length = 0;

      const bundled = await import('./bundled.js');

      // Listing names should not read skill files
      const names = bundled.listBundledSkillNames();

      expect(names.length).toBe(EXPECTED_SKILLS.length);
      expect(skillFileReads).toHaveLength(0);
    });
  });

  describe('caching', () => {
    it('returns same object reference on repeated calls', async () => {
      const bundled = await import('./bundled.js');

      const tdd1 = bundled.getBundledSkill('tdd');
      const tdd2 = bundled.getBundledSkill('tdd');

      // Same object reference (cached)
      expect(tdd1).toBe(tdd2);
    });

    it('does not re-read file on second call', async () => {
      skillFileReads.length = 0;

      const bundled = await import('./bundled.js');

      // First call
      bundled.getBundledSkill('tdd');
      const readsAfterFirst = skillFileReads.length;

      // Second call - should NOT re-read
      bundled.getBundledSkill('tdd');
      const readsAfterSecond = skillFileReads.length;

      expect(readsAfterSecond).toBe(readsAfterFirst);
    });

    it('caches different skills independently', async () => {
      const bundled = await import('./bundled.js');

      const tdd = bundled.getBundledSkill('tdd');
      const codeReview = bundled.getBundledSkill('code-review');

      // Different skills
      expect(tdd).not.toBe(codeReview);

      // Each is cached
      expect(bundled.getBundledSkill('tdd')).toBe(tdd);
      expect(bundled.getBundledSkill('code-review')).toBe(codeReview);
    });
  });

  describe('module import resilience', () => {
    it('module import does not throw', async () => {
      await expect(import('./bundled.js')).resolves.toBeDefined();
    });
  });
});
