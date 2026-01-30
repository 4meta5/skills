import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseGitUrl, extractSourceName, copySkillFromSource, type DiscoveredSkill } from './git.js';
import { readProvenance } from './provenance.js';
import { mkdir, rm, writeFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as configModule from './config.js';

describe('parseGitUrl', () => {
  describe('basic URLs', () => {
    it('parses a simple HTTPS URL', () => {
      const result = parseGitUrl('https://github.com/user/repo');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: undefined,
        path: undefined
      });
    });

    it('strips git+ prefix from URLs', () => {
      const result = parseGitUrl('git+https://github.com/user/repo');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: undefined,
        path: undefined
      });
    });
  });

  describe('URLs with refs', () => {
    it('parses URL with branch ref', () => {
      const result = parseGitUrl('https://github.com/user/repo#main');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'main',
        path: undefined
      });
    });

    it('parses URL with tag ref', () => {
      const result = parseGitUrl('https://github.com/user/repo#v1.2.3');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'v1.2.3',
        path: undefined
      });
    });

    it('parses URL with commit sha ref', () => {
      const result = parseGitUrl('https://github.com/user/repo#abc1234');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'abc1234',
        path: undefined
      });
    });
  });

  describe('URLs with paths', () => {
    it('parses URL with ref and path', () => {
      const result = parseGitUrl('https://github.com/user/repo#main:skills');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'main',
        path: 'skills'
      });
    });

    it('parses URL with ref and nested path', () => {
      const result = parseGitUrl('https://github.com/user/repo#main:path/to/skills');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'main',
        path: 'path/to/skills'
      });
    });

    it('parses git+ URL with ref and path', () => {
      const result = parseGitUrl('git+https://github.com/user/repo#develop:plugins');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: 'develop',
        path: 'plugins'
      });
    });
  });

  describe('edge cases', () => {
    it('handles URL with empty ref and path', () => {
      const result = parseGitUrl('https://github.com/user/repo#:');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: '',
        path: ''
      });
    });

    it('handles URL with only path (no ref)', () => {
      // This format should have ref as empty string, path after colon
      const result = parseGitUrl('https://github.com/user/repo#:path');
      expect(result).toEqual({
        url: 'https://github.com/user/repo',
        ref: '',
        path: 'path'
      });
    });
  });
});

describe('extractSourceName', () => {
  it('extracts repo name from HTTPS URL', () => {
    expect(extractSourceName('https://github.com/user/my-repo')).toBe('my-repo');
  });

  it('extracts repo name from HTTPS URL with .git suffix', () => {
    expect(extractSourceName('https://github.com/user/my-repo.git')).toBe('my-repo');
  });

  it('extracts repo name from SSH URL', () => {
    expect(extractSourceName('git@github.com:user/my-repo')).toBe('my-repo');
  });

  it('extracts repo name from SSH URL with .git suffix', () => {
    expect(extractSourceName('git@github.com:user/my-repo.git')).toBe('my-repo');
  });

  it('handles URLs with deeply nested paths', () => {
    expect(extractSourceName('https://gitlab.com/org/group/subgroup/repo')).toBe('repo');
  });

  it('handles URLs with organization names', () => {
    expect(extractSourceName('https://github.com/trailofbits/skills')).toBe('skills');
  });

  it('returns "unknown" for malformed URL', () => {
    expect(extractSourceName('')).toBe('unknown');
  });
});

describe('copySkillFromSource', () => {
  let tempDir: string;
  let cacheDir: string;
  let targetDir: string;

  beforeEach(async () => {
    // Create temp directories for testing
    tempDir = join(tmpdir(), `skills-test-${Date.now()}`);
    cacheDir = join(tempDir, 'cache');
    targetDir = join(tempDir, 'target');

    // Create the mock source cache structure
    // The skill would be in: cache/test-source/test-skill/SKILL.md
    const skillDir = join(cacheDir, 'test-source', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await mkdir(targetDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: test-skill\ndescription: A test skill\n---\n\n# Test Skill'
    );

    // Mock getSourcesCacheDir to return our temp cache directory
    vi.spyOn(configModule, 'getSourcesCacheDir').mockReturnValue(cacheDir);
  });

  afterEach(async () => {
    // Clean up temp directories
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates provenance with type: git when copying from git source', async () => {
    const source = {
      name: 'test-source',
      url: 'https://github.com/user/repo',
      ref: 'main',
      type: 'git' as const
    };

    await copySkillFromSource(source, 'test-skill', targetDir);

    // Check the target skill exists
    const targetSkillDir = join(targetDir, 'test-skill');
    const skillMdStat = await stat(join(targetSkillDir, 'SKILL.md'));
    expect(skillMdStat.isFile()).toBe(true);

    // BUG: This should pass but will fail because provenance is NOT created
    const provenance = await readProvenance(targetSkillDir);
    expect(provenance).not.toBeNull();
    expect(provenance?.source.type).toBe('git');
    expect(provenance?.source.url).toBe('https://github.com/user/repo');
    expect(provenance?.source.ref).toBe('main');
  });
});
