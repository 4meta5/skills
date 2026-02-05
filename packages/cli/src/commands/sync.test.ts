import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { trackProjectInstallation, getProjectInstallation, untrackProjectInstallation, loadConfig, saveConfig } from '../config.js';

describe('sync command', () => {
  let projectA: string;
  let projectB: string;
  let sourceSkillContent: string;
  // Use test-skill-* pattern - sync does NOT filter by name
  // Isolation comes from temp directories, not name patterns
  // Slop detection is for hygiene commands only, not sync
  let testSkillName: string;

  beforeEach(async () => {
    testSkillName = `test-skill-${Math.random().toString(36).slice(2, 8)}`;

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

    it('should throw in test mode when target project is outside SKILLS_TEST_ROOT', async () => {
      const { syncCommand } = await import('./sync.js');

      const outsideProject = join(process.cwd(), `skills-non-tmp-${Date.now()}`);
      await trackProjectInstallation(outsideProject, testSkillName, 'skill');

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        await expect(
          syncCommand([testSkillName], { cwd: sourceDir, push: true, dryRun: true })
        ).rejects.toThrow(/test/i);
      } finally {
        await untrackProjectInstallation(outsideProject, testSkillName, 'skill');
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should include action description in test mode error message (not undefined)', async () => {
      const { syncCommand } = await import('./sync.js');

      const outsideProject = join(process.cwd(), `skills-non-tmp-${Date.now()}`);
      await trackProjectInstallation(outsideProject, testSkillName, 'skill');

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // The error message should contain a real action like "sync" not "undefined"
        await expect(
          syncCommand([testSkillName], { cwd: sourceDir, push: true })
        ).rejects.toThrow(/refusing to sync/i);
      } finally {
        await untrackProjectInstallation(outsideProject, testSkillName, 'skill');
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
      const otherSkillName = `other-skill-${Math.random().toString(36).slice(2, 8)}`;
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

    it('should skip the source project when it is also a tracked project', async () => {
      const { syncCommand } = await import('./sync.js');

      // Use projectA as BOTH the source AND a tracked project
      // This simulates the real-world scenario where we run sync from within
      // a project that is also tracked (e.g., skills-cli project itself)
      const sourceDir = projectA;

      // Update the skill content in projectA (the source)
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      // This should NOT throw an error about "src and dest cannot be the same"
      // It should skip projectA and only sync to projectB
      await expect(syncCommand([testSkillName], { cwd: sourceDir })).resolves.not.toThrow();

      // projectB should have the updated content
      const contentB = await readFile(
        join(projectB, '.claude', 'skills', testSkillName, 'SKILL.md'),
        'utf-8'
      );
      expect(contentB).toContain('NEW content with improvements!');
    });
  });

  describe('syncCommand with --push', () => {
    it('should install skill to projects that do not have it when using --push', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a third project WITHOUT the skill
      const projectC = await mkdtemp(join(tmpdir(), 'skills-sync-project-c-'));
      await mkdir(join(projectC, '.claude', 'skills'), { recursive: true });

      // Track projectC with a different skill so it appears in tracked projects
      const otherSkillName = `other-skill-${Math.random().toString(36).slice(2, 8)}`;
      await mkdir(join(projectC, '.claude', 'skills', otherSkillName), { recursive: true });
      await writeFile(
        join(projectC, '.claude', 'skills', otherSkillName, 'SKILL.md'),
        `---\nname: ${otherSkillName}\ndescription: Another skill\n---\n\n# Other`,
        'utf-8'
      );
      await trackProjectInstallation(projectC, otherSkillName, 'skill');

      // Create source directory with the skill to push
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Sync with --push should install to projectC even though it doesn't have the skill
        await syncCommand([testSkillName], { cwd: sourceDir, push: true });

        // Verify projectC now has the skill
        const contentC = await readFile(
          join(projectC, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );
        expect(contentC).toContain('NEW content with improvements!');

        // Verify skill is tracked in projectC
        const installation = await getProjectInstallation(projectC);
        expect(installation?.skills).toContain(testSkillName);
      } finally {
        await untrackProjectInstallation(projectC, otherSkillName, 'skill');
        await untrackProjectInstallation(projectC, testSkillName, 'skill');
        await rm(projectC, { recursive: true, force: true });
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should respect existing skills in target project when using --push', async () => {
      const { syncCommand } = await import('./sync.js');

      // projectA already has testSkillName, so --push should update it, not duplicate
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Get initial skill count for projectA
        const initialInstallation = await getProjectInstallation(projectA);
        const initialSkillCount = initialInstallation?.skills.length || 0;

        // Sync with --push
        await syncCommand([testSkillName], { cwd: sourceDir, push: true });

        // Verify content was updated
        const contentA = await readFile(
          join(projectA, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );
        expect(contentA).toContain('NEW content with improvements!');

        // Verify skill count hasn't increased (no duplicates)
        const updatedInstallation = await getProjectInstallation(projectA);
        expect(updatedInstallation?.skills.filter(s => s === testSkillName).length).toBe(1);
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should update CLAUDE.md in target project when using --push', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a project without the skill and with a CLAUDE.md
      const projectD = await mkdtemp(join(tmpdir(), 'skills-sync-project-d-'));
      await mkdir(join(projectD, '.claude', 'skills'), { recursive: true });

      // Create initial CLAUDE.md
      const initialClaudeMd = `# Project D

Some project documentation.

## Installed Skills
- @.claude/skills/existing-skill/SKILL.md
`;
      await writeFile(join(projectD, 'CLAUDE.md'), initialClaudeMd, 'utf-8');

      // Track projectD with a placeholder skill so it appears in tracked projects
      const placeholderSkill = `placeholder-${Math.random().toString(36).slice(2, 8)}`;
      await mkdir(join(projectD, '.claude', 'skills', placeholderSkill), { recursive: true });
      await writeFile(
        join(projectD, '.claude', 'skills', placeholderSkill, 'SKILL.md'),
        `---\nname: ${placeholderSkill}\ndescription: Placeholder\n---\n\n# Placeholder`,
        'utf-8'
      );
      await trackProjectInstallation(projectD, placeholderSkill, 'skill');

      // Create source with the skill to push
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Push the skill to projectD
        await syncCommand([testSkillName], { cwd: sourceDir, push: true });

        // Verify CLAUDE.md was updated with the new skill reference
        const updatedClaudeMd = await readFile(join(projectD, 'CLAUDE.md'), 'utf-8');
        expect(updatedClaudeMd).toContain(`@.claude/skills/${testSkillName}/SKILL.md`);
        // Should still have the existing skill
        expect(updatedClaudeMd).toContain('@.claude/skills/existing-skill/SKILL.md');
      } finally {
        await untrackProjectInstallation(projectD, placeholderSkill, 'skill');
        await untrackProjectInstallation(projectD, testSkillName, 'skill');
        await rm(projectD, { recursive: true, force: true });
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should sync bundled skills that exist in library but not in local .claude/skills', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a target project that has a skill installed
      const targetProject = await mkdtemp(join(tmpdir(), 'skills-target-'));
      const bundledSkillName = 'code-review'; // This exists in packages/skills-library/skills/

      await mkdir(join(targetProject, '.claude', 'skills', bundledSkillName), { recursive: true });
      await writeFile(
        join(targetProject, '.claude', 'skills', bundledSkillName, 'SKILL.md'),
        `---\nname: ${bundledSkillName}\ndescription: Old version\n---\n\n# Old content`,
        'utf-8'
      );
      await trackProjectInstallation(targetProject, bundledSkillName, 'skill');

      // Create source directory WITHOUT the bundled skill in .claude/skills/
      // The skill only exists in the bundled library (packages/skills-library/skills/)
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills'), { recursive: true });
      // Note: bundledSkillName is NOT in sourceDir/.claude/skills/
      // But it SHOULD be found in the bundled skills library

      try {
        // Sync should work because the skill exists in bundled library
        // This currently crashes with ENOENT because it tries to copy from .claude/skills/
        await expect(syncCommand([bundledSkillName], { cwd: sourceDir })).resolves.not.toThrow();

        // Verify the skill was synced from the bundled library
        const content = await readFile(
          join(targetProject, '.claude', 'skills', bundledSkillName, 'SKILL.md'),
          'utf-8'
        );
        // The bundled skill has different content than our "Old content"
        expect(content).not.toContain('Old content');
      } finally {
        await untrackProjectInstallation(targetProject, bundledSkillName, 'skill');
        await rm(targetProject, { recursive: true, force: true });
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should gracefully skip skills that do not exist in source', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create source directory WITHOUT the skill we're trying to sync
      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills'), { recursive: true });
      // Note: testSkillName does NOT exist in sourceDir

      try {
        // Sync should NOT crash when source skill doesn't exist
        // It should log an error message and continue
        await expect(syncCommand([testSkillName], { cwd: sourceDir })).resolves.not.toThrow();
      } finally {
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should gracefully handle non-existent target project directories', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create and track a project, then delete it to simulate stale tracking
      const staleProject = await mkdtemp(join(tmpdir(), 'skills-stale-project-'));
      await mkdir(join(staleProject, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(staleProject, '.claude', 'skills', testSkillName, 'SKILL.md'),
        `---\nname: ${testSkillName}\ndescription: Test\n---\n\n# Test`,
        'utf-8'
      );
      await trackProjectInstallation(staleProject, testSkillName, 'skill');

      // Delete the project directory to simulate stale tracking
      await rm(staleProject, { recursive: true, force: true });

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Sync should NOT crash when tracked project directory doesn't exist
        await expect(syncCommand([testSkillName], { cwd: sourceDir })).resolves.not.toThrow();

        // Other projects (projectA, projectB) should still get updated
        const contentA = await readFile(
          join(projectA, '.claude', 'skills', testSkillName, 'SKILL.md'),
          'utf-8'
        );
        expect(contentA).toContain('NEW content with improvements!');
      } finally {
        await untrackProjectInstallation(staleProject, testSkillName, 'skill');
        await rm(sourceDir, { recursive: true, force: true });
      }
    });

    it('should work with --push and --dry-run together', async () => {
      const { syncCommand } = await import('./sync.js');

      // Create a project without the skill
      const projectE = await mkdtemp(join(tmpdir(), 'skills-sync-project-e-'));
      await mkdir(join(projectE, '.claude', 'skills'), { recursive: true });

      // Track projectE with a placeholder skill
      const placeholderSkill = `placeholder-${Math.random().toString(36).slice(2, 8)}`;
      await mkdir(join(projectE, '.claude', 'skills', placeholderSkill), { recursive: true });
      await writeFile(
        join(projectE, '.claude', 'skills', placeholderSkill, 'SKILL.md'),
        `---\nname: ${placeholderSkill}\ndescription: Placeholder\n---\n\n# Placeholder`,
        'utf-8'
      );
      await trackProjectInstallation(projectE, placeholderSkill, 'skill');

      const sourceDir = await mkdtemp(join(tmpdir(), 'skills-source-'));
      await mkdir(join(sourceDir, '.claude', 'skills', testSkillName), { recursive: true });
      await writeFile(
        join(sourceDir, '.claude', 'skills', testSkillName, 'SKILL.md'),
        sourceSkillContent,
        'utf-8'
      );

      try {
        // Push with dry-run should NOT create the skill
        await syncCommand([testSkillName], { cwd: sourceDir, push: true, dryRun: true });

        // Verify skill was NOT installed
        let skillExists = false;
        try {
          await stat(join(projectE, '.claude', 'skills', testSkillName, 'SKILL.md'));
          skillExists = true;
        } catch {
          skillExists = false;
        }
        expect(skillExists).toBe(false);

        // Verify skill is NOT tracked
        const installation = await getProjectInstallation(projectE);
        expect(installation?.skills).not.toContain(testSkillName);
      } finally {
        await untrackProjectInstallation(projectE, placeholderSkill, 'skill');
        await rm(projectE, { recursive: true, force: true });
        await rm(sourceDir, { recursive: true, force: true });
      }
    });
  });

  // Note: Sync does NOT filter by skill name. Slop detection is for hygiene commands.
  // Test isolation comes from temp directories, not name-based filtering.
  // If tests fail to clean up, 'skills hygiene clean' will catch any leaked artifacts.
});
