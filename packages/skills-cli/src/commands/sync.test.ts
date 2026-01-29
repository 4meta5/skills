import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { trackProjectInstallation, getProjectInstallation, untrackProjectInstallation, loadConfig, saveConfig } from '../config.js';

describe('sync command', () => {
  let projectA: string;
  let projectB: string;
  let sourceSkillContent: string;
  // Use a unique skill name per test run to avoid conflicts
  let testSkillName: string;

  beforeEach(async () => {
    testSkillName = `test-skill-${Date.now()}`;

    // Create two temporary project directories
    projectA = await mkdtemp(join(tmpdir(), 'skills-sync-project-a-'));
    projectB = await mkdtemp(join(tmpdir(), 'skills-sync-project-b-'));

    // Create skill structure in both projects with OLD content
    const oldContent = `---
name: ${testSkillName}
description: A test skill
---

# Test Skill

Old content here.
`;

    for (const projectDir of [projectA, projectB]) {
      await mkdir(join(projectDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(projectDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        oldContent,
        'utf-8'
      );

      // Track the skill as installed in this project
      await trackProjectInstallation(projectDir, testSkillName, 'skill');
    }

    // New content that represents the "source" update
    sourceSkillContent = `---
name: ${testSkillName}
description: A test skill with new features
---

# Test Skill

NEW content with improvements!
`;
  });

  afterEach(async () => {
    // Clean up project tracking
    await untrackProjectInstallation(projectA, testSkillName, 'skill');
    await untrackProjectInstallation(projectB, testSkillName, 'skill');
    await rm(projectA, { recursive: true, force: true });
    await rm(projectB, { recursive: true, force: true });
  });

  describe('syncCommand', () => {
    it('should sync specific skill to all tracked projects', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a mock source skill location
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Sync the skill
        await syncCommand([testSkillName], { cwd: sourceDir });

        // Verify both projects got the update
        const contentA = await readFile(
          join(projectA, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );
        const contentB = await readFile(
          join(projectB, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );

        expect(contentA).toContain('NEW content with improvements!');
        expect(contentB).toContain('NEW content with improvements!');
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should show what would be updated with --dry-run', async () => {
      const { syncCommand } = await import('./sync.js');

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Dry run should not modify files
        await syncCommand([testSkillName], { cwd: sourceDir, dryRun: true });

        // Files should still have old content
        const contentA = await readFile(
          join(projectA, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );

        expect(contentA).toContain('Old content here.');
        expect(contentA).not.toContain('NEW content with improvements!');
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should skip projects that do not have the skill installed', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a third project without the skill
      const projectC = await mkdtemp(join(tmpdir(), 'skills-sync-project-c-'));
      await mkdir(join(projectC, '.claude', 'skills'), { recursive: true });
      // Track a different skill (unique to this test)
      const otherSkillName = `other-skill-${Date.now()}`;
      await trackProjectInstallation(projectC, otherSkillName, 'skill');

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Sync should work without errors even though projectC doesn't have the skill
        await expect(syncCommand([testSkillName], { cwd: sourceDir })).resolves.not.toThrow();

        // projectC should NOT have the skill directory
        const cSkillsDir = join(projectC, '.claude', 'skills');
        const cFiles = await readdir(cSkillsDir);
        expect(cFiles).not.toContain(testSkillName);
      } finally {
        await untrackProjectInstallation(projectC, otherSkillName, 'skill');
        await rm(projectC, { recursive: true, force: true });
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should update lastUpdated timestamp after sync', async () => {
      const { syncCommand } = await import('./sync.js');

      // Get initial timestamp
      const initialInstallation = await getProjectInstallation(projectA);
      const initialTimestamp = initialInstallation?.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        await syncCommand([testSkillName], { cwd: sourceDir });

        const updatedInstallation = await getProjectInstallation(projectA);
        expect(updatedInstallation?.lastUpdated).not.toBe(initialTimestamp);
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });
  });
});
