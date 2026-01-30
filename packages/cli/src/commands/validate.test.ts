import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import functions to test (these don't exist yet - tests will fail)
import { validateCommand, validateSkill, type ValidationResult } from './validate.js';

describe('validate command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skills-validate-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('validateSkill', () => {
    it('should pass for valid skill with proper frontmatter', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'valid-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: valid-skill
description: |
  A well-formed skill with proper description that explains what it does.
  Use when you need to validate skill formatting and ensure quality.
category: testing
---

# Valid Skill

This skill demonstrates proper formatting.
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should fail when SKILL.md is missing', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'no-skill');
      await mkdir(skillDir, { recursive: true });
      // No SKILL.md created

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SKILL.md not found');
    });

    it('should fail when frontmatter is missing', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'no-frontmatter');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `# A Skill Without Frontmatter

This skill has no YAML frontmatter.
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('frontmatter'))).toBe(true);
    });

    it('should fail when required name field is missing', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'no-name');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
description: A skill without a name field
---

# Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
    });

    it('should fail when required description field is missing', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'no-description');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: no-description
---

# Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('description'))).toBe(true);
    });

    it('should warn when description is too short for semantic matching', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'short-description');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: short-description
description: Too short
---

# Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      // Valid but with warning about description being too short
      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('short') || w.includes('chars'))).toBe(true);
    });

    it('should warn when description lacks trigger conditions', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'vague-description');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: vague-description
description: A skill that does something helpful for developers
---

# Skill

No trigger conditions mentioned.
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w =>
        w.includes('trigger') || w.includes('Use when') || w.includes('specific')
      )).toBe(true);
    });

    it('should fail when category is invalid', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'bad-category');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: bad-category
description: A skill with an invalid category value
category: invalid-category
---

# Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('category'))).toBe(true);
    });

    it('should pass when category is valid', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'good-category');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: good-category
description: A skill with a valid category for testing purposes
category: testing
---

# Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect slop patterns in content', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'slop-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: slop-skill
description: A skill that contains slop content patterns
---

# Test Skill

NEW content with improvements!
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('slop') || e.includes('placeholder'))).toBe(true);
    });

    it('should detect test-skill-* naming pattern', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'test-skill-1234567890');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: test-skill-1234567890
description: A skill with test-skill naming that indicates it is slop
---

# Test Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e =>
        e.includes('test-skill') || e.includes('slop') || e.includes('naming')
      )).toBe(true);
    });

    it('should validate references directory exists if referenced', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'with-references');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: with-references
description: A skill that references files in references directory
---

# Skill

See [reference](references/guide.md) for more details.
`,
        'utf-8'
      );
      // Note: references/ directory does NOT exist

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('references'))).toBe(true);
    });
  });

  describe('validateCommand', () => {
    it('should validate all skills in project', async () => {
      // Create project with multiple skills
      const skillsDir = join(tempDir, '.claude', 'skills');

      // Valid skill
      const validDir = join(skillsDir, 'valid-skill');
      await mkdir(validDir, { recursive: true });
      await writeFile(
        join(validDir, 'SKILL.md'),
        `---
name: valid-skill
description: A properly formatted skill with good description
category: testing
---

# Valid Skill
`,
        'utf-8'
      );

      // Invalid skill
      const invalidDir = join(skillsDir, 'invalid-skill');
      await mkdir(invalidDir, { recursive: true });
      await writeFile(
        join(invalidDir, 'SKILL.md'),
        `No frontmatter here!`,
        'utf-8'
      );

      const results = await validateCommand({ cwd: tempDir });

      expect(results.total).toBe(2);
      expect(results.valid).toBe(1);
      expect(results.invalid).toBe(1);
      expect(results.skills['valid-skill'].valid).toBe(true);
      expect(results.skills['invalid-skill'].valid).toBe(false);
    });

    it('should validate specific skill path', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'target-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: target-skill
description: The specific skill we want to validate
---

# Target Skill
`,
        'utf-8'
      );

      const results = await validateCommand({ cwd: tempDir, path: 'target-skill' });

      expect(results.total).toBe(1);
      expect(results.skills['target-skill']).toBeDefined();
    });

    it('should return JSON output when requested', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'json-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: json-skill
description: A skill for testing JSON output
---

# JSON Skill
`,
        'utf-8'
      );

      const results = await validateCommand({ cwd: tempDir, json: true });

      // Results should be JSON-serializable
      expect(() => JSON.stringify(results)).not.toThrow();
      expect(results.total).toBe(1);
    });

    it('should handle empty skills directory', async () => {
      await mkdir(join(tempDir, '.claude', 'skills'), { recursive: true });

      const results = await validateCommand({ cwd: tempDir });

      expect(results.total).toBe(0);
      expect(results.valid).toBe(0);
      expect(results.invalid).toBe(0);
    });

    it('should handle missing .claude/skills directory', async () => {
      // tempDir has no .claude/skills

      const results = await validateCommand({ cwd: tempDir });

      expect(results.total).toBe(0);
    });
  });

  describe('quality checks', () => {
    it('should check for good description structure', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'structured-description');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: structured-description
description: |
  Fix for "ENOENT: no such file or directory" errors when running npm scripts.
  Use when: (1) npm run fails with ENOENT, (2) paths work in root but not packages.
  Covers node_modules resolution in monorepos.
---

# Structured Description Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.quality?.descriptionScore).toBeGreaterThanOrEqual(0.8);
    });

    it('should score description quality', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'quality-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: quality-skill
description: A skill that does things
---

# Quality Skill
`,
        'utf-8'
      );

      const result = await validateSkill(skillDir);

      expect(result.quality).toBeDefined();
      expect(result.quality?.descriptionScore).toBeLessThan(0.5);
    });
  });
});
