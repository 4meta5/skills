import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { trackProjectInstallation, getProjectInstallation, trackInstalledSkill } from '../config.js';

describe('remove command', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'skills-remove-test-'));
    // Create target project structure with a skill installed
    await mkdir(join(targetDir, '.claude', 'skills', 'test-skill'), { recursive: true });
    await writeFile(
      join(targetDir, '.claude', 'skills', 'test-skill', 'SKILL.md'),
      '---\nname: test-skill\ndescription: A test skill\n---\n\n# Test Skill\n',
      'utf-8'
    );
    // Create CLAUDE.md with skill reference
    await writeFile(
      join(targetDir, 'CLAUDE.md'),
      '# Test Project\n\n## Installed Skills\n- @.claude/skills/test-skill/SKILL.md\n- @.claude/skills/other-skill/SKILL.md\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('removeCommand', () => {
    it('should remove skill directory from project', async () => {
      const { removeCommand } = await import('./remove.js');

      await removeCommand(['test-skill'], { cwd: targetDir });

      // Verify skill directory was removed
      const skillsDir = join(targetDir, '.claude', 'skills');
      const remaining = await readdir(skillsDir);
      expect(remaining).not.toContain('test-skill');
    });

    it('should update CLAUDE.md to remove skill reference', async () => {
      const { removeCommand } = await import('./remove.js');

      await removeCommand(['test-skill'], { cwd: targetDir });

      // Verify CLAUDE.md was updated
      const claudeMd = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeMd).not.toContain('test-skill');
      expect(claudeMd).toContain('other-skill'); // Other skills should remain
    });

    it('should handle non-existent skill gracefully', async () => {
      const { removeCommand } = await import('./remove.js');

      // Should not throw
      await expect(
        removeCommand(['non-existent-skill'], { cwd: targetDir })
      ).resolves.not.toThrow();
    });

    it('should remove multiple skills at once', async () => {
      const { removeCommand } = await import('./remove.js');

      // Add another skill
      await mkdir(join(targetDir, '.claude', 'skills', 'another-skill'), { recursive: true });
      await writeFile(
        join(targetDir, '.claude', 'skills', 'another-skill', 'SKILL.md'),
        '---\nname: another-skill\ndescription: Another test skill\n---\n\n# Another Skill\n',
        'utf-8'
      );

      await removeCommand(['test-skill', 'another-skill'], { cwd: targetDir });

      const skillsDir = join(targetDir, '.claude', 'skills');
      const remaining = await readdir(skillsDir);
      expect(remaining).not.toContain('test-skill');
      expect(remaining).not.toContain('another-skill');
    });

    it('should untrack project installation when removing skill', async () => {
      const { removeCommand } = await import('./remove.js');

      // First, track the skill as installed (simulating what add command does)
      await trackProjectInstallation(targetDir, 'test-skill', 'skill');
      await trackProjectInstallation(targetDir, 'other-skill', 'skill');

      // Track in global installed list too
      await trackInstalledSkill({
        name: 'test-skill',
        source: 'bundled',
        installedAt: new Date().toISOString()
      });

      // Verify it was tracked
      let installation = await getProjectInstallation(targetDir);
      expect(installation?.skills).toContain('test-skill');

      // Now remove the skill
      await removeCommand(['test-skill'], { cwd: targetDir });

      // Verify skill was untracked from project
      installation = await getProjectInstallation(targetDir);
      expect(installation?.skills).not.toContain('test-skill');
      expect(installation?.skills).toContain('other-skill');
    });

    it('should untrack from global installed list when removing skill', async () => {
      const { removeCommand } = await import('./remove.js');
      const { getInstalledSkills } = await import('../config.js');

      // Track the skill as installed
      await trackInstalledSkill({
        name: 'test-skill',
        source: 'bundled',
        installedAt: new Date().toISOString()
      });

      // Verify it was tracked
      let installed = await getInstalledSkills();
      expect(installed.some(s => s.name === 'test-skill')).toBe(true);

      // Remove the skill
      await removeCommand(['test-skill'], { cwd: targetDir });

      // Verify skill was untracked from global list
      installed = await getInstalledSkills();
      expect(installed.some(s => s.name === 'test-skill')).toBe(false);
    });
  });
});
