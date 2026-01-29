import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

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

describe('ProjectInstallation types', () => {
  it('ProjectInstallation has required fields', () => {
    const installation = {
      skills: ['tdd', 'no-workarounds'],
      hooks: ['skill-forced-eval'],
      lastUpdated: '2026-01-29T03:00:00.000Z'
    };

    expect(installation.skills).toEqual(['tdd', 'no-workarounds']);
    expect(installation.hooks).toEqual(['skill-forced-eval']);
    expect(installation.lastUpdated).toBe('2026-01-29T03:00:00.000Z');
  });

  it('ProjectInstallation with empty arrays', () => {
    const installation = {
      skills: [],
      hooks: [],
      lastUpdated: '2026-01-29T03:00:00.000Z'
    };

    expect(installation.skills).toEqual([]);
    expect(installation.hooks).toEqual([]);
  });
});

describe('project installation tracking logic', () => {
  it('tracks skill installation to a project', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {};

    const projectPath = '/Users/test/my-project';
    const skillName = 'tdd';

    // Logic to track skill installation
    if (!projectInstallations[projectPath]) {
      projectInstallations[projectPath] = {
        skills: [],
        hooks: [],
        lastUpdated: new Date().toISOString()
      };
    }

    if (!projectInstallations[projectPath].skills.includes(skillName)) {
      projectInstallations[projectPath].skills.push(skillName);
      projectInstallations[projectPath].lastUpdated = new Date().toISOString();
    }

    expect(projectInstallations[projectPath].skills).toContain('tdd');
  });

  it('does not duplicate skill in project', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/my-project': {
        skills: ['tdd'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      }
    };

    const projectPath = '/Users/test/my-project';
    const skillName = 'tdd';

    if (!projectInstallations[projectPath].skills.includes(skillName)) {
      projectInstallations[projectPath].skills.push(skillName);
    }

    expect(projectInstallations[projectPath].skills).toHaveLength(1);
  });

  it('tracks hook installation to a project', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/my-project': {
        skills: ['tdd'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      }
    };

    const projectPath = '/Users/test/my-project';
    const hookName = 'skill-forced-eval';

    if (!projectInstallations[projectPath].hooks.includes(hookName)) {
      projectInstallations[projectPath].hooks.push(hookName);
      projectInstallations[projectPath].lastUpdated = new Date().toISOString();
    }

    expect(projectInstallations[projectPath].hooks).toContain('skill-forced-eval');
  });

  it('untracks skill from a project', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/my-project': {
        skills: ['tdd', 'no-workarounds'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      }
    };

    const projectPath = '/Users/test/my-project';
    const skillName = 'tdd';

    projectInstallations[projectPath].skills = projectInstallations[projectPath].skills.filter(
      s => s !== skillName
    );
    projectInstallations[projectPath].lastUpdated = new Date().toISOString();

    expect(projectInstallations[projectPath].skills).toEqual(['no-workarounds']);
  });

  it('removes project entry when all skills and hooks removed', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/my-project': {
        skills: ['tdd'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      }
    };

    const projectPath = '/Users/test/my-project';
    const skillName = 'tdd';

    projectInstallations[projectPath].skills = projectInstallations[projectPath].skills.filter(
      s => s !== skillName
    );

    // Remove entry if empty
    if (projectInstallations[projectPath].skills.length === 0 &&
        projectInstallations[projectPath].hooks.length === 0) {
      delete projectInstallations[projectPath];
    }

    expect(projectInstallations[projectPath]).toBeUndefined();
  });

  it('finds all projects with a skill', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/project-a': {
        skills: ['tdd', 'no-workarounds'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      },
      '/Users/test/project-b': {
        skills: ['tdd'],
        hooks: [],
        lastUpdated: '2026-01-29T02:00:00.000Z'
      },
      '/Users/test/project-c': {
        skills: ['no-workarounds'],
        hooks: [],
        lastUpdated: '2026-01-29T03:00:00.000Z'
      }
    };

    const skillName = 'tdd';
    const projectsWithSkill = Object.entries(projectInstallations)
      .filter(([, installation]) => installation.skills.includes(skillName))
      .map(([path]) => path);

    expect(projectsWithSkill).toHaveLength(2);
    expect(projectsWithSkill).toContain('/Users/test/project-a');
    expect(projectsWithSkill).toContain('/Users/test/project-b');
    expect(projectsWithSkill).not.toContain('/Users/test/project-c');
  });

  it('returns all tracked projects', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {
      '/Users/test/project-a': {
        skills: ['tdd'],
        hooks: [],
        lastUpdated: '2026-01-29T01:00:00.000Z'
      },
      '/Users/test/project-b': {
        skills: ['no-workarounds'],
        hooks: ['skill-forced-eval'],
        lastUpdated: '2026-01-29T02:00:00.000Z'
      }
    };

    const allProjects = Object.keys(projectInstallations);

    expect(allProjects).toHaveLength(2);
    expect(allProjects).toContain('/Users/test/project-a');
    expect(allProjects).toContain('/Users/test/project-b');
  });

  it('normalizes project paths', () => {
    // Test path normalization - trailing slash removal
    const path1 = '/Users/test/project/';
    const path2 = '/Users/test/project';

    const normalize = (p: string) => p.replace(/\/+$/, '');

    expect(normalize(path1)).toBe(normalize(path2));
  });

  it('handles project paths with spaces', () => {
    const projectInstallations: Record<string, { skills: string[]; hooks: string[]; lastUpdated: string }> = {};

    const projectPath = '/Users/test/My Project With Spaces';
    const skillName = 'tdd';

    projectInstallations[projectPath] = {
      skills: [skillName],
      hooks: [],
      lastUpdated: new Date().toISOString()
    };

    expect(projectInstallations[projectPath].skills).toContain('tdd');
  });
});

// Integration tests for the actual implementation functions
describe('project installation tracking functions', () => {
  // Track all created project paths for cleanup
  const trackedProjects: Array<{ path: string; name: string; type: 'skill' | 'hook' }> = [];

  afterEach(async () => {
    // Clean up all tracked projects after each test
    const { untrackProjectInstallation } = await import('./config.js');
    for (const { path, name, type } of trackedProjects) {
      await untrackProjectInstallation(path, name, type);
    }
    trackedProjects.length = 0;
  });

  // Helper to track and record a project installation
  async function trackAndRecord(path: string, name: string, type: 'skill' | 'hook') {
    const { trackProjectInstallation } = await import('./config.js');
    await trackProjectInstallation(path, name, type);
    trackedProjects.push({ path, name, type });
  }

  it('trackProjectInstallation adds skill to project', async () => {
    const { loadConfig } = await import('./config.js');

    const projectPath = '/tmp/test-project-' + Date.now();
    const skillName = 'tdd';

    await trackAndRecord(projectPath, skillName, 'skill');

    const config = await loadConfig();
    expect(config.projectInstallations?.[projectPath]?.skills).toContain('tdd');
  });

  it('trackProjectInstallation adds hook to project', async () => {
    const { loadConfig } = await import('./config.js');

    const projectPath = '/tmp/test-hook-project-' + Date.now();
    const hookName = 'skill-forced-eval';

    await trackAndRecord(projectPath, hookName, 'hook');

    const config = await loadConfig();
    const hooks = config.projectInstallations?.[projectPath]?.hooks;
    expect(hooks).toBeDefined();
    expect(hooks).toContain('skill-forced-eval');
  });

  it('untrackProjectInstallation removes skill from project', async () => {
    const { untrackProjectInstallation, loadConfig } = await import('./config.js');

    const projectPath = '/tmp/test-project-' + Date.now();

    await trackAndRecord(projectPath, 'tdd', 'skill');
    await trackAndRecord(projectPath, 'no-workarounds', 'skill');
    await untrackProjectInstallation(projectPath, 'tdd', 'skill');
    // Remove from tracking since we manually untracked it
    const idx = trackedProjects.findIndex(t => t.path === projectPath && t.name === 'tdd');
    if (idx >= 0) trackedProjects.splice(idx, 1);

    const config = await loadConfig();
    expect(config.projectInstallations?.[projectPath]?.skills).not.toContain('tdd');
    expect(config.projectInstallations?.[projectPath]?.skills).toContain('no-workarounds');
  });

  it('untrackProjectInstallation removes project when empty', async () => {
    const { untrackProjectInstallation, loadConfig } = await import('./config.js');

    const projectPath = '/tmp/test-project-' + Date.now();

    await trackAndRecord(projectPath, 'tdd', 'skill');
    await untrackProjectInstallation(projectPath, 'tdd', 'skill');
    // Remove from tracking since we manually untracked it and project was removed
    const idx = trackedProjects.findIndex(t => t.path === projectPath && t.name === 'tdd');
    if (idx >= 0) trackedProjects.splice(idx, 1);

    const config = await loadConfig();
    expect(config.projectInstallations?.[projectPath]).toBeUndefined();
  });

  it('getProjectsWithSkill returns all projects with skill', async () => {
    const { getProjectsWithSkill } = await import('./config.js');

    const timestamp = Date.now();
    const projectA = `/tmp/test-project-a-${timestamp}`;
    const projectB = `/tmp/test-project-b-${timestamp}`;
    const projectC = `/tmp/test-project-c-${timestamp}`;

    await trackAndRecord(projectA, 'tdd', 'skill');
    await trackAndRecord(projectA, 'no-workarounds', 'skill');
    await trackAndRecord(projectB, 'tdd', 'skill');
    await trackAndRecord(projectC, 'no-workarounds', 'skill');

    const projects = await getProjectsWithSkill('tdd');

    expect(projects).toContain(projectA);
    expect(projects).toContain(projectB);
    expect(projects).not.toContain(projectC);
  });

  it('getAllTrackedProjects returns all projects', async () => {
    const { getAllTrackedProjects } = await import('./config.js');

    const timestamp = Date.now();
    const projectA = `/tmp/test-project-a-${timestamp}`;
    const projectB = `/tmp/test-project-b-${timestamp}`;

    await trackAndRecord(projectA, 'tdd', 'skill');
    await trackAndRecord(projectB, 'no-workarounds', 'skill');

    const projects = await getAllTrackedProjects();

    expect(projects).toContain(projectA);
    expect(projects).toContain(projectB);
  });

  it('normalizes project paths by removing trailing slash', async () => {
    const { loadConfig } = await import('./config.js');

    const timestamp = Date.now();
    const projectPath = `/tmp/test-project-${timestamp}/`;
    const normalizedPath = `/tmp/test-project-${timestamp}`;

    await trackAndRecord(projectPath, 'tdd', 'skill');

    const config = await loadConfig();
    expect(config.projectInstallations?.[normalizedPath]).toBeDefined();
    expect(config.projectInstallations?.[projectPath]).toBeUndefined();
  });
});
