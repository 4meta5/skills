import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseFrontmatter, loadSkillFromPath, loadSkillsFromDirectory, discoverSupportingFiles } from './loader.js';

describe('parseFrontmatter', () => {
  it('parses valid SKILL.md content', () => {
    const content = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the body.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('test-skill');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.body).toBe('# Test Skill\n\nThis is the body.');
  });

  it('parses all frontmatter fields', () => {
    const content = `---
name: complete-skill
description: A complete skill
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Bash
---

Content here.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('complete-skill');
    expect(result.frontmatter.description).toBe('A complete skill');
    expect(result.frontmatter['disable-model-invocation']).toBe(true);
    expect(result.frontmatter['user-invocable']).toBe(false);
    expect(result.frontmatter['allowed-tools']).toBe('Read, Write, Bash');
  });

  it('throws on missing frontmatter delimiters', () => {
    const content = 'Just some content without frontmatter';

    expect(() => parseFrontmatter(content)).toThrow('Invalid SKILL.md format');
  });

  it('throws on missing name field', () => {
    const content = `---
description: Missing name
---

Content`;

    expect(() => parseFrontmatter(content)).toThrow('missing required "name" field');
  });

  it('throws on missing description field', () => {
    const content = `---
name: no-description
---

Content`;

    expect(() => parseFrontmatter(content)).toThrow('missing required "description" field');
  });
});

describe('loadSkillFromPath', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `skill-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads a skill from a directory', async () => {
    const skillContent = `---
name: loaded-skill
description: A skill loaded from path
---

# Loaded Skill

Instructions here.`;

    await writeFile(join(tempDir, 'SKILL.md'), skillContent);

    const skill = await loadSkillFromPath(tempDir);

    expect(skill.metadata.name).toBe('loaded-skill');
    expect(skill.metadata.description).toBe('A skill loaded from path');
    expect(skill.content).toContain('# Loaded Skill');
    expect(skill.path).toBe(tempDir);
  });

  it('throws when SKILL.md is missing', async () => {
    await expect(loadSkillFromPath(tempDir)).rejects.toThrow('SKILL.md not found');
  });

  it('discovers supporting files', async () => {
    const skillContent = `---
name: skill-with-files
description: Has supporting files
---

Content`;

    await writeFile(join(tempDir, 'SKILL.md'), skillContent);
    await mkdir(join(tempDir, 'examples'), { recursive: true });
    await writeFile(join(tempDir, 'examples', 'example.md'), '# Example');
    await writeFile(join(tempDir, 'helper.txt'), 'Helper content');

    const skill = await loadSkillFromPath(tempDir);

    expect(skill.supportingFiles).toContain('examples/example.md');
    expect(skill.supportingFiles).toContain('helper.txt');
    expect(skill.supportingFiles).not.toContain('SKILL.md');
  });
});

describe('discoverSupportingFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `discover-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns empty array for empty directory', async () => {
    const files = await discoverSupportingFiles(tempDir);
    expect(files).toEqual([]);
  });

  it('excludes SKILL.md from results', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), 'content');
    await writeFile(join(tempDir, 'other.md'), 'content');

    const files = await discoverSupportingFiles(tempDir);

    expect(files).toEqual(['other.md']);
  });

  it('finds nested files', async () => {
    await mkdir(join(tempDir, 'a', 'b'), { recursive: true });
    await writeFile(join(tempDir, 'a', 'b', 'deep.txt'), 'content');

    const files = await discoverSupportingFiles(tempDir);

    expect(files).toContain('a/b/deep.txt');
  });
});

describe('loadSkillsFromDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `skills-dir-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('loads multiple skills from a directory', async () => {
    // Create skill 1
    await mkdir(join(tempDir, 'skill-one'));
    await writeFile(join(tempDir, 'skill-one', 'SKILL.md'), `---
name: skill-one
description: First skill
---

Content 1`);

    // Create skill 2
    await mkdir(join(tempDir, 'skill-two'));
    await writeFile(join(tempDir, 'skill-two', 'SKILL.md'), `---
name: skill-two
description: Second skill
---

Content 2`);

    const skills = await loadSkillsFromDirectory(tempDir);

    expect(skills).toHaveLength(2);
    expect(skills.map((s: { metadata: { name: string } }) => s.metadata.name)).toContain('skill-one');
    expect(skills.map((s: { metadata: { name: string } }) => s.metadata.name)).toContain('skill-two');
  });

  it('skips invalid skill directories', async () => {
    // Valid skill
    await mkdir(join(tempDir, 'valid-skill'));
    await writeFile(join(tempDir, 'valid-skill', 'SKILL.md'), `---
name: valid
description: Valid skill
---

Content`);

    // Invalid skill (no SKILL.md)
    await mkdir(join(tempDir, 'invalid-skill'));
    await writeFile(join(tempDir, 'invalid-skill', 'README.md'), 'Not a skill');

    const skills = await loadSkillsFromDirectory(tempDir);

    expect(skills).toHaveLength(1);
    expect(skills[0].metadata.name).toBe('valid');
  });

  it('returns empty array for non-existent directory', async () => {
    const skills = await loadSkillsFromDirectory('/non/existent/path');
    expect(skills).toEqual([]);
  });
});
