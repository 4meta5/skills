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
  });
});
