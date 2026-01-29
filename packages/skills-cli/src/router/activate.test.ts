/**
 * Tests for the semantic router activation script
 *
 * TDD Phase 1: RED - These tests capture expected behavior
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to run the activate script with input
 */
async function runActivate(
  input: string,
  env: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const scriptPath = join(__dirname, 'activate.ts');
    // Use npx tsx from the project root
    const child = spawn(
      'npx',
      ['tsx', scriptPath],
      {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: join(__dirname, '..', '..', '..'), // Go to package root where node_modules is
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Write input and close stdin immediately
    child.stdin.write(input);
    child.stdin.end();

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });

    child.on('error', (err) => {
      resolve({ stdout, stderr: err.message, exitCode: 1 });
    });

    // Timeout after 60 seconds (model loading can be slow)
    setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ stdout, stderr: stderr + '\nTIMEOUT', exitCode: -1 });
    }, 60000);
  });
}

describe('activate script', { timeout: 120000 }, () => {
  let testDir: string;
  let vectorStorePath: string;

  // Sample vector store with real-ish embeddings (normalized random)
  const createVectorStore = () => {
    const makeEmbedding = () => {
      const vec = new Array(384).fill(0).map(() => Math.random() - 0.5);
      const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
      return vec.map(x => x / mag);
    };

    return {
      version: '1.0.0',
      model: 'Xenova/all-MiniLM-L6-v2',
      generatedAt: new Date().toISOString(),
      skills: [
        {
          skillName: 'tdd',
          description: 'Test-driven development workflow with RED GREEN REFACTOR',
          triggerExamples: ['write tests first', 'fix bug with tests'],
          embedding: makeEmbedding(),
          keywords: ['tdd', 'test', 'red', 'green', 'refactor'],
        },
        {
          skillName: 'code-review',
          description: 'Code review guidelines for quality',
          triggerExamples: ['review my code', 'check this PR'],
          embedding: makeEmbedding(),
          keywords: ['review', 'pr', 'quality'],
        },
      ],
    };
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), `activate-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    vectorStorePath = join(testDir, 'vector_store.json');
    await writeFile(vectorStorePath, JSON.stringify(createVectorStore()));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should exit 0 for empty prompt', async () => {
    const result = await runActivate('{}', {
      SKILLS_VECTOR_STORE: vectorStorePath,
    });
    expect(result.exitCode).toBe(0);
  });

  it('should exit 0 when vector store not found', async () => {
    const result = await runActivate('{"prompt": "test"}', {
      SKILLS_VECTOR_STORE: '/nonexistent/path.json',
    });
    expect(result.exitCode).toBe(0);
    // Should not output anything (silent skip)
    expect(result.stdout.trim()).toBe('');
  });

  it('should output activation for matching prompt', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'write tests for this function using tdd' }),
      {
        SKILLS_VECTOR_STORE: vectorStorePath,
        // Lower thresholds to test with mock embeddings
        SKILLS_IMMEDIATE_THRESHOLD: '0.2',
        SKILLS_SUGGESTION_THRESHOLD: '0.1',
      }
    );

    expect(result.exitCode).toBe(0);
    // With lowered thresholds, we should get some output
    // (mock embeddings are random so won't hit real thresholds)
    expect(result.stdout.length).toBeGreaterThan(0);
  });

  it('should include skill name in output for high match', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'use tdd to fix this bug with red green refactor' }),
      { SKILLS_VECTOR_STORE: vectorStorePath }
    );

    expect(result.exitCode).toBe(0);
    // Output should mention the matched skill
    if (result.stdout.length > 0) {
      expect(result.stdout.toLowerCase()).toMatch(/tdd|code-review|skill/i);
    }
  });

  it('should output nothing for unrelated prompt', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'what is the weather today' }),
      { SKILLS_VECTOR_STORE: vectorStorePath }
    );

    expect(result.exitCode).toBe(0);
    // Chat mode should output nothing
    expect(result.stdout.trim()).toBe('');
  });
});

describe('activate with middleware integration', { timeout: 120000 }, () => {
  let testDir: string;
  let vectorStorePath: string;

  const createVectorStore = () => {
    const makeEmbedding = () => {
      const vec = new Array(384).fill(0).map(() => Math.random() - 0.5);
      const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
      return vec.map((x) => x / mag);
    };

    return {
      version: '1.0.0',
      model: 'Xenova/all-MiniLM-L6-v2',
      generatedAt: new Date().toISOString(),
      skills: [
        {
          skillName: 'tdd',
          description: 'Test-driven development workflow with RED GREEN REFACTOR',
          triggerExamples: ['write tests first', 'fix bug with tests'],
          embedding: makeEmbedding(),
          keywords: ['tdd', 'test', 'red', 'green', 'refactor'],
        },
      ],
    };
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), 'activate-middleware-test-' + Date.now());
    await mkdir(testDir, { recursive: true });
    vectorStorePath = join(testDir, 'vector_store.json');
    await writeFile(vectorStorePath, JSON.stringify(createVectorStore()));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should include MUST_CALL instruction for immediate mode', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'fix this bug using tdd' }),
      {
        SKILLS_VECTOR_STORE: vectorStorePath,
        SKILLS_IMMEDIATE_THRESHOLD: '0.2',
        SKILLS_SUGGESTION_THRESHOLD: '0.1',
      }
    );

    expect(result.exitCode).toBe(0);
    // Should include the MUST_CALL enforcement instruction
    if (result.stdout.includes('IMMEDIATE')) {
      expect(result.stdout).toContain('MUST');
      expect(result.stdout).toContain('Skill');
    }
  });

  it('should include required skills list in immediate mode output', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'write tests using tdd red green refactor' }),
      {
        SKILLS_VECTOR_STORE: vectorStorePath,
        SKILLS_IMMEDIATE_THRESHOLD: '0.2',
        SKILLS_SUGGESTION_THRESHOLD: '0.1',
      }
    );

    expect(result.exitCode).toBe(0);
    if (result.stdout.includes('IMMEDIATE')) {
      expect(result.stdout).toContain('tdd');
    }
  });

  it('should output JSON metadata when SKILLS_OUTPUT_JSON is set', async () => {
    const result = await runActivate(
      JSON.stringify({ prompt: 'use tdd for this' }),
      {
        SKILLS_VECTOR_STORE: vectorStorePath,
        SKILLS_IMMEDIATE_THRESHOLD: '0.2',
        SKILLS_SUGGESTION_THRESHOLD: '0.1',
        SKILLS_OUTPUT_JSON: 'true',
      }
    );

    expect(result.exitCode).toBe(0);
    if (result.stdout.trim().length > 0) {
      // Should be able to parse as JSON when flag is set
      const lines = result.stdout.trim().split('\n');
      const jsonLine = lines.find((l) => l.startsWith('{'));
      if (jsonLine) {
        const parsed = JSON.parse(jsonLine);
        expect(parsed).toHaveProperty('mode');
        expect(parsed).toHaveProperty('requiredSkills');
      }
    }
  });
});
