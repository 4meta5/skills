import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import functions to test (these don't exist yet - tests will fail)
import {
  parseClaudeMd,
  addSkillReferences,
  removeSkillReferences,
  syncSkillReferences,
  updateClaudeMd,
  type ClaudeMdParseResult,
  type ClaudeMdUpdateResult
} from './claudemd.js';

describe('claudemd module', () => {
  describe('parseClaudeMd', () => {
    it('should parse empty CLAUDE.md', () => {
      const result = parseClaudeMd('');

      expect(result.hasInstalledSkillsSection).toBe(false);
      expect(result.skillReferences).toEqual([]);
      expect(result.sections).toEqual([]);
    });

    it('should parse CLAUDE.md with no skills section', () => {
      const content = `# My Project

## Development Commands
- npm run build
- npm test

## Notes
Some notes here.
`;
      const result = parseClaudeMd(content);

      expect(result.hasInstalledSkillsSection).toBe(false);
      expect(result.skillReferences).toEqual([]);
      expect(result.sections.map(s => s.title)).toEqual(['Development Commands', 'Notes']);
    });

    it('should parse CLAUDE.md with installed skills section', () => {
      const content = `# My Project

## Installed Skills
- @.claude/skills/tdd/SKILL.md
- @.claude/skills/no-workarounds/SKILL.md

## Notes
Some notes here.
`;
      const result = parseClaudeMd(content);

      expect(result.hasInstalledSkillsSection).toBe(true);
      expect(result.skillReferences).toEqual(['tdd', 'no-workarounds']);
    });

    it('should handle skill references with different formats', () => {
      const content = `## Installed Skills
- @.claude/skills/skill-a/SKILL.md
- .claude/skills/skill-b/SKILL.md
- @.claude/skills/skill-c/SKILL.md - some description
`;
      const result = parseClaudeMd(content);

      // Only standard format should be recognized
      expect(result.skillReferences).toContain('skill-a');
      expect(result.skillReferences).toContain('skill-c');
    });

    it('should identify malformed skill references', () => {
      const content = `## Installed Skills
- @.claude/skills/valid-skill/SKILL.md
- invalid line
- @.claude/skills//SKILL.md
`;
      const result = parseClaudeMd(content);

      expect(result.skillReferences).toEqual(['valid-skill']);
      expect(result.malformedLines).toBeDefined();
      expect(result.malformedLines!.length).toBeGreaterThan(0);
    });
  });

  describe('addSkillReferences', () => {
    it('should add skill reference to existing section', () => {
      const content = `# My Project

## Installed Skills
- @.claude/skills/tdd/SKILL.md

## Notes
Some notes.
`;
      const result = addSkillReferences(content, ['no-workarounds']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['no-workarounds']);
      expect(result.unchanged).toEqual([]);
      expect(result.content).toContain('- @.claude/skills/no-workarounds/SKILL.md');
      expect(result.content).toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should create Installed Skills section if missing', () => {
      const content = `# My Project

## Notes
Some notes.
`;
      const result = addSkillReferences(content, ['tdd']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['tdd']);
      expect(result.content).toContain('## Installed Skills');
      expect(result.content).toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should be idempotent - adding existing skill is no-op', () => {
      const content = `## Installed Skills
- @.claude/skills/tdd/SKILL.md
`;
      const result = addSkillReferences(content, ['tdd']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual([]);
      expect(result.unchanged).toEqual(['tdd']);
      // Content should remain the same (no duplicate)
      const matches = result.content.match(/@\.claude\/skills\/tdd\/SKILL\.md/g);
      expect(matches?.length).toBe(1);
    });

    it('should add multiple skills at once', () => {
      const content = `## Installed Skills
- @.claude/skills/existing/SKILL.md
`;
      const result = addSkillReferences(content, ['skill-a', 'skill-b', 'existing']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['skill-a', 'skill-b']);
      expect(result.unchanged).toEqual(['existing']);
    });

    it('should preserve user content outside Installed Skills section', () => {
      const content = `# My Project

Custom intro paragraph.

## Custom Section
User content here.

## Installed Skills
- @.claude/skills/tdd/SKILL.md

## Another Section
More user content.
`;
      const result = addSkillReferences(content, ['new-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Custom intro paragraph.');
      expect(result.content).toContain('User content here.');
      expect(result.content).toContain('More user content.');
    });

    it('should create CLAUDE.md content from scratch', () => {
      const result = addSkillReferences('', ['tdd', 'no-workarounds']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['tdd', 'no-workarounds']);
      expect(result.content).toContain('## Installed Skills');
      expect(result.content).toContain('- @.claude/skills/tdd/SKILL.md');
      expect(result.content).toContain('- @.claude/skills/no-workarounds/SKILL.md');
    });
  });

  describe('removeSkillReferences', () => {
    it('should remove skill reference from section', () => {
      const content = `## Installed Skills
- @.claude/skills/tdd/SKILL.md
- @.claude/skills/no-workarounds/SKILL.md
`;
      const result = removeSkillReferences(content, ['tdd']);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual(['tdd']);
      expect(result.content).not.toContain('tdd');
      expect(result.content).toContain('no-workarounds');
    });

    it('should be idempotent - removing non-existent skill is no-op', () => {
      const content = `## Installed Skills
- @.claude/skills/tdd/SKILL.md
`;
      const result = removeSkillReferences(content, ['non-existent']);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual(['non-existent']);
    });

    it('should remove multiple skills at once', () => {
      const content = `## Installed Skills
- @.claude/skills/skill-a/SKILL.md
- @.claude/skills/skill-b/SKILL.md
- @.claude/skills/skill-c/SKILL.md
`;
      const result = removeSkillReferences(content, ['skill-a', 'skill-c']);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual(['skill-a', 'skill-c']);
      expect(result.content).not.toContain('skill-a');
      expect(result.content).not.toContain('skill-c');
      expect(result.content).toContain('skill-b');
    });

    it('should clean up empty Installed Skills section', () => {
      const content = `# My Project

## Installed Skills
- @.claude/skills/only-skill/SKILL.md

## Notes
Some notes.
`;
      const result = removeSkillReferences(content, ['only-skill']);

      expect(result.success).toBe(true);
      // Empty section should be removed or left empty (implementation choice)
      expect(result.content).not.toContain('only-skill');
    });

    it('should not affect other sections when removing', () => {
      const content = `# My Project

## Custom Section
Content mentioning tdd for some reason.

## Installed Skills
- @.claude/skills/tdd/SKILL.md
`;
      const result = removeSkillReferences(content, ['tdd']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('Content mentioning tdd for some reason.');
      expect(result.content).not.toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should handle CRLF line endings', () => {
      const content = `## Installed Skills\r\n- @.claude/skills/tdd/SKILL.md\r\n- @.claude/skills/other/SKILL.md\r\n`;
      const result = removeSkillReferences(content, ['tdd']);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual(['tdd']);
    });
  });

  describe('syncSkillReferences', () => {
    it('should add missing skills and remove extra ones', () => {
      const content = `## Installed Skills
- @.claude/skills/old-skill/SKILL.md
- @.claude/skills/keep-skill/SKILL.md
`;
      const installedSkills = ['keep-skill', 'new-skill'];
      const result = syncSkillReferences(content, installedSkills);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['new-skill']);
      expect(result.removed).toEqual(['old-skill']);
      expect(result.content).toContain('keep-skill');
      expect(result.content).toContain('new-skill');
      expect(result.content).not.toContain('old-skill');
    });

    it('should handle empty installed skills (remove all)', () => {
      const content = `## Installed Skills
- @.claude/skills/skill-a/SKILL.md
- @.claude/skills/skill-b/SKILL.md
`;
      const result = syncSkillReferences(content, []);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual(['skill-a', 'skill-b']);
    });

    it('should be idempotent when already in sync', () => {
      const content = `## Installed Skills
- @.claude/skills/skill-a/SKILL.md
- @.claude/skills/skill-b/SKILL.md
`;
      const result = syncSkillReferences(content, ['skill-a', 'skill-b']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
    });
  });

  describe('updateClaudeMd (file operations)', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'claudemd-test-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('should add skills to existing CLAUDE.md', async () => {
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '# My Project\n\n## Notes\nSome notes.\n',
        'utf-8'
      );

      const result = await updateClaudeMd(tempDir, 'add', ['tdd']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['tdd']);

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should create CLAUDE.md if it does not exist', async () => {
      const result = await updateClaudeMd(tempDir, 'add', ['tdd']);

      expect(result.success).toBe(true);
      expect(result.added).toEqual(['tdd']);

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should remove skills from CLAUDE.md', async () => {
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '## Installed Skills\n- @.claude/skills/tdd/SKILL.md\n- @.claude/skills/other/SKILL.md\n',
        'utf-8'
      );

      const result = await updateClaudeMd(tempDir, 'remove', ['tdd']);

      expect(result.success).toBe(true);
      expect(result.removed).toEqual(['tdd']);

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).not.toContain('tdd');
      expect(content).toContain('other');
    });

    it('should sync skills in CLAUDE.md with filesystem', async () => {
      // Create CLAUDE.md with old references
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '## Installed Skills\n- @.claude/skills/old-skill/SKILL.md\n',
        'utf-8'
      );

      // Create actual skill directory
      await mkdir(join(tempDir, '.claude', 'skills', 'new-skill'), { recursive: true });
      await writeFile(
        join(tempDir, '.claude', 'skills', 'new-skill', 'SKILL.md'),
        '---\nname: new-skill\ndescription: A new skill\n---\n\n# New Skill\n',
        'utf-8'
      );

      const result = await updateClaudeMd(tempDir, 'sync', []);

      expect(result.success).toBe(true);

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('new-skill');
      expect(content).not.toContain('old-skill');
    });

    it('should return error details when operation fails', async () => {
      // Create a read-only scenario or invalid path
      const result = await updateClaudeMd('/nonexistent/path/that/does/not/exist', 'add', ['tdd']);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle UTF-8 content', () => {
      const content = `# プロジェクト

## Installed Skills
- @.claude/skills/tdd/SKILL.md

## 説明
日本語のコンテンツ。
`;
      const result = addSkillReferences(content, ['new-skill']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('プロジェクト');
      expect(result.content).toContain('日本語のコンテンツ');
    });

    it('should handle skill names with special characters', () => {
      const content = `## Installed Skills
`;
      // Skill names should be kebab-case
      const result = addSkillReferences(content, ['my-cool-skill-v2']);

      expect(result.success).toBe(true);
      expect(result.content).toContain('my-cool-skill-v2');
    });

    it('should handle very long skill lists', () => {
      const skills = Array.from({ length: 100 }, (_, i) => `skill-${i}`);
      const result = addSkillReferences('', skills);

      expect(result.success).toBe(true);
      expect(result.added.length).toBe(100);
    });

    it('should normalize line endings to LF', () => {
      const content = `## Installed Skills\r\n- @.claude/skills/tdd/SKILL.md\r\n`;
      const result = addSkillReferences(content, ['new-skill']);

      expect(result.success).toBe(true);
      // Should not contain CRLF in output
      expect(result.content).not.toContain('\r\n');
    });
  });
});
