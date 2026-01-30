import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import functions to test (these don't exist yet - tests will fail)
import {
  migrateCommand,
  analyzeSkillsForMigration,
  type MigrationPlan,
  type MigrationResult
} from './migrate.js';

describe('migrate command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skills-migrate-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('analyzeSkillsForMigration', () => {
    it('should identify skills without provenance as custom', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'my-custom-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'my-custom-skill', 'SKILL.md'),
        `---
name: my-custom-skill
description: A skill I created myself
---

# My Custom Skill
`,
        'utf-8'
      );

      const plan = await analyzeSkillsForMigration(tempDir);

      expect(plan.custom.length).toBe(1);
      expect(plan.custom[0].name).toBe('my-custom-skill');
      expect(plan.upstream.length).toBe(0);
    });

    it('should identify skills with git provenance as upstream', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      const skillDir = join(skillsDir, 'upstream-skill');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        `---
name: upstream-skill
description: A skill from a git repo
---

# Upstream Skill
`,
        'utf-8'
      );
      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify({
          source: {
            type: 'git',
            url: 'https://github.com/owner/repo',
            commit: 'abc1234'
          },
          installed: {
            at: '2026-01-30T15:00:00Z',
            by: 'skills-cli@1.0.0'
          }
        }),
        'utf-8'
      );

      const plan = await analyzeSkillsForMigration(tempDir);

      expect(plan.upstream.length).toBe(1);
      expect(plan.upstream[0].name).toBe('upstream-skill');
      expect(plan.custom.length).toBe(0);
    });

    it('should identify _temp_ prefixed skills for rename', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, '_temp_my-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, '_temp_my-skill', 'SKILL.md'),
        `---
name: _temp_my-skill
description: A temporary skill that needs renaming
---

# My Skill
`,
        'utf-8'
      );

      const plan = await analyzeSkillsForMigration(tempDir);

      expect(plan.needsRename.length).toBe(1);
      expect(plan.needsRename[0].oldName).toBe('_temp_my-skill');
      expect(plan.needsRename[0].newName).toBe('my-skill');
    });

    it('should handle mixed skills', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');

      // Custom skill
      await mkdir(join(skillsDir, 'custom-a'), { recursive: true });
      await writeFile(join(skillsDir, 'custom-a', 'SKILL.md'), '---\nname: custom-a\ndescription: test\n---\n', 'utf-8');

      // Upstream skill
      const upstreamDir = join(skillsDir, 'upstream-b');
      await mkdir(upstreamDir, { recursive: true });
      await writeFile(join(upstreamDir, 'SKILL.md'), '---\nname: upstream-b\ndescription: test\n---\n', 'utf-8');
      await writeFile(
        join(upstreamDir, '.provenance.json'),
        JSON.stringify({ source: { type: 'git', url: 'https://example.com' }, installed: { at: '', by: '' } }),
        'utf-8'
      );

      // _temp_ skill
      await mkdir(join(skillsDir, '_temp_needs-rename'), { recursive: true });
      await writeFile(join(skillsDir, '_temp_needs-rename', 'SKILL.md'), '---\nname: _temp_needs-rename\ndescription: test\n---\n', 'utf-8');

      const plan = await analyzeSkillsForMigration(tempDir);

      expect(plan.custom.length).toBe(1);
      expect(plan.upstream.length).toBe(1);
      expect(plan.needsRename.length).toBe(1);
    });
  });

  describe('migrateCommand', () => {
    it('should create custom/ and upstream/ directories', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'my-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill', 'SKILL.md'),
        '---\nname: my-skill\ndescription: A custom skill\n---\n',
        'utf-8'
      );

      await migrateCommand({ cwd: tempDir, confirm: true });

      // Check directories exist
      const entries = await readdir(skillsDir);
      expect(entries).toContain('custom');
    });

    it('should move custom skills to custom/ directory', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'my-custom'), { recursive: true });
      await writeFile(
        join(skillsDir, 'my-custom', 'SKILL.md'),
        '---\nname: my-custom\ndescription: A custom skill for testing\n---\n',
        'utf-8'
      );

      await migrateCommand({ cwd: tempDir, confirm: true });

      // Skill should be in custom/
      const customSkillPath = join(skillsDir, 'custom', 'my-custom', 'SKILL.md');
      const exists = await stat(customSkillPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Should have provenance
      const provenancePath = join(skillsDir, 'custom', 'my-custom', '.provenance.json');
      const provenance = JSON.parse(await readFile(provenancePath, 'utf-8'));
      expect(provenance.source.type).toBe('custom');
    });

    it('should move upstream skills to upstream/ directory', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      const skillDir = join(skillsDir, 'from-git');
      await mkdir(skillDir, { recursive: true });
      await writeFile(
        join(skillDir, 'SKILL.md'),
        '---\nname: from-git\ndescription: An upstream skill\n---\n',
        'utf-8'
      );
      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify({
          source: { type: 'git', url: 'https://github.com/owner/repo', commit: 'abc' },
          installed: { at: '', by: '' }
        }),
        'utf-8'
      );

      await migrateCommand({ cwd: tempDir, confirm: true });

      // Skill should be in upstream/
      const upstreamSkillPath = join(skillsDir, 'upstream', 'from-git', 'SKILL.md');
      const exists = await stat(upstreamSkillPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('should rename _temp_ prefixed skills', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, '_temp_claude-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, '_temp_claude-skill', 'SKILL.md'),
        '---\nname: _temp_claude-skill\ndescription: Needs rename\n---\n',
        'utf-8'
      );

      await migrateCommand({ cwd: tempDir, confirm: true });

      // Renamed skill should exist (without _temp_ prefix)
      const renamedPath = join(skillsDir, 'custom', 'claude-skill', 'SKILL.md');
      const exists = await stat(renamedPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Old name should not exist
      const oldPath = join(skillsDir, '_temp_claude-skill');
      const oldExists = await stat(oldPath).then(() => true).catch(() => false);
      expect(oldExists).toBe(false);
    });

    it('should support dry-run mode', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'test-skill', 'SKILL.md'),
        '---\nname: test-skill\ndescription: test\n---\n',
        'utf-8'
      );

      const result = await migrateCommand({ cwd: tempDir, dryRun: true });

      // Should have a plan but no changes
      expect(result.plan).toBeDefined();
      expect(result.migrated).toBe(false);

      // Skill should still be in original location
      const entries = await readdir(skillsDir);
      expect(entries).toContain('test-skill');
      expect(entries).not.toContain('custom');
    });

    it('should handle already migrated structure', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'custom', 'existing'), { recursive: true });
      await writeFile(
        join(skillsDir, 'custom', 'existing', 'SKILL.md'),
        '---\nname: existing\ndescription: Already migrated\n---\n',
        'utf-8'
      );

      const result = await migrateCommand({ cwd: tempDir, confirm: true });

      // Should detect already migrated
      expect(result.alreadyMigrated).toBe(true);
    });

    it('should update CLAUDE.md references after migration', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'my-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill', 'SKILL.md'),
        '---\nname: my-skill\ndescription: test\n---\n',
        'utf-8'
      );

      // Create CLAUDE.md with reference
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        `# Project

## Installed Skills
- @.claude/skills/my-skill/SKILL.md
`,
        'utf-8'
      );

      await migrateCommand({ cwd: tempDir, confirm: true });

      // CLAUDE.md should have updated reference
      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('@.claude/skills/custom/my-skill/SKILL.md');
      expect(content).not.toContain('@.claude/skills/my-skill/SKILL.md');
    });
  });

  describe('migration result', () => {
    it('should report migration statistics', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');

      // Create multiple skills
      await mkdir(join(skillsDir, 'custom-1'), { recursive: true });
      await writeFile(join(skillsDir, 'custom-1', 'SKILL.md'), '---\nname: custom-1\ndescription: test\n---\n', 'utf-8');

      await mkdir(join(skillsDir, 'custom-2'), { recursive: true });
      await writeFile(join(skillsDir, 'custom-2', 'SKILL.md'), '---\nname: custom-2\ndescription: test\n---\n', 'utf-8');

      const result = await migrateCommand({ cwd: tempDir, confirm: true });

      expect(result.stats.customMoved).toBe(2);
      expect(result.stats.upstreamMoved).toBe(0);
      expect(result.stats.renamed).toBe(0);
    });
  });
});
