import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getProjectInstallation } from '../config.js';

// We'll test the addCommand function with --cwd option
// For now, just test that the option is accepted

describe('add command', () => {
  let testDir: string;
  let targetDir: string;

  beforeEach(async () => {
    // Create temp directories for testing
    testDir = await mkdtemp(join(tmpdir(), 'skills-add-test-'));
    targetDir = await mkdtemp(join(tmpdir(), 'skills-target-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('--cwd option', () => {
    it('should install skills to specified directory instead of cwd', async () => {
      // This test verifies that skills are installed to the --cwd path
      // not to process.cwd()

      // For this test to work, we need to:
      // 1. Have a bundled skill available
      // 2. Call addCommand with cwd option pointing to targetDir
      // 3. Verify the skill appears in targetDir/.claude/skills/

      // Import after setup to avoid module-level side effects
      const { addCommand } = await import('./add.js');

      // Create target project structure
      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Try to add a bundled skill with cwd option
      // Using 'tdd' which exists in bundled skills
      try {
        await addCommand(['tdd'], { cwd: targetDir });

        // Check if skill was installed to targetDir
        const skillsDir = join(targetDir, '.claude', 'skills');
        const installed = await readdir(skillsDir);

        expect(installed).toContain('tdd');
      } catch (error) {
        // If cwd option doesn't exist, addCommand will ignore it
        // and install to process.cwd() instead
        // Check if skill ended up in wrong place (cwd instead of targetDir)
        const targetSkillsDir = join(targetDir, '.claude', 'skills');
        const targetInstalled = await readdir(targetSkillsDir).catch(() => []);

        // Test fails if skill is NOT in target directory
        expect(targetInstalled).toContain('tdd');
      }
    });

    it('should track project installation when adding skill', async () => {
      // Import after setup to avoid module-level side effects
      const { addCommand } = await import('./add.js');

      // Create target project structure
      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Add a skill with cwd option
      await addCommand(['tdd'], { cwd: targetDir });

      // Check if project installation was tracked
      const installation = await getProjectInstallation(targetDir);

      expect(installation).toBeDefined();
      expect(installation?.skills).toContain('tdd');
    });

    it('should track multiple skills in same project', async () => {
      const { addCommand } = await import('./add.js');

      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Add two skills
      await addCommand(['tdd'], { cwd: targetDir });
      await addCommand(['no-workarounds'], { cwd: targetDir });

      const installation = await getProjectInstallation(targetDir);

      expect(installation?.skills).toContain('tdd');
      expect(installation?.skills).toContain('no-workarounds');
    });

    it('should not duplicate skill references when adding same skill twice', async () => {
      const { addCommand } = await import('./add.js');

      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Add same skill twice
      await addCommand(['tdd'], { cwd: targetDir });
      await addCommand(['tdd'], { cwd: targetDir });

      // Read CLAUDE.md and count references
      const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      const matches = content.match(/@\.claude\/skills\/tdd\/SKILL\.md/g);

      // Should only have ONE reference, not two
      expect(matches?.length).toBe(1);
    });

    it('should preserve user content when updating CLAUDE.md', async () => {
      const { addCommand } = await import('./add.js');

      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(
        join(targetDir, 'CLAUDE.md'),
        `# My Custom Project

This is my custom intro that should not be modified.

## Custom Commands
- npm run my-custom-command

## Installed Skills
- @.claude/skills/existing-skill/SKILL.md

## Additional Notes
These notes should also remain.
`,
        'utf-8'
      );

      // Add a skill
      await addCommand(['tdd'], { cwd: targetDir });

      const content = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');

      // User content should be preserved
      expect(content).toContain('This is my custom intro');
      expect(content).toContain('npm run my-custom-command');
      expect(content).toContain('These notes should also remain');
    });

    it('should install skill from source project to target project when skill only exists in source', async () => {
      // BUG: When using -C to install to a different directory,
      // the add command looks for skills in the TARGET directory instead of the SOURCE.
      // This means skills that exist in the current project but not in the target
      // will fail to be found.

      const { addCommand } = await import('./add.js');

      // Create a "source" project with a skill
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      try {
        await mkdir(join(sourceDir, '.claude', 'skills', 'my-local-skill'), { recursive: true });
        await writeFile(
          join(sourceDir, '.claude', 'skills', 'my-local-skill', 'SKILL.md'),
          `---
name: my-local-skill
description: A skill that only exists in the source project
category: testing
---

# My Local Skill

This skill only exists in the source project.
`,
          'utf-8'
        );

        // Create target project structure
        await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
        await writeFile(join(targetDir, 'CLAUDE.md'), '# Target Project\n\n## Installed Skills\n');

        // Change to source directory and install to target
        const originalCwd = process.cwd();
        process.chdir(sourceDir);
        try {
          await addCommand(['my-local-skill'], { cwd: targetDir });

          // The skill should be installed to targetDir
          const targetSkillsDir = join(targetDir, '.claude', 'skills');
          const installed = await readdir(targetSkillsDir);

          expect(installed).toContain('my-local-skill');

          // Verify the skill content was copied
          const skillContent = await readFile(
            join(targetSkillsDir, 'my-local-skill', 'SKILL.md'),
            'utf-8'
          );
          expect(skillContent).toContain('A skill that only exists in the source project');
        } finally {
          process.chdir(originalCwd);
        }
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });
  });

  describe('add command slop detection', () => {
    it('should reject adding skills that match test-skill-* pattern', async () => {
      const { addCommand } = await import('./add.js');

      // Create target project structure
      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Create a slop skill in source directory
      const slopSkillName = `test-skill-${Date.now()}`;
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-add-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', slopSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', slopSkillName, 'SKILL.md'),
        `---\nname: ${slopSkillName}\ndescription: Slop skill\n---\n\n# Slop`,
        'utf-8'
      );

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      const originalError = console.error;
      console.log = (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' '));
      console.error = (...args: unknown[]) => logs.push('ERROR: ' + args.map(a => String(a)).join(' '));

      const originalCwd = process.cwd();
      process.chdir(sourceDir);

      try {
        await addCommand([slopSkillName], { cwd: targetDir });

        // Should have logged that slop was detected
        const slopMessage = logs.some(log =>
          log.toLowerCase().includes('slop')
        );
        expect(slopMessage).toBe(true);

        // Target project should NOT have the skill installed
        const skillsDir = join(targetDir, '.claude', 'skills');
        const installed = await readdir(skillsDir);
        expect(installed).not.toContain(slopSkillName);
      } finally {
        process.chdir(originalCwd);
        console.log = originalLog;
        console.error = originalError;
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should allow adding legitimate skills alongside skipping slop', async () => {
      const { addCommand } = await import('./add.js');

      await mkdir(join(targetDir, '.claude', 'skills'), { recursive: true });
      await writeFile(join(targetDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n');

      // Create source with legit skill and slop skill
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-add-source-'));

      // Legitimate skill
      const legitSkillName = 'legit-add-skill';
      await mkdir(join(sourceDir, '.claude', 'skills', legitSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', legitSkillName, 'SKILL.md'),
        `---\nname: ${legitSkillName}\ndescription: Legitimate skill\n---\n\n# Legit`,
        'utf-8'
      );

      // Slop skill
      const slopSkillName = `test-skill-${Date.now()}`;
      await mkdir(join(sourceDir, '.claude', 'skills', slopSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', slopSkillName, 'SKILL.md'),
        `---\nname: ${slopSkillName}\ndescription: Slop\n---\n\n# Slop`,
        'utf-8'
      );

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.map(a => String(a)).join(' '));

      const originalCwd = process.cwd();
      process.chdir(sourceDir);

      try {
        await addCommand([legitSkillName, slopSkillName], { cwd: targetDir });

        // Should have logged slop warning
        const slopMessage = logs.some(log => log.toLowerCase().includes('slop'));
        expect(slopMessage).toBe(true);

        // Legit skill should be installed
        const skillsDir = join(targetDir, '.claude', 'skills');
        const installed = await readdir(skillsDir);
        expect(installed).toContain(legitSkillName);

        // Slop skill should NOT be installed
        expect(installed).not.toContain(slopSkillName);
      } finally {
        process.chdir(originalCwd);
        console.log = originalLog;
        await rm(sourceDir, { recursive: true, force: true });
      }
    });
  });
});
