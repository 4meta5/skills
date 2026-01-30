/**
 * Tests for skill matching with real skill descriptions
 *
 * Tests that skills with general descriptions match appropriate prompts.
 * RED phase: blog-writer skill description should mention general markdown editing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRouter } from './router.js';
import type { VectorStore } from './types.js';

describe('skill matching', () => {
  let testDir: string;
  let vectorStorePath: string;

  // Skill with general markdown editing description (the fix we're testing)
  const markdownWriterSkill = {
    skillName: 'markdown-writer',
    description: `Edit and create markdown files with consistent style. Use when:
      (1) Creating or updating README files, (2) Editing documentation,
      (3) Writing markdown content, (4) Managing any .md files.
      Follows Paul Graham writing style: short sentences, direct claims, no hedging.`,
    triggerExamples: [
      'update the README',
      'edit documentation',
      'write markdown',
      'fix the docs',
    ],
    embedding: new Array(384).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.1),
    keywords: ['readme', 'markdown', 'documentation', 'docs', '.md'],
  };

  // Skill hardcoded to specific project (the current broken state)
  const blogWriterSkillBroken = {
    skillName: 'blog-writer-broken',
    description: `Write and manage blog posts for amarsingh.dev. Use when:
      (1) Creating new blog posts, (2) Updating existing posts.
      Posts live at src/content/blog/.`,
    triggerExamples: [
      'write a blog post',
      'create post for amarsingh.dev',
    ],
    embedding: new Array(384).fill(0).map((_, i) => Math.cos(i * 0.1) * 0.1),
    keywords: ['blog', 'post', 'amarsingh'],
  };

  const sampleVectorStore: VectorStore = {
    version: '1.0.0',
    model: 'Xenova/all-MiniLM-L6-v2',
    generatedAt: new Date().toISOString(),
    skills: [markdownWriterSkill, blogWriterSkillBroken],
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), `skill-matching-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    vectorStorePath = join(testDir, 'vector_store.json');
    await writeFile(vectorStorePath, JSON.stringify(sampleVectorStore));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('general markdown editing prompts', () => {
    it('should match markdown-writer for "update the README"', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('update the README');

      const matchedSkills = result.matches.map(m => m.skillName);
      expect(matchedSkills).toContain('markdown-writer');
    });

    it('should match markdown-writer for "edit the documentation"', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('edit the documentation');

      const matchedSkills = result.matches.map(m => m.skillName);
      expect(matchedSkills).toContain('markdown-writer');
    });

    it('should match markdown-writer for "update DONE.md"', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('update DONE.md with completed tasks');

      const matchedSkills = result.matches.map(m => m.skillName);
      expect(matchedSkills).toContain('markdown-writer');
    });

    it('should NOT match broken blog-writer for general README editing', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('update the README');

      // The broken skill should not match README editing
      // because its description is too specific to amarsingh.dev
      const topMatch = result.matches[0];
      if (topMatch) {
        expect(topMatch.skillName).not.toBe('blog-writer-broken');
      }
    });
  });

  describe('blog-specific prompts', () => {
    it('should match blog-writer for blog-specific prompts', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('write a blog post about TypeScript');

      const matchedSkills = result.matches.map(m => m.skillName);
      expect(matchedSkills).toContain('blog-writer-broken');
    });
  });

  describe('markdown-writer skill (general purpose)', () => {
    it('should exist as a separate skill from blog-writer', async () => {
      const skillPath = join(process.cwd(), '../../.claude/skills/custom/markdown-writer/SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(0);
    });

    it('should have description mentioning README and documentation', async () => {
      const skillPath = join(process.cwd(), '../../.claude/skills/custom/markdown-writer/SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      const descriptionMatch = content.match(/description:\s*\|?\s*([\s\S]*?)(?=\n[a-z-]+:|---)/i);
      const description = descriptionMatch ? descriptionMatch[1].trim() : '';

      expect(description.toLowerCase()).toContain('readme');
      expect(description.toLowerCase()).toContain('documentation');
    });

    it('should NOT mention amarsingh.dev', async () => {
      const skillPath = join(process.cwd(), '../../.claude/skills/custom/markdown-writer/SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content).not.toContain('amarsingh.dev');
    });

    it('should include Paul Graham writing style guidelines', async () => {
      const skillPath = join(process.cwd(), '../../.claude/skills/custom/markdown-writer/SKILL.md');
      const content = await readFile(skillPath, 'utf-8');

      expect(content.toLowerCase()).toContain('short sentences');
      expect(content.toLowerCase()).toContain('no hedging');
    });
  });
});
