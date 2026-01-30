import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('claudemd command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claudemd-cmd-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('claudemdCommand', () => {
    it('should list skill references from CLAUDE.md', async () => {
      // Create CLAUDE.md with skill references
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '## Installed Skills\n- @.claude/skills/tdd/SKILL.md\n- @.claude/skills/no-workarounds/SKILL.md\n',
        'utf-8'
      );

      const { claudemdCommand } = await import('./claudemd.js');

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await claudemdCommand('list', [], { cwd: tempDir });
      } finally {
        console.log = originalLog;
      }

      expect(logs.some(l => l.includes('tdd'))).toBe(true);
      expect(logs.some(l => l.includes('no-workarounds'))).toBe(true);
    });

    it('should validate CLAUDE.md and report issues', async () => {
      // Create CLAUDE.md with malformed references
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        `## Installed Skills
- @.claude/skills/valid-skill/SKILL.md
- invalid line here
- missing slash SKILL.md
`,
        'utf-8'
      );

      const { claudemdCommand } = await import('./claudemd.js');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await claudemdCommand('validate', [], { cwd: tempDir });
      } finally {
        console.log = originalLog;
      }

      // Should report valid skills
      expect(logs.some(l => l.includes('valid-skill'))).toBe(true);
      // Should report issues (case-insensitive check)
      expect(logs.some(l => l.toLowerCase().includes('warning') || l.toLowerCase().includes('malformed'))).toBe(true);
    });

    it('should sync CLAUDE.md with installed skills', async () => {
      // Create CLAUDE.md with outdated references
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '## Installed Skills\n- @.claude/skills/old-skill/SKILL.md\n',
        'utf-8'
      );

      // Create actual skill directory (different from what's in CLAUDE.md)
      await mkdir(join(tempDir, '.claude', 'skills', 'new-skill'), { recursive: true });
      await writeFile(
        join(tempDir, '.claude', 'skills', 'new-skill', 'SKILL.md'),
        '---\nname: new-skill\ndescription: A new skill\n---\n\n# New Skill\n',
        'utf-8'
      );

      const { claudemdCommand } = await import('./claudemd.js');

      await claudemdCommand('sync', [], { cwd: tempDir });

      // Read updated CLAUDE.md
      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('new-skill');
      expect(content).not.toContain('old-skill');
    });

    it('should add skill reference via CLI', async () => {
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '# My Project\n',
        'utf-8'
      );

      const { claudemdCommand } = await import('./claudemd.js');

      await claudemdCommand('add', ['tdd'], { cwd: tempDir });

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).toContain('- @.claude/skills/tdd/SKILL.md');
    });

    it('should remove skill reference via CLI', async () => {
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        '## Installed Skills\n- @.claude/skills/tdd/SKILL.md\n- @.claude/skills/other/SKILL.md\n',
        'utf-8'
      );

      const { claudemdCommand } = await import('./claudemd.js');

      await claudemdCommand('remove', ['tdd'], { cwd: tempDir });

      const content = await readFile(join(tempDir, 'CLAUDE.md'), 'utf-8');
      expect(content).not.toContain('tdd');
      expect(content).toContain('other');
    });

    it('should show help for unknown subcommand', async () => {
      const { claudemdCommand } = await import('./claudemd.js');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await claudemdCommand('unknown', [], { cwd: tempDir });
      } finally {
        console.log = originalLog;
      }

      expect(logs.some(l => l.includes('Usage') || l.includes('help') || l.includes('unknown'))).toBe(true);
    });

    it('should handle missing CLAUDE.md gracefully', async () => {
      const { claudemdCommand } = await import('./claudemd.js');

      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args) => logs.push(args.join(' '));

      try {
        await claudemdCommand('list', [], { cwd: tempDir });
      } finally {
        console.log = originalLog;
      }

      // Should indicate no file or no skills
      expect(logs.some(l =>
        l.includes('No CLAUDE.md') ||
        l.includes('No skills') ||
        l.includes('0 skills') ||
        l.includes('empty')
      )).toBe(true);
    });
  });
});
