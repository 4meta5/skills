import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  analyzeProject,
  getAllTechnologies,
  getAllTags,
  createDetectionContext,
  detectLanguages,
  detectFrameworks,
  detectTesting,
  detectDatabases,
  detectDeployment
} from './index.js';

describe('analyzeProject', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `detector-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('detects TypeScript project', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
        devDependencies: {
          typescript: '^5.0.0'
        }
      })
    );
    await writeFile(join(tempDir, 'tsconfig.json'), '{}');

    const analysis = await analyzeProject(tempDir);

    expect(analysis.languages).toHaveLength(1);
    expect(analysis.languages[0].name).toBe('TypeScript');
    expect(analysis.languages[0].confidence).toBe('high');
  });

  it('detects Svelte 5 project', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'svelte-project',
        dependencies: {
          svelte: '^5.0.0'
        }
      })
    );

    const analysis = await analyzeProject(tempDir);

    const svelte = analysis.frameworks.find(f => f.name === 'Svelte 5');
    expect(svelte).toBeDefined();
    expect(svelte?.tags).toContain('svelte5');
    expect(svelte?.tags).toContain('runes');
  });

  it('detects Vitest testing', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        devDependencies: {
          vitest: '^1.0.0'
        }
      })
    );

    const analysis = await analyzeProject(tempDir);

    expect(analysis.testing).toHaveLength(1);
    expect(analysis.testing[0].name).toBe('Vitest');
  });

  it('detects Cloudflare Workers deployment', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'workers-project' })
    );
    await writeFile(join(tempDir, 'wrangler.toml'), 'name = "my-worker"');

    const analysis = await analyzeProject(tempDir);

    expect(analysis.deployment).toHaveLength(1);
    expect(analysis.deployment[0].name).toBe('Cloudflare Workers');
    expect(analysis.deployment[0].tags).toContain('edge');
  });

  it('detects Prisma database', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'prisma-project',
        dependencies: {
          '@prisma/client': '^5.0.0'
        }
      })
    );

    const analysis = await analyzeProject(tempDir);

    expect(analysis.databases.some(d => d.name === 'Prisma')).toBe(true);
  });

  it('detects existing skills', async () => {
    await mkdir(join(tempDir, '.claude', 'skills', 'tdd'), { recursive: true });
    await writeFile(
      join(tempDir, '.claude', 'skills', 'tdd', 'SKILL.md'),
      '---\nname: tdd\ndescription: TDD workflow\n---\n\nContent'
    );

    const analysis = await analyzeProject(tempDir);

    expect(analysis.existingSkills).toContain('tdd');
  });

  it('returns empty analysis for empty directory', async () => {
    const analysis = await analyzeProject(tempDir);

    expect(analysis.languages).toHaveLength(0);
    expect(analysis.frameworks).toHaveLength(0);
    expect(analysis.testing).toHaveLength(0);
    expect(analysis.databases).toHaveLength(0);
    expect(analysis.deployment).toHaveLength(0);
    expect(analysis.existingSkills).toHaveLength(0);
  });

  it('respects skipWorkspaces option', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/*']
      })
    );
    await mkdir(join(tempDir, 'packages', 'sub'), { recursive: true });
    await writeFile(
      join(tempDir, 'packages', 'sub', 'package.json'),
      JSON.stringify({
        name: 'sub-package',
        dependencies: { react: '^18.0.0' }
      })
    );

    // Without skipWorkspaces (default)
    const withWorkspaces = await analyzeProject(tempDir);
    expect(withWorkspaces.frameworks.some(f => f.name.includes('React'))).toBe(true);

    // With skipWorkspaces
    const withoutWorkspaces = await analyzeProject(tempDir, { skipWorkspaces: true });
    expect(withoutWorkspaces.frameworks.some(f => f.name.includes('React'))).toBe(false);
  });
});

describe('getAllTechnologies', () => {
  it('returns flat list of all technologies', async () => {
    const analysis = {
      languages: [{ name: 'TypeScript', category: 'language' as const, confidence: 'high' as const, evidence: 'test', tags: ['ts'] }],
      frameworks: [{ name: 'React', category: 'framework' as const, confidence: 'high' as const, evidence: 'test', tags: ['react'] }],
      deployment: [],
      testing: [],
      databases: [],
      existingSkills: [],
      projectPath: '/test'
    };

    const all = getAllTechnologies(analysis);

    expect(all).toHaveLength(2);
    expect(all.map(t => t.name)).toContain('TypeScript');
    expect(all.map(t => t.name)).toContain('React');
  });
});

describe('getAllTags', () => {
  it('returns unique tags from all technologies', async () => {
    const analysis = {
      languages: [{ name: 'TypeScript', category: 'language' as const, confidence: 'high' as const, evidence: 'test', tags: ['typescript', 'js'] }],
      frameworks: [{ name: 'React', category: 'framework' as const, confidence: 'high' as const, evidence: 'test', tags: ['react', 'js'] }],
      deployment: [],
      testing: [],
      databases: [],
      existingSkills: [],
      projectPath: '/test'
    };

    const tags = getAllTags(analysis);

    expect(tags).toContain('typescript');
    expect(tags).toContain('react');
    expect(tags).toContain('js');
    // Should be unique
    expect(tags.filter(t => t === 'js')).toHaveLength(1);
  });
});

describe('createDetectionContext', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `ctx-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates context with package.json', async () => {
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: { react: '^18.0.0' } })
    );

    const ctx = await createDetectionContext(tempDir);

    expect(ctx.packageJson?.name).toBe('test');
    expect(ctx.packageJson?.dependencies?.react).toBe('^18.0.0');
    expect(ctx.configFiles).toContain('package.json');
  });

  it('creates context with Cargo.toml', async () => {
    await writeFile(
      join(tempDir, 'Cargo.toml'),
      '[package]\nname = "my-crate"\nversion = "0.1.0"'
    );

    const ctx = await createDetectionContext(tempDir);

    expect(ctx.cargoToml?.package?.name).toBe('my-crate');
    expect(ctx.configFiles).toContain('Cargo.toml');
  });

  it('reads env files', async () => {
    await writeFile(join(tempDir, '.env'), 'DATABASE_URL=postgres://localhost/test');

    const ctx = await createDetectionContext(tempDir);

    expect(ctx.envVars?.DATABASE_URL).toBe('postgres://localhost/test');
  });

  it('respects skipEnvFiles option', async () => {
    await writeFile(join(tempDir, '.env'), 'SECRET=value');

    const ctx = await createDetectionContext(tempDir, { skipEnvFiles: true });

    expect(ctx.envVars).toEqual({});
  });
});

describe('detectLanguages', () => {
  it('detects Rust from Cargo.toml', async () => {
    const ctx = {
      projectPath: '/test',
      cargoToml: {
        package: { name: 'my-crate', version: '0.1.0' }
      },
      configFiles: ['Cargo.toml']
    };

    const languages = await detectLanguages(ctx);

    expect(languages).toHaveLength(1);
    expect(languages[0].name).toBe('Rust');
    expect(languages[0].tags).toContain('rust');
  });

  it('detects Python from requirements.txt', async () => {
    const ctx = {
      projectPath: '/test',
      configFiles: ['requirements.txt']
    };

    const languages = await detectLanguages(ctx);

    expect(languages).toHaveLength(1);
    expect(languages[0].name).toBe('Python');
  });

  it('detects Go from go.mod', async () => {
    const ctx = {
      projectPath: '/test',
      configFiles: ['go.mod']
    };

    const languages = await detectLanguages(ctx);

    expect(languages).toHaveLength(1);
    expect(languages[0].name).toBe('Go');
    expect(languages[0].tags).toContain('golang');
  });
});

describe('detectFrameworks', () => {
  it('detects Next.js 14+', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        dependencies: { next: '^14.0.0' }
      },
      configFiles: ['package.json']
    };

    const frameworks = await detectFrameworks(ctx);

    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].name).toBe('Next.js 14+');
    expect(frameworks[0].tags).toContain('app-router');
    expect(frameworks[0].tags).toContain('server-components');
  });

  it('detects SvelteKit 2', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        dependencies: {
          svelte: '^5.0.0',
          '@sveltejs/kit': '^2.0.0'
        }
      },
      configFiles: ['package.json']
    };

    const frameworks = await detectFrameworks(ctx);

    expect(frameworks.some(f => f.name === 'SvelteKit 2')).toBe(true);
    expect(frameworks.some(f => f.name === 'Svelte 5')).toBe(true);
  });

  it('detects Hono', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        dependencies: { hono: '^3.0.0' }
      },
      configFiles: ['package.json']
    };

    const frameworks = await detectFrameworks(ctx);

    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].name).toBe('Hono');
    expect(frameworks[0].tags).toContain('edge');
  });
});

describe('detectTesting', () => {
  it('detects Playwright', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        devDependencies: { '@playwright/test': '^1.40.0' }
      },
      configFiles: ['package.json']
    };

    const testing = await detectTesting(ctx);

    expect(testing).toHaveLength(1);
    expect(testing[0].name).toBe('Playwright');
    expect(testing[0].tags).toContain('e2e');
  });

  it('detects Testing Library', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        devDependencies: { '@testing-library/react': '^14.0.0' }
      },
      configFiles: ['package.json']
    };

    const testing = await detectTesting(ctx);

    expect(testing.some(t => t.name.includes('Testing Library'))).toBe(true);
  });

  it('detects proptest for Rust', async () => {
    const ctx = {
      projectPath: '/test',
      cargoToml: {
        package: { name: 'test' },
        'dev-dependencies': { proptest: '1.0.0' }
      },
      configFiles: ['Cargo.toml']
    };

    const testing = await detectTesting(ctx);

    expect(testing.some(t => t.name === 'proptest')).toBe(true);
    expect(testing.some(t => t.name === 'Cargo Test')).toBe(true);
  });
});

describe('detectDatabases', () => {
  it('detects Drizzle ORM', async () => {
    const ctx = {
      projectPath: '/test',
      packageJson: {
        dependencies: { 'drizzle-orm': '^0.28.0' }
      },
      configFiles: ['package.json']
    };

    const databases = await detectDatabases(ctx);

    expect(databases).toHaveLength(1);
    expect(databases[0].name).toBe('Drizzle ORM');
  });

  it('detects Neon from env vars', async () => {
    const ctx = {
      projectPath: '/test',
      envVars: { DATABASE_URL: 'postgres://user:pass@db.neon.tech/mydb' },
      configFiles: []
    };

    const databases = await detectDatabases(ctx);

    expect(databases.some(d => d.name === 'Neon Postgres')).toBe(true);
  });

  it('detects SQLx with Postgres from Cargo.toml', async () => {
    const ctx = {
      projectPath: '/test',
      cargoToml: {
        dependencies: {
          sqlx: { version: '0.7', features: ['postgres', 'runtime-tokio'] }
        }
      },
      configFiles: ['Cargo.toml']
    };

    const databases = await detectDatabases(ctx);

    expect(databases).toHaveLength(1);
    expect(databases[0].name).toBe('SQLx (Postgres)');
    expect(databases[0].tags).toContain('postgres');
  });
});

describe('detectDeployment', () => {
  it('detects AWS Lambda from Rust', async () => {
    const ctx = {
      projectPath: '/test',
      cargoToml: {
        dependencies: { lambda_http: '0.8.0' }
      },
      configFiles: ['Cargo.toml']
    };

    const deployment = await detectDeployment(ctx);

    expect(deployment).toHaveLength(1);
    expect(deployment[0].name).toBe('AWS Lambda');
    expect(deployment[0].tags).toContain('cargo-lambda');
  });

  it('detects Vercel from config file', async () => {
    const ctx = {
      projectPath: '/test',
      configFiles: ['vercel.json']
    };

    const deployment = await detectDeployment(ctx);

    expect(deployment).toHaveLength(1);
    expect(deployment[0].name).toBe('Vercel');
  });

  it('detects Docker', async () => {
    const ctx = {
      projectPath: '/test',
      configFiles: ['Dockerfile', 'docker-compose.yml']
    };

    const deployment = await detectDeployment(ctx);

    expect(deployment).toHaveLength(1);
    expect(deployment[0].name).toBe('Docker');
    expect(deployment[0].tags).toContain('containers');
  });
});
