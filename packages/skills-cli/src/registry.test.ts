import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSkillRef, createSourceFromUrl } from './registry.js';

// Mock the dependencies for async function tests
vi.mock('./config.js', () => ({
  getSources: vi.fn(),
  getSource: vi.fn()
}));

vi.mock('./git.js', () => ({
  cloneOrUpdateSource: vi.fn(),
  discoverSkillsInSource: vi.fn(),
  getSkillPathInSource: vi.fn(),
  getSourceSkillsDir: vi.fn(),
  parseGitUrl: vi.fn((url: string) => {
    // Minimal implementation for createSourceFromUrl tests
    let cleanUrl = url.replace(/^git\+/, '');
    let ref: string | undefined;
    let path: string | undefined;

    const hashIndex = cleanUrl.indexOf('#');
    if (hashIndex !== -1) {
      const refAndPath = cleanUrl.slice(hashIndex + 1);
      cleanUrl = cleanUrl.slice(0, hashIndex);
      const colonIndex = refAndPath.indexOf(':');
      if (colonIndex !== -1) {
        ref = refAndPath.slice(0, colonIndex);
        path = refAndPath.slice(colonIndex + 1);
      } else {
        ref = refAndPath;
      }
    }
    return { url: cleanUrl, ref, path };
  }),
  extractSourceName: vi.fn((url: string) => {
    const cleanUrl = url.replace(/^(https?:\/\/|git@)/, '').replace(/\.git$/, '');
    const parts = cleanUrl.split(/[\/:]/).filter(Boolean);
    return parts[parts.length - 1] || 'unknown';
  })
}));

vi.mock('@anthropic/skills-library', () => ({
  loadSkillFromPath: vi.fn()
}));

describe('parseSkillRef', () => {
  describe('simple skill names', () => {
    it('parses a simple skill name without source', () => {
      const result = parseSkillRef('my-skill');
      expect(result).toEqual({ name: 'my-skill' });
      expect(result.source).toBeUndefined();
    });

    it('parses skill name with hyphens', () => {
      const result = parseSkillRef('test-first-bugfix');
      expect(result).toEqual({ name: 'test-first-bugfix' });
    });

    it('parses skill name with underscores', () => {
      const result = parseSkillRef('my_skill_name');
      expect(result).toEqual({ name: 'my_skill_name' });
    });
  });

  describe('source/name format', () => {
    it('parses source and skill name', () => {
      const result = parseSkillRef('tob/differential-review');
      expect(result).toEqual({
        source: 'tob',
        name: 'differential-review'
      });
    });

    it('parses source and skill with complex names', () => {
      const result = parseSkillRef('my-source/my-complex-skill-name');
      expect(result).toEqual({
        source: 'my-source',
        name: 'my-complex-skill-name'
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = parseSkillRef('');
      expect(result).toEqual({ name: '' });
    });

    it('treats multiple slashes as source/rest', () => {
      // When there are more than 2 parts, only first split is used
      // "a/b/c".split('/') = ['a', 'b', 'c'], length !== 2
      const result = parseSkillRef('a/b/c');
      expect(result).toEqual({ name: 'a/b/c' });
    });

    it('handles single slash with empty parts', () => {
      const result = parseSkillRef('/');
      expect(result).toEqual({ source: '', name: '' });
    });

    it('handles leading slash', () => {
      const result = parseSkillRef('/skill-name');
      // '/skill-name'.split('/') = ['', 'skill-name'], length === 2
      expect(result).toEqual({ source: '', name: 'skill-name' });
    });

    it('handles trailing slash', () => {
      const result = parseSkillRef('source/');
      expect(result).toEqual({ source: 'source', name: '' });
    });
  });

  describe('security edge cases', () => {
    it('handles path traversal attempts', () => {
      // These should just be parsed as-is, validation happens elsewhere
      const result = parseSkillRef('../../../etc/passwd');
      expect(result).toEqual({ name: '../../../etc/passwd' });
    });

    it('handles null bytes in input', () => {
      const result = parseSkillRef('skill\x00name');
      expect(result).toEqual({ name: 'skill\x00name' });
    });

    it('handles unicode characters', () => {
      const result = parseSkillRef('source/スキル');
      expect(result).toEqual({ source: 'source', name: 'スキル' });
    });
  });
});

describe('createSourceFromUrl', () => {
  describe('basic URLs', () => {
    it('creates source from simple HTTPS URL', () => {
      const result = createSourceFromUrl('https://github.com/user/my-repo');
      expect(result).toEqual({
        name: 'my-repo',
        url: 'https://github.com/user/my-repo',
        path: undefined,
        ref: undefined,
        type: 'git'
      });
    });

    it('creates source from URL with .git suffix', () => {
      const result = createSourceFromUrl('https://github.com/user/my-repo.git');
      expect(result).toEqual({
        name: 'my-repo',
        url: 'https://github.com/user/my-repo.git',
        path: undefined,
        ref: undefined,
        type: 'git'
      });
    });
  });

  describe('URLs with ref and path', () => {
    it('extracts ref from URL', () => {
      const result = createSourceFromUrl('https://github.com/user/repo#main');
      expect(result.ref).toBe('main');
    });

    it('extracts path from URL', () => {
      const result = createSourceFromUrl('https://github.com/user/repo#main:skills');
      expect(result.path).toBe('skills');
      expect(result.ref).toBe('main');
    });
  });

  describe('with options overrides', () => {
    it('uses custom name from options', () => {
      const result = createSourceFromUrl('https://github.com/trailofbits/skills', {
        name: 'tob'
      });
      expect(result.name).toBe('tob');
    });

    it('uses custom path from options', () => {
      const result = createSourceFromUrl('https://github.com/user/repo', {
        path: 'custom/path'
      });
      expect(result.path).toBe('custom/path');
    });

    it('options name overrides extracted name', () => {
      const result = createSourceFromUrl('https://github.com/user/my-long-repo-name', {
        name: 'short'
      });
      expect(result.name).toBe('short');
    });

    it('options path overrides URL path', () => {
      const result = createSourceFromUrl('https://github.com/user/repo#main:skills', {
        path: 'different'
      });
      expect(result.path).toBe('different');
    });

    it('uses URL path when options.path is undefined', () => {
      const result = createSourceFromUrl('https://github.com/user/repo#main:plugins');
      expect(result.path).toBe('plugins');
    });
  });

  describe('always sets type to git', () => {
    it('sets type to git for all sources', () => {
      const result1 = createSourceFromUrl('https://github.com/user/repo');
      const result2 = createSourceFromUrl('https://gitlab.com/user/repo');
      const result3 = createSourceFromUrl('https://bitbucket.org/user/repo');

      expect(result1.type).toBe('git');
      expect(result2.type).toBe('git');
      expect(result3.type).toBe('git');
    });
  });
});

// Tests for async functions that require mocking
describe('listRemoteSkills', async () => {
  const { getSources } = await import('./config.js');
  const { cloneOrUpdateSource, discoverSkillsInSource } = await import('./git.js');
  const { listRemoteSkills } = await import('./registry.js');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no sources configured', async () => {
    vi.mocked(getSources).mockResolvedValue([]);

    const result = await listRemoteSkills();

    expect(result).toEqual([]);
  });

  it('lists skills from a single source', async () => {
    const source = { name: 'test-source', url: 'https://github.com/test/repo', type: 'git' as const };
    vi.mocked(getSources).mockResolvedValue([source]);
    vi.mocked(discoverSkillsInSource).mockResolvedValue(['skill-a', 'skill-b']);

    const result = await listRemoteSkills();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'skill-a',
      source: source,
      fullName: 'test-source/skill-a'
    });
    expect(result[1]).toEqual({
      name: 'skill-b',
      source: source,
      fullName: 'test-source/skill-b'
    });
  });

  it('lists skills from multiple sources', async () => {
    const source1 = { name: 'src1', url: 'https://github.com/test/repo1', type: 'git' as const };
    const source2 = { name: 'src2', url: 'https://github.com/test/repo2', type: 'git' as const };
    vi.mocked(getSources).mockResolvedValue([source1, source2]);
    vi.mocked(discoverSkillsInSource)
      .mockResolvedValueOnce(['skill-a'])
      .mockResolvedValueOnce(['skill-b']);

    const result = await listRemoteSkills();

    expect(result).toHaveLength(2);
    expect(result[0].fullName).toBe('src1/skill-a');
    expect(result[1].fullName).toBe('src2/skill-b');
  });

  it('calls cloneOrUpdateSource when refresh is true', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    vi.mocked(getSources).mockResolvedValue([source]);
    vi.mocked(discoverSkillsInSource).mockResolvedValue(['skill-a']);

    await listRemoteSkills(true);

    expect(cloneOrUpdateSource).toHaveBeenCalledWith(source);
  });

  it('does not call cloneOrUpdateSource when refresh is false', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    vi.mocked(getSources).mockResolvedValue([source]);
    vi.mocked(discoverSkillsInSource).mockResolvedValue(['skill-a']);

    await listRemoteSkills(false);

    expect(cloneOrUpdateSource).not.toHaveBeenCalled();
  });

  it('continues on error and returns partial results', async () => {
    const source1 = { name: 'src1', url: 'https://github.com/test/repo1', type: 'git' as const };
    const source2 = { name: 'src2', url: 'https://github.com/test/repo2', type: 'git' as const };
    vi.mocked(getSources).mockResolvedValue([source1, source2]);
    vi.mocked(discoverSkillsInSource)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(['skill-b']);

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await listRemoteSkills();

    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe('src2/skill-b');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});

describe('loadRemoteSkill', async () => {
  const { getSource } = await import('./config.js');
  const { cloneOrUpdateSource, getSkillPathInSource } = await import('./git.js');
  const { loadSkillFromPath } = await import('@anthropic/skills-library');
  const { loadRemoteSkill } = await import('./registry.js');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when source not found', async () => {
    vi.mocked(getSource).mockResolvedValue(undefined);

    await expect(loadRemoteSkill('nonexistent', 'skill'))
      .rejects.toThrow('Source not found: nonexistent');
  });

  it('loads skill from source', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    const mockSkill = {
      metadata: { name: 'my-skill', description: 'A test skill' },
      content: '# Skill content',
      path: '/path/to/skill'
    };

    vi.mocked(getSource).mockResolvedValue(source);
    vi.mocked(getSkillPathInSource).mockResolvedValue('/cache/test/my-skill');
    vi.mocked(loadSkillFromPath).mockResolvedValue(mockSkill);

    const result = await loadRemoteSkill('test', 'my-skill');

    expect(result.source).toBe('test');
    expect(result.fullName).toBe('test/my-skill');
    expect(result.metadata).toEqual(mockSkill.metadata);
  });

  it('calls cloneOrUpdateSource when refresh is true', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    vi.mocked(getSource).mockResolvedValue(source);
    vi.mocked(getSkillPathInSource).mockResolvedValue('/cache/test/skill');
    vi.mocked(loadSkillFromPath).mockResolvedValue({
      metadata: { name: 'skill', description: 'desc' },
      content: '',
      path: ''
    });

    await loadRemoteSkill('test', 'skill', true);

    expect(cloneOrUpdateSource).toHaveBeenCalledWith(source);
  });

  it('does not refresh by default', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    vi.mocked(getSource).mockResolvedValue(source);
    vi.mocked(getSkillPathInSource).mockResolvedValue('/cache/test/skill');
    vi.mocked(loadSkillFromPath).mockResolvedValue({
      metadata: { name: 'skill', description: 'desc' },
      content: '',
      path: ''
    });

    await loadRemoteSkill('test', 'skill');

    expect(cloneOrUpdateSource).not.toHaveBeenCalled();
  });
});

describe('resolveSkillRef', async () => {
  const { getSource, getSources } = await import('./config.js');
  const { getSkillPathInSource } = await import('./git.js');
  const { loadSkillFromPath } = await import('@anthropic/skills-library');
  const { resolveSkillRef } = await import('./registry.js');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when source not found for explicit ref', async () => {
    vi.mocked(getSource).mockResolvedValue(undefined);

    const result = await resolveSkillRef('nonexistent/skill');

    expect(result).toBeNull();
  });

  it('resolves skill from explicit source', async () => {
    const source = { name: 'test', url: 'https://github.com/test/repo', type: 'git' as const };
    const mockSkill = {
      metadata: { name: 'my-skill', description: 'desc' },
      content: '',
      path: ''
    };

    vi.mocked(getSource).mockResolvedValue(source);
    vi.mocked(getSkillPathInSource).mockResolvedValue('/cache/test/my-skill');
    vi.mocked(loadSkillFromPath).mockResolvedValue(mockSkill);

    const result = await resolveSkillRef('test/my-skill');

    expect(result).not.toBeNull();
    expect(result?.source).toBe('test');
  });

  it('searches all sources when no explicit source given', async () => {
    const source1 = { name: 'src1', url: 'https://github.com/test/repo1', type: 'git' as const };
    const source2 = { name: 'src2', url: 'https://github.com/test/repo2', type: 'git' as const };
    const mockSkill = {
      metadata: { name: 'skill', description: 'desc' },
      content: '',
      path: ''
    };

    vi.mocked(getSources).mockResolvedValue([source1, source2]);
    vi.mocked(getSource)
      .mockResolvedValueOnce(source1)
      .mockResolvedValueOnce(source2);
    vi.mocked(getSkillPathInSource)
      .mockRejectedValueOnce(new Error('Not found'))
      .mockResolvedValueOnce('/cache/src2/skill');
    vi.mocked(loadSkillFromPath).mockResolvedValue(mockSkill);

    const result = await resolveSkillRef('skill');

    expect(result?.source).toBe('src2');
  });

  it('returns null when skill not found in any source', async () => {
    const source = { name: 'src', url: 'https://github.com/test/repo', type: 'git' as const };

    vi.mocked(getSources).mockResolvedValue([source]);
    vi.mocked(getSource).mockResolvedValue(source);
    vi.mocked(getSkillPathInSource).mockRejectedValue(new Error('Not found'));

    const result = await resolveSkillRef('nonexistent-skill');

    expect(result).toBeNull();
  });

  it('returns null for empty sources list', async () => {
    vi.mocked(getSources).mockResolvedValue([]);

    const result = await resolveSkillRef('skill');

    expect(result).toBeNull();
  });
});
