import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createSkillsLibrary } from './library.js';
import type { Skill } from './types.js';

describe('createSkillsLibrary', () => {
  let tempDir: string;
  let bundledDir: string;
  let projectDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `library-test-${Date.now()}`);
    bundledDir = join(tempDir, 'bundled');
    projectDir = join(tempDir, 'project');

    await mkdir(bundledDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });

    // Create a bundled skill
    await mkdir(join(bundledDir, 'bundled-skill'));
    await writeFile(join(bundledDir, 'bundled-skill', 'SKILL.md'), `---
name: bundled-skill
description: A bundled skill
category: testing
---

Bundled skill content`);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadSkill', () => {
    it('loads a skill from bundled directory', async () => {
      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skill = await library.loadSkill('bundled-skill');

      expect(skill.metadata.name).toBe('bundled-skill');
      expect(skill.content).toBe('Bundled skill content');
    });

    it('prefers project skills over bundled', async () => {
      // Create project skill with same name
      await mkdir(join(projectDir, '.claude', 'skills', 'bundled-skill'), { recursive: true });
      await writeFile(
        join(projectDir, '.claude', 'skills', 'bundled-skill', 'SKILL.md'),
        `---
name: bundled-skill
description: Project override
---

Project version`
      );

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skill = await library.loadSkill('bundled-skill');

      expect(skill.metadata.description).toBe('Project override');
      expect(skill.content).toBe('Project version');
    });

    it('throws when skill not found', async () => {
      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      await expect(library.loadSkill('nonexistent')).rejects.toThrow('Skill not found: nonexistent');
    });
  });

  describe('listSkills', () => {
    it('lists all available skills', async () => {
      // Add another bundled skill
      await mkdir(join(bundledDir, 'another-skill'));
      await writeFile(join(bundledDir, 'another-skill', 'SKILL.md'), `---
name: another-skill
description: Another skill
---

Content`);

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skills = await library.listSkills();

      expect(skills.length).toBeGreaterThanOrEqual(2);
      expect(skills.map((s: Skill) => s.metadata.name)).toContain('bundled-skill');
      expect(skills.map((s: Skill) => s.metadata.name)).toContain('another-skill');
    });

    it('filters by category', async () => {
      // Add skill with different category
      await mkdir(join(bundledDir, 'dev-skill'));
      await writeFile(join(bundledDir, 'dev-skill', 'SKILL.md'), `---
name: dev-skill
description: Development skill
category: development
---

Content`);

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const testingSkills = await library.listSkills('testing');
      const devSkills = await library.listSkills('development');

      expect(testingSkills.map((s: Skill) => s.metadata.name)).toContain('bundled-skill');
      expect(testingSkills.map((s: Skill) => s.metadata.name)).not.toContain('dev-skill');
      expect(devSkills.map((s: Skill) => s.metadata.name)).toContain('dev-skill');
    });

    it('deduplicates skills across locations', async () => {
      // Create project skill with same name as bundled
      await mkdir(join(projectDir, '.claude', 'skills', 'bundled-skill'), { recursive: true });
      await writeFile(
        join(projectDir, '.claude', 'skills', 'bundled-skill', 'SKILL.md'),
        `---
name: bundled-skill
description: Project override
---

Project version`
      );

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skills = await library.listSkills();
      const bundledSkills = skills.filter((s: Skill) => s.metadata.name === 'bundled-skill');

      expect(bundledSkills).toHaveLength(1);
      expect(bundledSkills[0].metadata.description).toBe('Project override');
    });
  });

  describe('installSkill', () => {
    it('installs a skill to project location', async () => {
      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skill = await library.loadSkill('bundled-skill');
      await library.installSkill(skill, { location: 'project' });

      const installedContent = await readFile(
        join(projectDir, '.claude', 'skills', 'bundled-skill', 'SKILL.md'),
        'utf-8'
      );

      expect(installedContent).toContain('name: bundled-skill');
      expect(installedContent).toContain('Bundled skill content');
    });

    it('copies supporting files', async () => {
      // Add supporting file to bundled skill
      await mkdir(join(bundledDir, 'bundled-skill', 'examples'), { recursive: true });
      await writeFile(
        join(bundledDir, 'bundled-skill', 'examples', 'example.md'),
        '# Example'
      );

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      const skill = await library.loadSkill('bundled-skill');
      await library.installSkill(skill, { location: 'project' });

      const exampleContent = await readFile(
        join(projectDir, '.claude', 'skills', 'bundled-skill', 'examples', 'example.md'),
        'utf-8'
      );

      expect(exampleContent).toBe('# Example');
    });
  });

  describe('extendProject', () => {
    it('installs skills and updates CLAUDE.md', async () => {
      // Create initial CLAUDE.md
      await writeFile(join(projectDir, 'CLAUDE.md'), '# Project\n\nSome content.');

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      await library.extendProject(['bundled-skill']);

      // Check skill was installed
      const skillContent = await readFile(
        join(projectDir, '.claude', 'skills', 'bundled-skill', 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).toContain('bundled-skill');

      // Check CLAUDE.md was updated
      const claudeContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('## Installed Skills');
      expect(claudeContent).toContain('@.claude/skills/bundled-skill/SKILL.md');
    });

    it('creates CLAUDE.md if it does not exist', async () => {
      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      await library.extendProject(['bundled-skill']);

      const claudeContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('## Installed Skills');
      expect(claudeContent).toContain('@.claude/skills/bundled-skill/SKILL.md');
    });
  });

  describe('createProject', () => {
    it('creates project structure from template', async () => {
      const targetDir = join(tempDir, 'new-project');

      const library = createSkillsLibrary({
        cwd: projectDir,
        skillsDir: bundledDir
      });

      await library.createProject(
        {
          name: 'test-template',
          description: 'Test template',
          skills: ['bundled-skill'],
          claudemd: '# Test Project\n\nGenerated from template.',
          structure: [
            { path: 'src', type: 'directory', content: '' },
            { path: 'src/index.ts', type: 'file', content: 'export const x = 1;' }
          ]
        },
        targetDir
      );

      // Check CLAUDE.md
      const claudeContent = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('# Test Project');

      // Check file structure
      const indexContent = await readFile(join(targetDir, 'src', 'index.ts'), 'utf-8');
      expect(indexContent).toBe('export const x = 1;');

      // Check skill was installed
      const skillContent = await readFile(
        join(targetDir, '.claude', 'skills', 'bundled-skill', 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).toContain('bundled-skill');
    });
  });
});
