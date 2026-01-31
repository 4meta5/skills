import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  detectTestRunner,
  detectAllTestRunners,
  TestRunner,
  SUPPORTED_RUNNERS,
} from './test-runner.js';

describe('Test Runner Discovery', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-runner-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectTestRunner', () => {
    describe('Rust/Cargo', () => {
      it('detects Cargo.toml', async () => {
        writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('cargo');
        expect(runner!.command).toBe('cargo test');
        expect(runner!.testPatterns).toContain('**/tests/*.rs');
        expect(runner!.testPatterns).toContain('**/*_test.rs');
      });

      it('detects workspace Cargo.toml', async () => {
        writeFileSync(
          join(tempDir, 'Cargo.toml'),
          '[workspace]\nmembers = ["crates/*"]'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('cargo');
        expect(runner!.command).toBe('cargo test --workspace');
      });
    });

    describe('Go', () => {
      it('detects go.mod', async () => {
        writeFileSync(join(tempDir, 'go.mod'), 'module example.com/test');

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('go');
        expect(runner!.command).toBe('go test ./...');
        expect(runner!.testPatterns).toContain('**/*_test.go');
      });
    });

    describe('Python', () => {
      it('detects pytest from pyproject.toml', async () => {
        writeFileSync(
          join(tempDir, 'pyproject.toml'),
          '[tool.pytest.ini_options]\ntestpaths = ["tests"]'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('pytest');
        expect(runner!.command).toBe('pytest');
        expect(runner!.testPatterns).toContain('**/test_*.py');
        expect(runner!.testPatterns).toContain('**/*_test.py');
      });

      it('detects pytest from pytest.ini', async () => {
        writeFileSync(join(tempDir, 'pytest.ini'), '[pytest]\ntestpaths = tests');

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('pytest');
      });

      it('detects pytest from setup.cfg', async () => {
        writeFileSync(
          join(tempDir, 'setup.cfg'),
          '[tool:pytest]\ntestpaths = tests'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('pytest');
      });
    });

    describe('JavaScript/TypeScript - Vitest', () => {
      it('detects vitest.config.ts', async () => {
        writeFileSync(
          join(tempDir, 'vitest.config.ts'),
          'export default { test: {} }'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('vitest');
        expect(runner!.command).toBe('npx vitest run');
        expect(runner!.testPatterns).toContain('**/*.test.ts');
        expect(runner!.testPatterns).toContain('**/*.spec.ts');
      });

      it('detects vitest from vite.config.ts with test section', async () => {
        writeFileSync(
          join(tempDir, 'vite.config.ts'),
          'export default { test: { globals: true } }'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('vitest');
      });
    });

    describe('JavaScript/TypeScript - Jest', () => {
      it('detects jest.config.js', async () => {
        writeFileSync(
          join(tempDir, 'jest.config.js'),
          'module.exports = { testEnvironment: "node" }'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('jest');
        expect(runner!.command).toBe('npx jest');
        expect(runner!.testPatterns).toContain('**/__tests__/**/*.[jt]s?(x)');
        expect(runner!.testPatterns).toContain('**/*.test.[jt]s?(x)');
      });

      it('detects jest from package.json', async () => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            jest: { testEnvironment: 'node' },
          })
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('jest');
      });
    });

    describe('JavaScript/TypeScript - Mocha', () => {
      it('detects .mocharc.json', async () => {
        writeFileSync(
          join(tempDir, '.mocharc.json'),
          JSON.stringify({ spec: 'test/**/*.js' })
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('mocha');
        expect(runner!.command).toBe('npx mocha');
        expect(runner!.testPatterns).toContain('test/**/*.js');
      });
    });

    describe('Priority', () => {
      it('prefers vitest over jest when both present', async () => {
        writeFileSync(
          join(tempDir, 'vitest.config.ts'),
          'export default { test: {} }'
        );
        writeFileSync(
          join(tempDir, 'jest.config.js'),
          'module.exports = {}'
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner!.name).toBe('vitest');
      });

      it('prefers explicit config over package.json inference', async () => {
        writeFileSync(
          join(tempDir, 'jest.config.js'),
          'module.exports = {}'
        );
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({ scripts: { test: 'vitest' } })
        );

        const runner = await detectTestRunner(tempDir);

        // Explicit jest.config.js wins
        expect(runner!.name).toBe('jest');
      });
    });

    describe('Fallback', () => {
      it('returns null when no test runner detected', async () => {
        // Empty directory
        const runner = await detectTestRunner(tempDir);

        expect(runner).toBeNull();
      });

      it('infers from package.json test script as fallback', async () => {
        writeFileSync(
          join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            scripts: { test: 'node --test' },
          })
        );

        const runner = await detectTestRunner(tempDir);

        expect(runner).not.toBeNull();
        expect(runner!.name).toBe('npm');
        expect(runner!.command).toBe('npm test');
      });
    });
  });

  describe('detectAllTestRunners', () => {
    it('returns all detected runners sorted by confidence', async () => {
      writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          scripts: { test: 'vitest' },
        })
      );
      writeFileSync(join(tempDir, 'vitest.config.ts'), 'export default {}');

      const runners = await detectAllTestRunners(tempDir);

      expect(runners.length).toBeGreaterThanOrEqual(2);
      // Explicit configs should have higher confidence
      expect(runners[0].confidence).toBeGreaterThanOrEqual(runners[1].confidence);
    });

    it('returns empty array when no runners detected', async () => {
      const runners = await detectAllTestRunners(tempDir);

      expect(runners).toEqual([]);
    });
  });

  describe('SUPPORTED_RUNNERS', () => {
    it('exports list of supported runner names', () => {
      expect(SUPPORTED_RUNNERS).toContain('cargo');
      expect(SUPPORTED_RUNNERS).toContain('go');
      expect(SUPPORTED_RUNNERS).toContain('pytest');
      expect(SUPPORTED_RUNNERS).toContain('vitest');
      expect(SUPPORTED_RUNNERS).toContain('jest');
      expect(SUPPORTED_RUNNERS).toContain('mocha');
    });
  });

  describe('TestRunner interface', () => {
    it('has required properties', async () => {
      writeFileSync(join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');

      const runner = await detectTestRunner(tempDir);

      expect(runner).toHaveProperty('name');
      expect(runner).toHaveProperty('command');
      expect(runner).toHaveProperty('testPatterns');
      expect(runner).toHaveProperty('confidence');
      expect(typeof runner!.name).toBe('string');
      expect(typeof runner!.command).toBe('string');
      expect(Array.isArray(runner!.testPatterns)).toBe(true);
      expect(typeof runner!.confidence).toBe('number');
      expect(runner!.confidence).toBeGreaterThanOrEqual(0);
      expect(runner!.confidence).toBeLessThanOrEqual(1);
    });
  });
});
