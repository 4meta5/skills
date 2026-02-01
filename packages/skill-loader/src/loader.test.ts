import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadSkillFromPath,
  loadSkillsFromDirectory,
  discoverSupportingFiles,
  isSkillDirectory
} from './loader.js';

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

  it('returns undefined supportingFiles when none exist', async () => {
    const skillContent = `---
name: no-extras
description: No supporting files
---

Content`;

    await writeFile(join(tempDir, 'SKILL.md'), skillContent);

    const skill = await loadSkillFromPath(tempDir);

    expect(skill.supportingFiles).toBeUndefined();
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

  it('handles non-existent directory gracefully', async () => {
    const files = await discoverSupportingFiles('/non/existent/path');
    expect(files).toEqual([]);
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
    expect(skills.map(s => s.metadata.name)).toContain('skill-one');
    expect(skills.map(s => s.metadata.name)).toContain('skill-two');
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

  it('discovers nested skills in subdirectories', async () => {
    // Create parent skill
    await mkdir(join(tempDir, 'parent-skill'));
    await writeFile(join(tempDir, 'parent-skill', 'SKILL.md'), `---
name: parent-skill
description: Parent skill with nested skills
---

Content`);

    // Create nested skill bundle directory
    await mkdir(join(tempDir, 'parent-skill', 'skills', 'child-skill-one'), { recursive: true });
    await writeFile(join(tempDir, 'parent-skill', 'skills', 'child-skill-one', 'SKILL.md'), `---
name: child-skill-one
description: First nested skill
---

Content 1`);

    // Create another nested skill
    await mkdir(join(tempDir, 'parent-skill', 'skills', 'child-skill-two'), { recursive: true });
    await writeFile(join(tempDir, 'parent-skill', 'skills', 'child-skill-two', 'SKILL.md'), `---
name: child-skill-two
description: Second nested skill
---

Content 2`);

    const skills = await loadSkillsFromDirectory(tempDir);

    // Should find parent AND both children
    expect(skills).toHaveLength(3);
    const names = skills.map(s => s.metadata.name);
    expect(names).toContain('parent-skill');
    expect(names).toContain('child-skill-one');
    expect(names).toContain('child-skill-two');
  });

  it('respects maxDepth option', async () => {
    // Create deeply nested skill
    await mkdir(join(tempDir, 'a', 'b', 'c', 'deep-skill'), { recursive: true });
    await writeFile(join(tempDir, 'a', 'b', 'c', 'deep-skill', 'SKILL.md'), `---
name: deep-skill
description: Deeply nested skill
---

Content`);

    // With low maxDepth, should not find deep skill
    const shallowSkills = await loadSkillsFromDirectory(tempDir, { maxDepth: 2 });
    expect(shallowSkills).toHaveLength(0);

    // With higher maxDepth, should find it
    const deepSkills = await loadSkillsFromDirectory(tempDir, { maxDepth: 5 });
    expect(deepSkills).toHaveLength(1);
    expect(deepSkills[0].metadata.name).toBe('deep-skill');
  });
});

describe('isSkillDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `is-skill-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('returns true for valid skill directory', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), `---
name: valid-skill
description: A valid skill
---

Content`);

    expect(await isSkillDirectory(tempDir)).toBe(true);
  });

  it('returns false for directory without SKILL.md', async () => {
    await writeFile(join(tempDir, 'README.md'), '# Not a skill');

    expect(await isSkillDirectory(tempDir)).toBe(false);
  });

  it('returns false for directory with invalid SKILL.md', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), 'Invalid content without frontmatter');

    expect(await isSkillDirectory(tempDir)).toBe(false);
  });

  it('returns false for non-existent directory', async () => {
    expect(await isSkillDirectory('/non/existent/path')).toBe(false);
  });
});
