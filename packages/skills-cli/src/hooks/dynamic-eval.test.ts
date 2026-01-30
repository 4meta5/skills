/**
 * Tests for Dynamic Skill Evaluation Hook
 *
 * TDD: Phase 1 - RED
 * These tests define the expected behavior for dynamic skill loading and evaluation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';
import {
  loadSkillsForEvaluation,
  generateEvaluationPrompt,
  getCachedSkills,
  clearSkillsCache,
  type DynamicSkillConfig,
  type SkillEvaluation,
} from './dynamic-eval.js';

describe('dynamic-eval', () => {
  const testSkillsDir = join(process.cwd(), 'test-skills-temp');

  beforeEach(async () => {
    // Create test skills directory
    await mkdir(testSkillsDir, { recursive: true });
    // Clear cache before each test
    clearSkillsCache();
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testSkillsDir, { recursive: true, force: true });
    // Clear cache after each test
    clearSkillsCache();
  });

  /**
   * Helper to create a test skill
   */
  async function createTestSkill(
    name: string,
    description: string,
    content: string = '# Test Skill'
  ): Promise<void> {
    const skillDir = join(testSkillsDir, name);
    await mkdir(skillDir, { recursive: true });
    const skillMd = `---
name: ${name}
description: ${description}
---

${content}`;
    await writeFile(join(skillDir, 'SKILL.md'), skillMd, 'utf-8');
  }

  describe('loadSkillsForEvaluation', () => {
    it('should load skills from the specified directory', async () => {
      await createTestSkill('test-skill-1', 'A test skill for testing');
      await createTestSkill('test-skill-2', 'Another test skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.name)).toContain('test-skill-1');
      expect(skills.map((s) => s.name)).toContain('test-skill-2');
    });

    it('should return SkillEvaluation objects with name and description', async () => {
      await createTestSkill('my-skill', 'My skill description');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(1);
      expect(skills[0]).toEqual({
        name: 'my-skill',
        description: 'My skill description',
      });
    });

    it('should handle empty skills directory gracefully', async () => {
      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(0);
    });

    it('should handle non-existent directory gracefully', async () => {
      const config: DynamicSkillConfig = {
        skillsDir: '/non/existent/path',
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(0);
    });

    it('should skip directories without valid SKILL.md', async () => {
      // Create a valid skill
      await createTestSkill('valid-skill', 'Valid skill');

      // Create an invalid skill (no SKILL.md)
      const invalidDir = join(testSkillsDir, 'invalid-skill');
      await mkdir(invalidDir, { recursive: true });
      await writeFile(join(invalidDir, 'README.md'), '# Not a skill', 'utf-8');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('valid-skill');
    });

    it('should skip SKILL.md files missing required fields', async () => {
      // Create a valid skill
      await createTestSkill('valid-skill', 'Valid skill');

      // Create a skill with missing description
      const invalidDir = join(testSkillsDir, 'invalid-skill');
      await mkdir(invalidDir, { recursive: true });
      const invalidSkillMd = `---
name: invalid-skill
---

# Invalid Skill`;
      await writeFile(join(invalidDir, 'SKILL.md'), invalidSkillMd, 'utf-8');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('valid-skill');
    });

    it('should cache loaded skills for performance', async () => {
      await createTestSkill('cached-skill', 'A skill to cache');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 60000,
      };

      // First load
      const skills1 = await loadSkillsForEvaluation(config);
      expect(skills1).toHaveLength(1);

      // Add another skill (but it should be cached)
      await createTestSkill('new-skill', 'A new skill');

      // Second load should return cached result
      const skills2 = await loadSkillsForEvaluation(config);
      expect(skills2).toHaveLength(1); // Still 1 due to cache
      expect(skills2[0].name).toBe('cached-skill');
    });

    it('should refresh cache after TTL expires', async () => {
      vi.useFakeTimers();

      await createTestSkill('skill-1', 'First skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 1000, // 1 second TTL
      };

      // First load
      const skills1 = await loadSkillsForEvaluation(config);
      expect(skills1).toHaveLength(1);

      // Add another skill
      await createTestSkill('skill-2', 'Second skill');

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      // Load again - cache should be expired
      const skills2 = await loadSkillsForEvaluation(config);
      expect(skills2).toHaveLength(2);

      vi.useRealTimers();
    });

    it('should default cacheTimeMs to 60000 (1 minute)', async () => {
      await createTestSkill('test-skill', 'Test skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        // No cacheTimeMs specified
      };

      // Load skills
      await loadSkillsForEvaluation(config);

      // Add another skill
      await createTestSkill('new-skill', 'New skill');

      // Load again - should still be cached (default 60s)
      const skills = await loadSkillsForEvaluation(config);
      expect(skills).toHaveLength(1);
    });

    it('should handle multiline descriptions', async () => {
      const multilineDesc = `A skill with multiline description.
Use when: (1) testing, (2) debugging.`;

      const skillDir = join(testSkillsDir, 'multiline-skill');
      await mkdir(skillDir, { recursive: true });
      const skillMd = `---
name: multiline-skill
description: |
  A skill with multiline description.
  Use when: (1) testing, (2) debugging.
---

# Multiline Skill`;
      await writeFile(join(skillDir, 'SKILL.md'), skillMd, 'utf-8');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(1);
      expect(skills[0].description).toContain('multiline description');
      expect(skills[0].description).toContain('Use when');
    });
  });

  describe('generateEvaluationPrompt', () => {
    it('should generate a prompt with all skill names and descriptions', () => {
      const skills: SkillEvaluation[] = [
        { name: 'tdd', description: 'Test-driven development workflow' },
        { name: 'security', description: 'Security analysis for code' },
      ];

      const prompt = generateEvaluationPrompt(skills);

      expect(prompt).toContain('tdd');
      expect(prompt).toContain('Test-driven development workflow');
      expect(prompt).toContain('security');
      expect(prompt).toContain('Security analysis for code');
    });

    it('should return empty string for empty skills array', () => {
      const skills: SkillEvaluation[] = [];

      const prompt = generateEvaluationPrompt(skills);

      expect(prompt).toBe('');
    });

    it('should include instructions for skill selection', () => {
      const skills: SkillEvaluation[] = [
        { name: 'tdd', description: 'TDD workflow' },
      ];

      const prompt = generateEvaluationPrompt(skills);

      expect(prompt).toContain('Available skills');
    });

    it('should format skills as a numbered list', () => {
      const skills: SkillEvaluation[] = [
        { name: 'skill-1', description: 'First skill' },
        { name: 'skill-2', description: 'Second skill' },
        { name: 'skill-3', description: 'Third skill' },
      ];

      const prompt = generateEvaluationPrompt(skills);

      expect(prompt).toMatch(/1\.\s+skill-1/);
      expect(prompt).toMatch(/2\.\s+skill-2/);
      expect(prompt).toMatch(/3\.\s+skill-3/);
    });

    it('should include skill descriptions inline with names', () => {
      const skills: SkillEvaluation[] = [
        { name: 'my-skill', description: 'Does something useful' },
      ];

      const prompt = generateEvaluationPrompt(skills);

      // The description should appear near the skill name
      const lines = prompt.split('\n');
      const skillLine = lines.find((l) => l.includes('my-skill'));
      expect(skillLine).toContain('Does something useful');
    });
  });

  describe('getCachedSkills', () => {
    it('should return null if cache is empty', () => {
      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const cached = getCachedSkills(config);

      expect(cached).toBeNull();
    });

    it('should return cached skills if within TTL', async () => {
      await createTestSkill('test-skill', 'Test skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 60000,
      };

      // Load to populate cache
      await loadSkillsForEvaluation(config);

      // Check cache
      const cached = getCachedSkills(config);

      expect(cached).not.toBeNull();
      expect(cached).toHaveLength(1);
      expect(cached![0].name).toBe('test-skill');
    });

    it('should return null if cache is expired', async () => {
      vi.useFakeTimers();

      await createTestSkill('test-skill', 'Test skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 1000,
      };

      // Load to populate cache
      await loadSkillsForEvaluation(config);

      // Advance time past TTL
      vi.advanceTimersByTime(1500);

      // Check cache - should be expired
      const cached = getCachedSkills(config);

      expect(cached).toBeNull();

      vi.useRealTimers();
    });

    it('should return null for different skillsDir', async () => {
      await createTestSkill('test-skill', 'Test skill');

      const config1: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 60000,
      };

      // Load to populate cache for config1
      await loadSkillsForEvaluation(config1);

      // Check cache with different dir
      const config2: DynamicSkillConfig = {
        skillsDir: '/different/path',
        cacheTimeMs: 60000,
      };

      const cached = getCachedSkills(config2);

      expect(cached).toBeNull();
    });
  });

  describe('clearSkillsCache', () => {
    it('should clear all cached skills', async () => {
      await createTestSkill('test-skill', 'Test skill');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
        cacheTimeMs: 60000,
      };

      // Load to populate cache
      await loadSkillsForEvaluation(config);

      // Verify cache exists
      expect(getCachedSkills(config)).not.toBeNull();

      // Clear cache
      clearSkillsCache();

      // Verify cache is empty
      expect(getCachedSkills(config)).toBeNull();
    });
  });

  describe('integration scenarios', () => {
    it('should handle a realistic skills directory structure', async () => {
      // Create multiple skills like in a real project
      await createTestSkill(
        'tdd',
        'Test-Driven Development workflow with RED -> GREEN -> REFACTOR phases'
      );
      await createTestSkill(
        'security-analysis',
        'Static security review of code changes'
      );
      await createTestSkill(
        'code-review',
        'TypeScript-specific code review guidelines'
      );

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);
      const prompt = generateEvaluationPrompt(skills);

      // Verify all skills are loaded
      expect(skills).toHaveLength(3);

      // Verify prompt contains all skill information
      expect(prompt).toContain('tdd');
      expect(prompt).toContain('security-analysis');
      expect(prompt).toContain('code-review');
      expect(prompt).toContain('Test-Driven Development');
      expect(prompt).toContain('security review');
    });

    it('should work with nested skill content', async () => {
      const skillDir = join(testSkillsDir, 'complex-skill');
      await mkdir(skillDir, { recursive: true });

      // Create SKILL.md with complex content
      const skillMd = `---
name: complex-skill
description: A complex skill with many features
category: testing
user-invocable: true
---

# Complex Skill

## Features
- Feature 1
- Feature 2

## Usage
\`\`\`bash
skill run complex-skill
\`\`\``;
      await writeFile(join(skillDir, 'SKILL.md'), skillMd, 'utf-8');

      // Create supporting files
      await writeFile(join(skillDir, 'helper.ts'), 'export const helper = () => {};', 'utf-8');

      const config: DynamicSkillConfig = {
        skillsDir: testSkillsDir,
      };

      const skills = await loadSkillsForEvaluation(config);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('complex-skill');
      expect(skills[0].description).toBe('A complex skill with many features');
    });
  });
});
