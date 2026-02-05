import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readdir } from 'fs/promises';
import { join, basename } from 'path';
import { tmpdir } from 'os';

// Import functions to test (these don't exist yet - tests will fail)
import {
  hygieneCommand,
  scanForSlop,
  cleanSlop,
  type SlopItem,
  type ScanResult,
  type CleanResult
} from './hygiene.js';

describe('isSlop', () => {
  it('should detect test-skill-* pattern', async () => {
    const { isSlop } = await import('./hygiene.js');

    // Returns the slop type when matched, not just true
    expect(isSlop('test-skill-1234567890')).toBe('test-skill');
    expect(isSlop('test-skill-9999999999999')).toBe('test-skill');
  });

  it('should NOT flag legitimate skill names', async () => {
    const { isSlop } = await import('./hygiene.js');

    expect(isSlop('tdd')).toBe(false);
    expect(isSlop('code-review')).toBe(false);
    expect(isSlop('my-test-skill')).toBe(false); // Has 'test-skill' but not at start with timestamp
  });

  it('should detect timestamped skill names', async () => {
    const { isSlop } = await import('./hygiene.js');

    expect(isSlop('my-skill-1706625000000')).toBe('timestamped');
    expect(isSlop('anything-9999999999999')).toBe('timestamped');
  });

  it('should detect _temp_ prefix', async () => {
    const { isSlop } = await import('./hygiene.js');

    expect(isSlop('_temp_my-skill')).toBe('temp-prefix');
    expect(isSlop('_temp_anything')).toBe('temp-prefix');
  });

  it('should return false for valid skill names', async () => {
    const { isSlop } = await import('./hygiene.js');

    expect(isSlop('valid-skill')).toBe(false);
    expect(isSlop('tdd')).toBe(false);
    expect(isSlop('code-review-ts')).toBe(false);
    expect(isSlop('svelte-runes')).toBe(false);
  });
});

describe('hygiene command', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skills-hygiene-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('scanForSlop', () => {
    it('should detect test-skill-* directories', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-1234567890'), { recursive: true });
      await writeFile(
        join(skillsDir, 'test-skill-1234567890', 'SKILL.md'),
        '# Test Skill\n\nNEW content with improvements!',
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.some(item =>
        item.type === 'test-skill' && item.name === 'test-skill-1234567890'
      )).toBe(true);
    });

    it('should detect timestamped skill names', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      // Timestamp pattern: ends with 13 digits (milliseconds since epoch)
      await mkdir(join(skillsDir, 'my-skill-1706625000000'), { recursive: true });
      await writeFile(
        join(skillsDir, 'my-skill-1706625000000', 'SKILL.md'),
        '---\nname: my-skill-1706625000000\ndescription: test\n---\n\n# My Skill',
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.items.some(item =>
        item.type === 'timestamped' && item.name.includes('1706625000000')
      )).toBe(true);
    });

    it('should detect placeholder content', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'placeholder-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'placeholder-skill', 'SKILL.md'),
        '---\nname: placeholder-skill\ndescription: test\n---\n\n# Test Skill\n\nNEW content with improvements!',
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.items.some(item =>
        item.type === 'placeholder-content'
      )).toBe(true);
    });

    it('should return empty result for clean directory', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'valid-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'valid-skill', 'SKILL.md'),
        `---
name: valid-skill
description: A properly formatted skill with real content
---

# Valid Skill

This is real content that provides value.
`,
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.items.length).toBe(0);
    });

    it('should detect _temp_ prefixed skills for review', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, '_temp_my-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, '_temp_my-skill', 'SKILL.md'),
        '---\nname: _temp_my-skill\ndescription: A temporary skill\n---\n\n# My Skill',
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.items.some(item =>
        item.type === 'temp-prefix' && item.name === '_temp_my-skill'
      )).toBe(true);
      // _temp_ skills should be flagged for review, not automatic deletion
      expect(result.items.find(item => item.name === '_temp_my-skill')?.action).toBe('review');
    });

    it('should scan multiple locations', async () => {
      // Root skills
      const rootSkills = join(tempDir, '.claude', 'skills');
      await mkdir(join(rootSkills, 'test-skill-111'), { recursive: true });
      await writeFile(join(rootSkills, 'test-skill-111', 'SKILL.md'), '# Test', 'utf-8');

      // Package skills
      const pkgSkills = join(tempDir, 'packages', 'my-pkg', '.claude', 'skills');
      await mkdir(join(pkgSkills, 'test-skill-222'), { recursive: true });
      await writeFile(join(pkgSkills, 'test-skill-222', 'SKILL.md'), '# Test', 'utf-8');

      const result = await scanForSlop(tempDir, { recursive: true, includeTemp: false });

      expect(result.items.length).toBe(2);
      expect(result.items.some(item => item.name === 'test-skill-111')).toBe(true);
      expect(result.items.some(item => item.name === 'test-skill-222')).toBe(true);
    });

    it('should detect temp test project directories outside the repo', async () => {
      const tempProject = await mkdtemp(join(tmpdir(), 'skills-sync-project-a-'));
      try {
        const result = await scanForSlop(tempDir, { includeTemp: true });

        expect(result.items.some(item =>
          item.type === 'temp-project' && item.name === basename(tempProject)
        )).toBe(true);
      } finally {
        await rm(tempProject, { recursive: true, force: true });
      }
    });
  });

  describe('cleanSlop', () => {
    it('should delete test-skill-* directories', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-123'), { recursive: true });
      await writeFile(join(skillsDir, 'test-skill-123', 'SKILL.md'), '# Test', 'utf-8');

      const scanResult = await scanForSlop(tempDir, { includeTemp: false });
      const cleanResult = await cleanSlop(tempDir, scanResult.items.filter(i => i.action === 'delete'));

      expect(cleanResult.deleted.length).toBe(1);
      expect(cleanResult.deleted).toContain('test-skill-123');

      // Verify directory is gone
      const remaining = await readdir(skillsDir);
      expect(remaining).not.toContain('test-skill-123');
    });

    it('should support dry-run mode', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-456'), { recursive: true });
      await writeFile(join(skillsDir, 'test-skill-456', 'SKILL.md'), '# Test', 'utf-8');

      const scanResult = await scanForSlop(tempDir, { includeTemp: false });
      const cleanResult = await cleanSlop(
        tempDir,
        scanResult.items.filter(i => i.action === 'delete'),
        { dryRun: true }
      );

      expect(cleanResult.deleted.length).toBe(0);
      expect(cleanResult.wouldDelete.length).toBe(1);

      // Verify directory still exists
      const remaining = await readdir(skillsDir);
      expect(remaining).toContain('test-skill-456');
    });

    it('should not delete _temp_ skills automatically', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, '_temp_keep-this'), { recursive: true });
      await writeFile(join(skillsDir, '_temp_keep-this', 'SKILL.md'), '# Keep', 'utf-8');

      const scanResult = await scanForSlop(tempDir, { includeTemp: false });
      const cleanResult = await cleanSlop(
        tempDir,
        scanResult.items.filter(i => i.action === 'delete')
      );

      // Should not have deleted the _temp_ skill
      const remaining = await readdir(skillsDir);
      expect(remaining).toContain('_temp_keep-this');
    });

    it('should track failures', async () => {
      // Try to clean a non-existent item
      const fakeItems: SlopItem[] = [{
        name: 'non-existent-skill',
        path: join(tempDir, '.claude', 'skills', 'non-existent-skill'),
        type: 'test-skill',
        action: 'delete',
        reason: 'test'
      }];

      const cleanResult = await cleanSlop(tempDir, fakeItems);

      expect(cleanResult.failed.length).toBe(1);
    });
  });

  describe('hygieneCommand', () => {
    it('should run scan subcommand', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-789'), { recursive: true });
      await writeFile(join(skillsDir, 'test-skill-789', 'SKILL.md'), '# Test', 'utf-8');

      const result = await hygieneCommand('scan', { cwd: tempDir, includeTemp: false });

      expect(result.type).toBe('scan');
      expect(result.scanResult?.items.length).toBeGreaterThan(0);
    });

    it('should run clean subcommand with dry-run', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-999'), { recursive: true });
      await writeFile(join(skillsDir, 'test-skill-999', 'SKILL.md'), '# Test', 'utf-8');

      const result = await hygieneCommand('clean', { cwd: tempDir, dryRun: true, includeTemp: false });

      expect(result.type).toBe('clean');
      expect(result.cleanResult?.wouldDelete.length).toBeGreaterThan(0);
      expect(result.cleanResult?.deleted.length).toBe(0);
    });

    it('should run clean subcommand with confirm', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      const testSkillDir = join(skillsDir, 'test-skill-abc');
      await mkdir(testSkillDir, { recursive: true });
      await writeFile(join(testSkillDir, 'SKILL.md'), '# Test\n\nNEW content with improvements!', 'utf-8');

      // Verify the skill exists before cleaning
      const beforeClean = await readdir(skillsDir);
      expect(beforeClean).toContain('test-skill-abc');

      const result = await hygieneCommand('clean', { cwd: tempDir, confirm: true, includeTemp: false });

      expect(result.type).toBe('clean');
      expect(result.cleanResult?.deleted.length).toBeGreaterThan(0);
      expect(result.cleanResult?.deleted).toContain('test-skill-abc');
    });

    it('should output JSON when requested', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-json'), { recursive: true });
      await writeFile(join(skillsDir, 'test-skill-json', 'SKILL.md'), '# Test', 'utf-8');

      const result = await hygieneCommand('scan', { cwd: tempDir, json: true, includeTemp: false });

      expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('should handle missing skills directory gracefully', async () => {
      // No .claude/skills directory exists

      const result = await hygieneCommand('scan', { cwd: tempDir, includeTemp: false });

      expect(result.scanResult?.items.length).toBe(0);
    });
  });

  describe('scan output message', () => {
    it('should suggest clean with -r flag when scan was run with recursive', async () => {
      // Setup: Create slop in a package directory
      const pkgSkillsDir = join(tempDir, 'packages', 'my-pkg', '.claude', 'skills');
      await mkdir(join(pkgSkillsDir, 'test-skill-recursive-test'), { recursive: true });
      await writeFile(
        join(pkgSkillsDir, 'test-skill-recursive-test', 'SKILL.md'),
        '# Test Skill',
        'utf-8'
      );

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(a => String(a)).join(' '));
      };

      try {
        // Run scan with recursive flag
        await hygieneCommand('scan', { cwd: tempDir, recursive: true, includeTemp: false });

        // Verify the suggestion includes -r flag
        const suggestionLine = logs.find(line => line.includes('skills hygiene clean'));
        expect(suggestionLine).toBeDefined();
        expect(suggestionLine).toContain('-r');
        expect(suggestionLine).toContain('--confirm');
      } finally {
        console.log = originalLog;
      }
    });

    it('should suggest clean without -r flag when scan was run without recursive', async () => {
      // Setup: Create slop in root skills directory
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'test-skill-nonrecursive-test'), { recursive: true });
      await writeFile(
        join(skillsDir, 'test-skill-nonrecursive-test', 'SKILL.md'),
        '# Test Skill',
        'utf-8'
      );

      // Capture console output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(a => String(a)).join(' '));
      };

      try {
        // Run scan without recursive flag
        await hygieneCommand('scan', { cwd: tempDir, recursive: false, includeTemp: false });

        // Verify the suggestion does NOT include -r flag
        const suggestionLine = logs.find(line => line.includes('skills hygiene clean'));
        expect(suggestionLine).toBeDefined();
        expect(suggestionLine).not.toContain('-r');
        expect(suggestionLine).toContain('--confirm');
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('CLAUDE.md cleanup', () => {
    it('should detect stale skill references in CLAUDE.md', async () => {
      const skillsDir = join(tempDir, '.claude', 'skills');
      await mkdir(join(skillsDir, 'valid-skill'), { recursive: true });
      await writeFile(
        join(skillsDir, 'valid-skill', 'SKILL.md'),
        '---\nname: valid-skill\ndescription: test\n---\n\n# Valid',
        'utf-8'
      );

      // CLAUDE.md references skills that don't exist
      await writeFile(
        join(tempDir, 'CLAUDE.md'),
        `# Project

## Installed Skills
- @.claude/skills/valid-skill/SKILL.md
- @.claude/skills/test-skill-1234567890/SKILL.md
- @.claude/skills/non-existent/SKILL.md
`,
        'utf-8'
      );

      const result = await scanForSlop(tempDir, { includeTemp: false });

      expect(result.claudemdIssues).toBeDefined();
      expect(result.claudemdIssues?.staleReferences.length).toBe(2);
      expect(result.claudemdIssues?.staleReferences).toContain('test-skill-1234567890');
      expect(result.claudemdIssues?.staleReferences).toContain('non-existent');
    });
  });
});
