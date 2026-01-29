import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('embed command', () => {
  let targetDir: string;
  let skillsDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'skills-embed-test-'));
    skillsDir = join(targetDir, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('scanSkillsDirectory', () => {
    it('should discover all skill directories', async () => {
      // Create test skill directories
      const skill1Dir = join(skillsDir, 'test-skill-1');
      const skill2Dir = join(skillsDir, 'test-skill-2');
      await mkdir(skill1Dir, { recursive: true });
      await mkdir(skill2Dir, { recursive: true });

      await writeFile(join(skill1Dir, 'SKILL.md'), `---
name: test-skill-1
description: First test skill
---

# Test Skill 1

This is a test skill.
`);

      await writeFile(join(skill2Dir, 'SKILL.md'), `---
name: test-skill-2
description: Second test skill
---

# Test Skill 2

This is another test skill.
`);

      const { scanSkillsDirectory } = await import('./embed.js');
      const skills = await scanSkillsDirectory(skillsDir);

      expect(skills).toHaveLength(2);
      expect(skills.map(s => s.name)).toContain('test-skill-1');
      expect(skills.map(s => s.name)).toContain('test-skill-2');
    });

    it('should skip directories without SKILL.md', async () => {
      const validSkillDir = join(skillsDir, 'valid-skill');
      const invalidDir = join(skillsDir, 'not-a-skill');
      await mkdir(validSkillDir, { recursive: true });
      await mkdir(invalidDir, { recursive: true });

      await writeFile(join(validSkillDir, 'SKILL.md'), `---
name: valid-skill
description: A valid skill
---

# Valid Skill
`);

      // invalidDir has no SKILL.md

      const { scanSkillsDirectory } = await import('./embed.js');
      const skills = await scanSkillsDirectory(skillsDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('valid-skill');
    });
  });

  describe('parseSkillMd', () => {
    it('should extract name and description from frontmatter', async () => {
      const skillDir = join(skillsDir, 'parse-test');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: parse-test-skill
description: A skill for parsing tests
category: testing
---

# Parse Test Skill

Content here.
`);

      const { parseSkillMd } = await import('./embed.js');
      const result = await parseSkillMd(join(skillDir, 'SKILL.md'));

      expect(result.name).toBe('parse-test-skill');
      expect(result.description).toBe('A skill for parsing tests');
      expect(result.category).toBe('testing');
    });

    it('should handle multi-line descriptions', async () => {
      const skillDir = join(skillsDir, 'multiline-test');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: multiline-skill
description: |
  This is a multi-line description
  that spans multiple lines
---

# Multiline Skill
`);

      const { parseSkillMd } = await import('./embed.js');
      const result = await parseSkillMd(join(skillDir, 'SKILL.md'));

      expect(result.name).toBe('multiline-skill');
      expect(result.description).toContain('multi-line description');
      expect(result.description).toContain('multiple lines');
    });
  });

  describe('extractTriggerExamples', () => {
    it('should extract triggers from "When to Use" section', async () => {
      const content = `---
name: test-skill
description: Test skill description
---

# Test Skill

## When to Use

Use this skill when:
- Writing unit tests
- Debugging test failures
- Reviewing test coverage

## Other Section

More content.
`;

      const { extractTriggerExamples } = await import('./embed.js');
      const triggers = extractTriggerExamples(content);

      expect(triggers).toContain('Writing unit tests');
      expect(triggers).toContain('Debugging test failures');
      expect(triggers).toContain('Reviewing test coverage');
    });

    it('should extract triggers from "Trigger Conditions" section', async () => {
      const content = `---
name: another-skill
description: Another skill
---

# Another Skill

## Trigger Conditions

- User asks about TypeScript
- Code contains type errors
- Implementing interfaces

## Implementation
`;

      const { extractTriggerExamples } = await import('./embed.js');
      const triggers = extractTriggerExamples(content);

      expect(triggers).toContain('User asks about TypeScript');
      expect(triggers).toContain('Code contains type errors');
      expect(triggers).toContain('Implementing interfaces');
    });

    it('should extract triggers from "When to Invoke" section', async () => {
      const content = `---
name: invoke-skill
description: Skill with invoke section
---

# Invoke Skill

## When to Invoke (Automatic Detection)

**Invoke this skill when you detect:**

- Serialization pairs
- Parsers
- Normalization

## More Content
`;

      const { extractTriggerExamples } = await import('./embed.js');
      const triggers = extractTriggerExamples(content);

      expect(triggers).toContain('Serialization pairs');
      expect(triggers).toContain('Parsers');
      expect(triggers).toContain('Normalization');
    });

    it('should include skill name as trigger example', async () => {
      const content = `---
name: my-special-skill
description: A special skill
---

# My Special Skill

No trigger sections here.
`;

      const { extractTriggerExamples, parseSkillMd } = await import('./embed.js');
      const triggers = extractTriggerExamples(content, 'my-special-skill');

      // Should include skill name variants
      expect(triggers.some(t => t.includes('my-special-skill'))).toBe(true);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from skill content', async () => {
      const content = `---
name: tdd
description: Test-Driven Development workflow
---

# TDD Workflow

Keywords: test-driven, unit test, refactoring

Use this for writing tests and implementing features.
`;

      const { extractKeywords } = await import('./embed.js');
      const keywords = extractKeywords(content, 'tdd');

      // Should include the skill name
      expect(keywords).toContain('tdd');
      // Should extract common patterns
      expect(keywords.some(k => k.includes('test'))).toBe(true);
    });

    it('should include skill name and description keywords', async () => {
      const { extractKeywords } = await import('./embed.js');
      const keywords = extractKeywords('', 'code-review', 'Review code for best practices');

      expect(keywords).toContain('code-review');
      expect(keywords.some(k => k.includes('review'))).toBe(true);
    });
  });

  describe('generateVectorStore', () => {
    it('should generate valid vector store JSON', async () => {
      // Create a test skill
      const skillDir = join(skillsDir, 'vector-test');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: vector-test-skill
description: A skill for testing vector generation
---

# Vector Test Skill

## When to Use

- Testing vector generation
- Validating embeddings
`);

      const outputPath = join(targetDir, 'test-vectors.json');

      const { generateVectorStore } = await import('./embed.js');
      await generateVectorStore({
        skillsDir,
        outputPath,
        skipEmbeddings: true, // Skip actual embedding generation for faster tests
      });

      // Read and validate output
      const content = await readFile(outputPath, 'utf-8');
      const vectorStore = JSON.parse(content);

      expect(vectorStore.version).toBe('1.0.0');
      expect(vectorStore.model).toBe('Xenova/all-MiniLM-L6-v2');
      expect(vectorStore.generatedAt).toBeDefined();
      expect(vectorStore.skills).toHaveLength(1);
      expect(vectorStore.skills[0].skillName).toBe('vector-test-skill');
      expect(vectorStore.skills[0].description).toBe('A skill for testing vector generation');
      expect(vectorStore.skills[0].triggerExamples).toContain('Testing vector generation');
    });
  });

  describe('embedCommand', () => {
    it('should create output file at specified path', async () => {
      // Create a test skill
      const skillDir = join(skillsDir, 'embed-cmd-test');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: embed-cmd-test
description: Test for embed command
---

# Embed Command Test
`);

      const outputPath = join(targetDir, 'output', 'vectors.json');

      const { embedCommand } = await import('./embed.js');
      await embedCommand({
        skillsDir,
        output: outputPath,
        skipEmbeddings: true,
      });

      // Verify output was created
      const content = await readFile(outputPath, 'utf-8');
      expect(content).toBeDefined();

      const store = JSON.parse(content);
      expect(store.skills).toHaveLength(1);
    });

    it('should use default skills directory when not specified', async () => {
      // Create skill in default location relative to cwd
      const cwdSkillsDir = join(targetDir, '.claude', 'skills');
      await mkdir(cwdSkillsDir, { recursive: true });

      const skillDir = join(cwdSkillsDir, 'default-dir-test');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: default-dir-test
description: Test default directory
---

# Default Dir Test
`);

      const outputPath = join(targetDir, 'default-vectors.json');

      const { embedCommand } = await import('./embed.js');
      await embedCommand({
        output: outputPath,
        cwd: targetDir,
        skipEmbeddings: true,
      });

      const content = await readFile(outputPath, 'utf-8');
      const store = JSON.parse(content);
      expect(store.skills).toHaveLength(1);
      expect(store.skills[0].skillName).toBe('default-dir-test');
    });
  });
});
