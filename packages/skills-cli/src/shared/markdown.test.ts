import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  parseMarkdownFrontmatter,
  parseMarkdownSections,
  readMarkdownFile,
  writeMarkdownFile,
  updateFrontmatter,
  replaceSectionContent,
  type Section,
  type ParsedMarkdown
} from './markdown.js';

describe('shared/markdown module', () => {
  describe('parseMarkdownFrontmatter', () => {
    it('should parse valid YAML frontmatter', () => {
      const content = `---
name: test-skill
description: A test skill
category: testing
---

# Test Content

Some body text.`;

      const result = parseMarkdownFrontmatter(content);

      expect(result.frontmatter).toEqual({
        name: 'test-skill',
        description: 'A test skill',
        category: 'testing'
      });
      expect(result.body).toBe('# Test Content\n\nSome body text.');
    });

    it('should handle missing frontmatter', () => {
      const content = `# No Frontmatter

Just content.`;

      const result = parseMarkdownFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe(content);
    });

    it('should handle empty frontmatter', () => {
      const content = `---

---

# Empty Frontmatter`;

      const result = parseMarkdownFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.body).toBe('# Empty Frontmatter');
    });

    it('should handle complex YAML values', () => {
      const content = `---
name: complex-skill
tags:
  - tag1
  - tag2
metadata:
  key: value
---

Body.`;

      const result = parseMarkdownFrontmatter(content);

      expect(result.frontmatter.name).toBe('complex-skill');
      expect(result.frontmatter.tags).toEqual(['tag1', 'tag2']);
      expect(result.frontmatter.metadata).toEqual({ key: 'value' });
    });

    it('should normalize CRLF line endings', () => {
      const content = `---\r\nname: test\r\n---\r\n\r\nBody content.`;

      const result = parseMarkdownFrontmatter(content);

      expect(result.frontmatter.name).toBe('test');
      expect(result.body).not.toContain('\r');
    });
  });

  describe('parseMarkdownSections', () => {
    it('should parse level 2 sections', () => {
      const content = `# Main Title

## Section One

Content of section one.

## Section Two

Content of section two.`;

      const sections = parseMarkdownSections(content);

      expect(sections.length).toBe(2);
      expect(sections[0].title).toBe('Section One');
      expect(sections[0].content).toContain('Content of section one.');
      expect(sections[1].title).toBe('Section Two');
      expect(sections[1].content).toContain('Content of section two.');
    });

    it('should return empty array for content without sections', () => {
      const content = `# Just a Title

No level 2 sections here.`;

      const sections = parseMarkdownSections(content);

      expect(sections).toEqual([]);
    });

    it('should include startLine and endLine', () => {
      const content = `## First Section

Line 1
Line 2

## Second Section

Line 3`;

      const sections = parseMarkdownSections(content);

      expect(sections[0].startLine).toBe(0);
      expect(sections[0].endLine).toBeLessThan(sections[1].startLine);
      expect(sections[1].title).toBe('Second Section');
    });

    it('should handle content before first section', () => {
      const content = `Some intro text.

## Actual Section

Section content.`;

      const sections = parseMarkdownSections(content);

      expect(sections.length).toBe(1);
      expect(sections[0].title).toBe('Actual Section');
    });
  });

  describe('readMarkdownFile / writeMarkdownFile', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'markdown-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should read markdown file content', async () => {
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, '# Test\n\nContent.', 'utf-8');

      const content = await readMarkdownFile(filePath);

      expect(content).toBe('# Test\n\nContent.');
    });

    it('should throw for non-existent file', async () => {
      const filePath = join(tempDir, 'nonexistent.md');

      await expect(readMarkdownFile(filePath)).rejects.toThrow();
    });

    it('should write markdown file content', async () => {
      const filePath = join(tempDir, 'output.md');
      const content = '# Output\n\nGenerated content.';

      await writeMarkdownFile(filePath, content);

      const { readFile } = await import('fs/promises');
      const written = await readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });

    it('should create parent directories if needed', async () => {
      const filePath = join(tempDir, 'nested', 'dir', 'file.md');
      const content = '# Nested File';

      await writeMarkdownFile(filePath, content);

      const { readFile } = await import('fs/promises');
      const written = await readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });
  });

  describe('updateFrontmatter', () => {
    it('should update existing frontmatter fields', () => {
      const content = `---
name: old-name
description: Old description
---

# Body`;

      const result = updateFrontmatter(content, { name: 'new-name' });

      const parsed = parseMarkdownFrontmatter(result);
      expect(parsed.frontmatter.name).toBe('new-name');
      expect(parsed.frontmatter.description).toBe('Old description');
    });

    it('should add new frontmatter fields', () => {
      const content = `---
name: skill
---

# Body`;

      const result = updateFrontmatter(content, { category: 'testing', version: '1.0.0' });

      const parsed = parseMarkdownFrontmatter(result);
      expect(parsed.frontmatter.name).toBe('skill');
      expect(parsed.frontmatter.category).toBe('testing');
      expect(parsed.frontmatter.version).toBe('1.0.0');
    });

    it('should create frontmatter if missing', () => {
      const content = `# No Frontmatter

Body content.`;

      const result = updateFrontmatter(content, { name: 'new-skill' });

      const parsed = parseMarkdownFrontmatter(result);
      expect(parsed.frontmatter.name).toBe('new-skill');
      expect(parsed.body).toContain('Body content.');
    });

    it('should preserve body content', () => {
      const content = `---
name: test
---

# Body Title

Paragraph with **formatting**.

- List item 1
- List item 2`;

      const result = updateFrontmatter(content, { description: 'added' });

      const parsed = parseMarkdownFrontmatter(result);
      expect(parsed.body).toContain('# Body Title');
      expect(parsed.body).toContain('**formatting**');
      expect(parsed.body).toContain('- List item 1');
    });
  });

  describe('replaceSectionContent', () => {
    it('should replace content of existing section', () => {
      const content = `# Title

## Target Section

Old content here.

## Other Section

Keep this.`;

      const result = replaceSectionContent(content, 'Target Section', 'New content here.');

      expect(result).toContain('## Target Section');
      expect(result).toContain('New content here.');
      expect(result).not.toContain('Old content here.');
      expect(result).toContain('Keep this.');
    });

    it('should handle section at end of file', () => {
      const content = `# Title

## First Section

First content.

## Last Section

To be replaced.`;

      const result = replaceSectionContent(content, 'Last Section', 'Replaced content.');

      expect(result).toContain('Replaced content.');
      expect(result).not.toContain('To be replaced.');
      expect(result).toContain('First content.');
    });

    it('should return unchanged content if section not found', () => {
      const content = `# Title

## Existing Section

Content.`;

      const result = replaceSectionContent(content, 'Nonexistent Section', 'New content');

      expect(result).toBe(content);
    });

    it('should preserve section header', () => {
      const content = `## My Section

Old text.`;

      const result = replaceSectionContent(content, 'My Section', 'New text.');

      expect(result).toContain('## My Section');
      expect(result).toContain('New text.');
    });
  });
});
