import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { DetectionContext, PackageJson, CargoToml, PyProjectToml } from './types.js';
import { detectLanguages } from './language.js';
import { detectFrameworks } from './framework.js';
import { detectDeployment } from './deployment.js';
import { detectTesting } from './testing.js';
import { detectDatabases } from './database.js';
import { analyzeProject } from './index.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

function createContext(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    projectPath: '/test/project',
    configFiles: [],
    ...overrides
  };
}

describe('Language Detector', () => {
  it('detects TypeScript from package.json dependency', async () => {
    const ctx = createContext({
      packageJson: {
        devDependencies: { typescript: '^5.0.0' }
      }
    });

    const result = await detectLanguages(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('TypeScript');
    expect(result[0].confidence).toBe('high');
    expect(result[0].tags).toContain('typescript');
  });

  it('detects TypeScript from tsconfig.json', async () => {
    const ctx = createContext({
      packageJson: { name: 'test' },
      configFiles: ['tsconfig.json']
    });

    const result = await detectLanguages(ctx);

    expect(result.some(l => l.name === 'TypeScript')).toBe(true);
  });

  it('detects Rust from Cargo.toml', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'my-crate', version: '0.1.0' }
      }
    });

    const result = await detectLanguages(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Rust');
    expect(result[0].confidence).toBe('high');
    expect(result[0].tags).toContain('rust');
  });

  it('detects Python from pyproject.toml', async () => {
    const ctx = createContext({
      pyProjectToml: {
        project: { name: 'my-project' }
      }
    });

    const result = await detectLanguages(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Python');
    expect(result[0].confidence).toBe('high');
  });

  it('detects Go from go.mod', async () => {
    const ctx = createContext({
      configFiles: ['go.mod']
    });

    const result = await detectLanguages(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Go');
    expect(result[0].confidence).toBe('high');
  });
});

describe('Framework Detector', () => {
  it('detects Svelte 5 from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { svelte: '^5.0.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Svelte 5');
    expect(result[0].tags).toContain('svelte5');
    expect(result[0].tags).toContain('runes');
  });

  it('detects older Svelte versions', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { svelte: '^4.0.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Svelte');
    expect(result[0].tags).not.toContain('svelte5');
  });

  it('detects SvelteKit 2', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { '@sveltejs/kit': '^2.0.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('SvelteKit 2');
    expect(result[0].tags).toContain('sveltekit2');
  });

  it('detects React', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { react: '^18.2.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('React 18+');
    expect(result[0].tags).toContain('react');
  });

  it('detects Next.js 14+', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { next: '^14.0.0', react: '^18.0.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    const nextjs = result.find(f => f.name.includes('Next.js'));
    expect(nextjs).toBeDefined();
    expect(nextjs!.name).toBe('Next.js 14+');
    expect(nextjs!.tags).toContain('app-router');
  });

  it('detects Hono', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { hono: '^4.0.0' }
      }
    });

    const result = await detectFrameworks(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Hono');
    expect(result[0].tags).toContain('cloudflare');
    expect(result[0].tags).toContain('edge');
  });
});

describe('Deployment Detector', () => {
  it('detects Cloudflare Workers from wrangler.toml', async () => {
    const ctx = createContext({
      configFiles: ['wrangler.toml']
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cloudflare Workers');
    expect(result[0].confidence).toBe('high');
    expect(result[0].tags).toContain('cloudflare');
  });

  it('detects Cloudflare from SvelteKit adapter', async () => {
    const ctx = createContext({
      packageJson: {
        devDependencies: { '@sveltejs/adapter-cloudflare': '^4.0.0' }
      }
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cloudflare Workers');
    expect(result[0].tags).toContain('sveltekit');
  });

  it('detects AWS CDK from cdk.json', async () => {
    const ctx = createContext({
      configFiles: ['cdk.json']
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AWS CDK');
    expect(result[0].tags).toContain('aws');
    expect(result[0].tags).toContain('cdk');
  });

  it('detects AWS SAM from sam.yaml', async () => {
    const ctx = createContext({
      configFiles: ['sam.yaml']
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AWS SAM');
    expect(result[0].tags).toContain('sam');
  });

  it('detects Vercel from vercel.json', async () => {
    const ctx = createContext({
      configFiles: ['vercel.json']
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Vercel');
  });

  it('detects Docker from Dockerfile', async () => {
    const ctx = createContext({
      configFiles: ['Dockerfile']
    });

    const result = await detectDeployment(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Docker');
    expect(result[0].tags).toContain('docker');
  });
});

describe('Testing Detector', () => {
  it('detects Vitest from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        devDependencies: { vitest: '^1.0.0' }
      }
    });

    const result = await detectTesting(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Vitest');
    expect(result[0].tags).toContain('vitest');
  });

  it('detects Jest from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        devDependencies: { jest: '^29.0.0' }
      }
    });

    const result = await detectTesting(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Jest');
    expect(result[0].tags).toContain('jest');
  });

  it('detects Playwright from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        devDependencies: { '@playwright/test': '^1.40.0' }
      }
    });

    const result = await detectTesting(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Playwright');
    expect(result[0].tags).toContain('e2e');
  });

  it('detects Cargo Test for Rust projects', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'test-crate' }
      }
    });

    const result = await detectTesting(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Cargo Test');
    expect(result[0].tags).toContain('rust');
  });
});

describe('Database Detector', () => {
  it('detects Neon Postgres from DATABASE_URL', async () => {
    const ctx = createContext({
      envVars: {
        DATABASE_URL: 'postgresql://user:pass@ep-cool-night-123456.us-east-2.aws.neon.tech/neondb'
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Neon Postgres');
    expect(result[0].tags).toContain('neon');
    expect(result[0].tags).toContain('serverless');
  });

  it('detects Supabase from env vars', async () => {
    const ctx = createContext({
      envVars: {
        SUPABASE_URL: 'https://xyz.supabase.co'
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Supabase');
    expect(result[0].tags).toContain('supabase');
  });

  it('detects Drizzle ORM from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { 'drizzle-orm': '^0.29.0' }
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Drizzle ORM');
    expect(result[0].tags).toContain('drizzle');
  });

  it('detects Prisma from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { '@prisma/client': '^5.0.0' }
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Prisma');
    expect(result[0].tags).toContain('prisma');
  });

  it('detects Neon serverless driver from package.json', async () => {
    const ctx = createContext({
      packageJson: {
        dependencies: { '@neondatabase/serverless': '^0.7.0' }
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Neon Postgres');
  });

  it('detects Redis from env vars', async () => {
    const ctx = createContext({
      envVars: {
        REDIS_URL: 'redis://localhost:6379'
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Redis');
  });

  it('detects Upstash Redis from env vars', async () => {
    const ctx = createContext({
      envVars: {
        UPSTASH_REDIS_REST_URL: 'https://xyz.upstash.io'
      }
    });

    const result = await detectDatabases(ctx);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Upstash Redis');
    expect(result[0].tags).toContain('upstash');
  });
});

describe('Workspace Detection', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = join(tmpdir(), `skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('detects npm workspaces from package.json array format', async () => {
    // Create root package.json with workspaces
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/*']
      })
    );

    // Create workspace packages
    await mkdir(join(testDir, 'packages', 'lib-a'), { recursive: true });
    await mkdir(join(testDir, 'packages', 'lib-b'), { recursive: true });

    // Add TypeScript to lib-a
    await writeFile(
      join(testDir, 'packages', 'lib-a', 'package.json'),
      JSON.stringify({
        name: 'lib-a',
        devDependencies: { typescript: '^5.0.0' }
      })
    );

    // Add Vitest to lib-b
    await writeFile(
      join(testDir, 'packages', 'lib-b', 'package.json'),
      JSON.stringify({
        name: 'lib-b',
        devDependencies: { vitest: '^1.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toBeDefined();
    expect(result.workspaces).toHaveLength(2);
    expect(result.workspaces).toContain('packages/lib-a');
    expect(result.workspaces).toContain('packages/lib-b');

    // Should detect TypeScript from lib-a
    expect(result.languages.some(l => l.name === 'TypeScript')).toBe(true);

    // Should detect Vitest from lib-b
    expect(result.testing.some(t => t.name === 'Vitest')).toBe(true);
  });

  it('detects npm workspaces from package.json object format', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: { packages: ['apps/*'] }
      })
    );

    await mkdir(join(testDir, 'apps', 'web'), { recursive: true });
    await writeFile(
      join(testDir, 'apps', 'web', 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { react: '^18.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toContain('apps/web');
    expect(result.frameworks.some(f => f.name.includes('React'))).toBe(true);
  });

  it('detects pnpm workspaces from pnpm-workspace.yaml', async () => {
    // Root package.json without workspaces field
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'pnpm-monorepo' })
    );

    // pnpm-workspace.yaml
    await writeFile(
      join(testDir, 'pnpm-workspace.yaml'),
      'packages:\n  - "packages/*"\n'
    );

    await mkdir(join(testDir, 'packages', 'core'), { recursive: true });
    await writeFile(
      join(testDir, 'packages', 'core', 'package.json'),
      JSON.stringify({
        name: 'core',
        devDependencies: { jest: '^29.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toContain('packages/core');
    expect(result.testing.some(t => t.name === 'Jest')).toBe(true);
  });

  it('detects lerna workspaces from lerna.json', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'lerna-monorepo' })
    );

    await writeFile(
      join(testDir, 'lerna.json'),
      JSON.stringify({ packages: ['modules/*'] })
    );

    await mkdir(join(testDir, 'modules', 'api'), { recursive: true });
    await writeFile(
      join(testDir, 'modules', 'api', 'package.json'),
      JSON.stringify({
        name: 'api',
        dependencies: { hono: '^4.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toContain('modules/api');
    expect(result.frameworks.some(f => f.name === 'Hono')).toBe(true);
  });

  it('deduplicates same technology across workspaces', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/*'],
        devDependencies: { typescript: '^5.0.0' }
      })
    );

    await mkdir(join(testDir, 'packages', 'a'), { recursive: true });
    await mkdir(join(testDir, 'packages', 'b'), { recursive: true });

    // Both packages have TypeScript
    await writeFile(
      join(testDir, 'packages', 'a', 'package.json'),
      JSON.stringify({
        name: 'a',
        devDependencies: { typescript: '^5.0.0' }
      })
    );
    await writeFile(
      join(testDir, 'packages', 'b', 'package.json'),
      JSON.stringify({
        name: 'b',
        devDependencies: { typescript: '^5.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    // Should only have one TypeScript entry despite being in 3 places
    const typescriptEntries = result.languages.filter(l => l.name === 'TypeScript');
    expect(typescriptEntries).toHaveLength(1);
  });

  it('merges technologies from root and workspaces', async () => {
    // Root has JavaScript/Node.js implied
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: ['packages/*']
      })
    );

    await mkdir(join(testDir, 'packages', 'ts-lib'), { recursive: true });
    await writeFile(
      join(testDir, 'packages', 'ts-lib', 'package.json'),
      JSON.stringify({
        name: 'ts-lib',
        devDependencies: { typescript: '^5.0.0' }
      })
    );

    // Create tsconfig in the workspace
    await writeFile(join(testDir, 'packages', 'ts-lib', 'tsconfig.json'), '{}');

    const result = await analyzeProject(testDir);

    // Should detect TypeScript from workspace
    expect(result.languages.some(l => l.name === 'TypeScript')).toBe(true);
  });

  it('returns undefined workspaces for non-monorepo projects', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'simple-project',
        dependencies: { react: '^18.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toBeUndefined();
  });

  it('handles direct path patterns without globs', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'monorepo',
        workspaces: ['tools/cli']
      })
    );

    await mkdir(join(testDir, 'tools', 'cli'), { recursive: true });
    await writeFile(
      join(testDir, 'tools', 'cli', 'package.json'),
      JSON.stringify({
        name: 'cli',
        devDependencies: { vitest: '^1.0.0' }
      })
    );

    const result = await analyzeProject(testDir);

    expect(result.workspaces).toContain('tools/cli');
    expect(result.testing.some(t => t.name === 'Vitest')).toBe(true);
  });
});

// =============================================================================
// REGRESSION TESTS: Subdirectory and Rust-specific detection
// =============================================================================
// These tests cover bugs where the scanner fails to detect technologies in
// subdirectories like backend/ that aren't JS workspaces, and Rust-specific
// deployment/database/testing libraries.

describe('Subdirectory Detection (Non-JS Workspaces)', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('detects Rust in backend/ directory with Cargo.toml', async () => {
    // Frontend JS project at root
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'fullstack-app',
        dependencies: { svelte: '^5.0.0' }
      })
    );

    // Rust backend (NOT a JS workspace)
    await mkdir(join(testDir, 'backend'), { recursive: true });
    await writeFile(
      join(testDir, 'backend', 'Cargo.toml'),
      `[package]
name = "backend-api"
version = "0.1.0"

[dependencies]
tokio = { version = "1", features = ["full"] }
`
    );

    const result = await analyzeProject(testDir);

    // Should detect Rust from backend/
    expect(result.languages.some(l => l.name === 'Rust')).toBe(true);
    // Should also detect Svelte from root
    expect(result.frameworks.some(f => f.name === 'Svelte 5')).toBe(true);
  });

  it('detects technologies in api/ directory with Cargo.toml', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'web-app' })
    );

    await mkdir(join(testDir, 'api'), { recursive: true });
    await writeFile(
      join(testDir, 'api', 'Cargo.toml'),
      `[package]
name = "api"
version = "0.1.0"
`
    );

    const result = await analyzeProject(testDir);

    expect(result.languages.some(l => l.name === 'Rust')).toBe(true);
  });

  it('detects technologies in server/ directory with go.mod', async () => {
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'web-app' })
    );

    await mkdir(join(testDir, 'server'), { recursive: true });
    await writeFile(
      join(testDir, 'server', 'go.mod'),
      `module example.com/server

go 1.21
`
    );

    const result = await analyzeProject(testDir);

    expect(result.languages.some(l => l.name === 'Go')).toBe(true);
  });
});

describe('Rust AWS Lambda Detection', () => {
  it('detects AWS Lambda from lambda_http in Cargo.toml', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'lambda-api', version: '0.1.0' },
        dependencies: {
          'lambda_http': '0.8',
          'lambda_runtime': '0.8',
          'tokio': { version: '1', features: ['full'] }
        }
      }
    });

    const result = await detectDeployment(ctx);

    expect(result.some(d => d.name === 'AWS Lambda' || d.tags?.includes('lambda'))).toBe(true);
  });

  it('detects AWS Lambda from cargo-lambda config', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'lambda-api', version: '0.1.0' },
        dependencies: {
          'lambda_runtime': '0.8'
        }
      },
      // cargo-lambda uses .cargo-lambda directory or Cargo.toml metadata
      configFiles: ['.cargo-lambda']
    });

    const result = await detectDeployment(ctx);

    expect(result.some(d => d.name === 'AWS Lambda' || d.tags?.includes('lambda'))).toBe(true);
  });
});

describe('Rust SQLx Database Detection', () => {
  it('detects SQLx with Postgres from Cargo.toml', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'db-app', version: '0.1.0' },
        dependencies: {
          'sqlx': { version: '0.7', features: ['runtime-tokio', 'postgres'] }
        }
      }
    });

    const result = await detectDatabases(ctx);

    expect(result.some(d => d.name === 'SQLx' || d.tags?.includes('sqlx'))).toBe(true);
    expect(result.some(d => d.tags?.includes('postgres'))).toBe(true);
  });

  it('detects SQLx with MySQL from Cargo.toml', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'db-app', version: '0.1.0' },
        dependencies: {
          'sqlx': { version: '0.7', features: ['runtime-tokio', 'mysql'] }
        }
      }
    });

    const result = await detectDatabases(ctx);

    expect(result.some(d => d.name === 'SQLx' || d.tags?.includes('sqlx'))).toBe(true);
  });
});

describe('Rust proptest Detection', () => {
  it('detects proptest in dev-dependencies', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'my-crate', version: '0.1.0' },
        'dev-dependencies': {
          'proptest': '1.4'
        }
      }
    });

    const result = await detectTesting(ctx);

    expect(result.some(t => t.name === 'proptest' || t.tags?.includes('property-based'))).toBe(true);
  });

  it('detects proptest-derive in dev-dependencies', async () => {
    const ctx = createContext({
      cargoToml: {
        package: { name: 'my-crate', version: '0.1.0' },
        'dev-dependencies': {
          'proptest': '1.4',
          'proptest-derive': '0.4'
        }
      }
    });

    const result = await detectTesting(ctx);

    expect(result.some(t => t.name === 'proptest' || t.tags?.includes('property-based'))).toBe(true);
  });
});
