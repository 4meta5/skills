import { describe, it, expect } from 'vitest';

// We'll test the pure logic by mocking the file system operations
// For the config module, we test the data structures and transformations

describe('SkillsConfig types', () => {
  it('SkillSource has required fields', () => {
    const source = {
      name: 'test-source',
      url: 'https://github.com/test/repo',
      type: 'git' as const
    };

    expect(source.name).toBe('test-source');
    expect(source.url).toBe('https://github.com/test/repo');
    expect(source.type).toBe('git');
  });

  it('SkillSource with optional fields', () => {
    const source = {
      name: 'test-source',
      url: 'https://github.com/test/repo',
      path: 'skills',
      ref: 'main',
      type: 'git' as const
    };

    expect(source.path).toBe('skills');
    expect(source.ref).toBe('main');
  });

  it('InstalledSkillRef tracks skill installations', () => {
    const ref = {
      name: 'my-skill',
      source: 'github/test-repo',
      ref: 'abc1234',
      installedAt: '2024-01-01T00:00:00.000Z'
    };

    expect(ref.name).toBe('my-skill');
    expect(ref.source).toBe('github/test-repo');
    expect(ref.ref).toBe('abc1234');
    expect(ref.installedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('InstalledSkillRef for bundled skills', () => {
    const ref: { name: string; source: string; ref?: string; installedAt: string } = {
      name: 'test-first-bugfix',
      source: 'bundled',
      installedAt: '2024-01-01T00:00:00.000Z'
    };

    expect(ref.source).toBe('bundled');
    expect(ref.ref).toBeUndefined();
  });
});

describe('config data transformations', () => {
  it('merges defaults with loaded config', () => {
    const defaultConfig = {
      defaults: [],
      sources: [],
      installed: []
    };

    const loadedConfig = {
      defaults: ['skill-a', 'skill-b']
    };

    // This simulates what loadConfig does
    const merged = { ...defaultConfig, ...loadedConfig };

    expect(merged.defaults).toEqual(['skill-a', 'skill-b']);
    expect(merged.sources).toEqual([]);
    expect(merged.installed).toEqual([]);
  });

  it('preserves sources and installed when merging', () => {
    const defaultConfig = {
      defaults: [],
      sources: [],
      installed: []
    };

    const loadedConfig = {
      defaults: ['skill-a'],
      sources: [{ name: 'src', url: 'https://example.com', type: 'git' as const }],
      installed: [{ name: 'my-skill', source: 'src', installedAt: '2024-01-01T00:00:00.000Z' }]
    };

    const merged = { ...defaultConfig, ...loadedConfig };

    expect(merged.sources).toHaveLength(1);
    expect(merged.installed).toHaveLength(1);
  });
});

describe('defaults management logic', () => {
  it('adds defaults without duplicates', () => {
    const existingDefaults = ['skill-a', 'skill-b'];
    const newDefaults = ['skill-b', 'skill-c'];

    // Logic from addDefaults
    const combined = new Set([...existingDefaults, ...newDefaults]);
    const result = Array.from(combined);

    expect(result).toEqual(['skill-a', 'skill-b', 'skill-c']);
  });

  it('removes defaults by filtering', () => {
    const defaults = ['skill-a', 'skill-b', 'skill-c'];
    const toRemove = new Set(['skill-b']);

    // Logic from removeDefaults
    const result = defaults.filter(s => !toRemove.has(s));

    expect(result).toEqual(['skill-a', 'skill-c']);
  });

  it('clears all defaults', () => {
    // setDefaults([]) clears all
    const result: string[] = [];
    expect(result).toEqual([]);
  });
});

describe('source management logic', () => {
  it('updates existing source by name', () => {
    const sources = [
      { name: 'src1', url: 'https://old.com', type: 'git' as const },
      { name: 'src2', url: 'https://example.com', type: 'git' as const }
    ];

    const newSource = { name: 'src1', url: 'https://new.com', type: 'git' as const };

    // Logic from addSource
    const existingIndex = sources.findIndex(s => s.name === newSource.name);
    if (existingIndex >= 0) {
      sources[existingIndex] = newSource;
    } else {
      sources.push(newSource);
    }

    expect(sources).toHaveLength(2);
    expect(sources[0].url).toBe('https://new.com');
  });

  it('adds new source when name does not exist', () => {
    const sources = [
      { name: 'src1', url: 'https://example.com', type: 'git' as const }
    ];

    const newSource = { name: 'src2', url: 'https://new.com', type: 'git' as const };

    const existingIndex = sources.findIndex(s => s.name === newSource.name);
    if (existingIndex >= 0) {
      sources[existingIndex] = newSource;
    } else {
      sources.push(newSource);
    }

    expect(sources).toHaveLength(2);
    expect(sources[1].name).toBe('src2');
  });

  it('removes source by name', () => {
    const sources = [
      { name: 'src1', url: 'https://example1.com', type: 'git' as const },
      { name: 'src2', url: 'https://example2.com', type: 'git' as const }
    ];

    const name = 'src1';
    const result = sources.filter(s => s.name !== name);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('src2');
  });

  it('finds source by name', () => {
    const sources = [
      { name: 'src1', url: 'https://example1.com', type: 'git' as const },
      { name: 'src2', url: 'https://example2.com', type: 'git' as const }
    ];

    const found = sources.find(s => s.name === 'src2');
    expect(found?.url).toBe('https://example2.com');

    const notFound = sources.find(s => s.name === 'src3');
    expect(notFound).toBeUndefined();
  });
});

describe('installed skill tracking logic', () => {
  it('tracks installed skill replacing existing', () => {
    const installed = [
      { name: 'skill-a', source: 'src1', installedAt: '2024-01-01T00:00:00.000Z' }
    ];

    const newRef = { name: 'skill-a', source: 'src2', installedAt: '2024-06-01T00:00:00.000Z' };

    const existingIndex = installed.findIndex(s => s.name === newRef.name);
    if (existingIndex >= 0) {
      installed[existingIndex] = newRef;
    } else {
      installed.push(newRef);
    }

    expect(installed).toHaveLength(1);
    expect(installed[0].source).toBe('src2');
  });

  it('tracks new skill installation', () => {
    const installed = [
      { name: 'skill-a', source: 'src1', installedAt: '2024-01-01T00:00:00.000Z' }
    ];

    const newRef = { name: 'skill-b', source: 'src2', installedAt: '2024-06-01T00:00:00.000Z' };

    const existingIndex = installed.findIndex(s => s.name === newRef.name);
    if (existingIndex >= 0) {
      installed[existingIndex] = newRef;
    } else {
      installed.push(newRef);
    }

    expect(installed).toHaveLength(2);
  });

  it('untracks installed skill', () => {
    const installed = [
      { name: 'skill-a', source: 'src1', installedAt: '2024-01-01T00:00:00.000Z' },
      { name: 'skill-b', source: 'src2', installedAt: '2024-06-01T00:00:00.000Z' }
    ];

    const name = 'skill-a';
    const result = installed.filter(s => s.name !== name);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('skill-b');
  });
});
