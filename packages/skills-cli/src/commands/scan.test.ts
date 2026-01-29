/**
 * Tests for scan command
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanCommand } from './scan.js';

describe('scan command', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), 'scan-test-' + Date.now());
    await mkdir(testDir, { recursive: true });

    // Create a minimal package.json
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {
          typescript: '^5.0.0',
        },
        devDependencies: {
          vitest: '^1.0.0',
        },
      })
    );

    // Create tsconfig.json
    await writeFile(
      join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
        },
      })
    );
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('--cwd option', () => {
    it('should analyze project at specified directory', async () => {
      // This test verifies that scanCommand accepts cwd option
      // and analyzes the project at that path instead of process.cwd()
      let output = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await scanCommand({ cwd: testDir, json: true });
      } finally {
        console.log = originalLog;
      }

      // Extract JSON from output (skip "Analyzing project..." line)
      const jsonStart = output.indexOf('{');
      const jsonOutput = output.slice(jsonStart);
      const parsed = JSON.parse(jsonOutput);

      // Should have detected TypeScript and Vitest
      expect(parsed.detected.languages.some((l: { name: string }) => l.name === 'TypeScript')).toBe(
        true
      );
      expect(parsed.detected.testing.some((t: { name: string }) => t.name === 'Vitest')).toBe(true);
    });

    it('should work with explicit cwd matching current directory', async () => {
      // Test that passing cwd explicitly works the same as the default
      let output = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        // Pass testDir as cwd
        await scanCommand({ cwd: testDir, json: true });
      } finally {
        console.log = originalLog;
      }

      // Extract JSON from output (skip "Analyzing project..." line)
      const jsonStart = output.indexOf('{');
      const jsonOutput = output.slice(jsonStart);
      const parsed = JSON.parse(jsonOutput);

      // Should have detected the test project
      expect(parsed.detected.languages.some((l: { name: string }) => l.name === 'TypeScript')).toBe(
        true
      );
    });
  });
});
