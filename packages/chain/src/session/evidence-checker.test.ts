import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import {
  EvidenceChecker,
  checkFileExists,
  checkMarkerFound,
  checkCommandSuccess,
} from './evidence-checker.js';

describe('EvidenceChecker', () => {
  let testDir: string;
  let checker: EvidenceChecker;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    checker = new EvidenceChecker(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('checkFileExists', () => {
    it('returns satisfied when file exists', async () => {
      await writeFile(join(testDir, 'test.ts'), 'content');

      const result = await checkFileExists('test.ts', testDir);

      expect(result.satisfied).toBe(true);
      expect(result.evidence_type).toBe('file_exists');
      expect(result.evidence_path).toBe('test.ts');
    });

    it('returns satisfied when glob matches', async () => {
      await mkdir(join(testDir, 'src'), { recursive: true });
      await writeFile(join(testDir, 'src', 'foo.test.ts'), 'content');

      const result = await checkFileExists('**/*.test.ts', testDir);

      expect(result.satisfied).toBe(true);
      expect(result.evidence_path).toContain('test.ts');
    });

    it('returns not satisfied when no match', async () => {
      const result = await checkFileExists('nonexistent.ts', testDir);

      expect(result.satisfied).toBe(false);
      expect(result.error).toContain('No files match');
    });
  });

  describe('checkMarkerFound', () => {
    it('returns satisfied when marker found', async () => {
      await writeFile(join(testDir, 'PLAN.md'), '- [x] Task complete');

      const result = await checkMarkerFound('PLAN.md', '\\[x\\]', testDir);

      expect(result.satisfied).toBe(true);
      expect(result.evidence_type).toBe('marker_found');
    });

    it('returns not satisfied when marker not found', async () => {
      await writeFile(join(testDir, 'PLAN.md'), '- [ ] Task pending');

      const result = await checkMarkerFound('PLAN.md', '\\[x\\]', testDir);

      expect(result.satisfied).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns error when file not found', async () => {
      const result = await checkMarkerFound('nonexistent.md', '\\[x\\]', testDir);

      expect(result.satisfied).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('checkCommandSuccess', () => {
    it('returns satisfied when command succeeds', async () => {
      const result = await checkCommandSuccess('echo "hello"', 0, testDir);

      expect(result.satisfied).toBe(true);
      expect(result.evidence_type).toBe('command_success');
    });

    it('returns not satisfied when command fails', async () => {
      const result = await checkCommandSuccess('exit 1', 0, testDir);

      expect(result.satisfied).toBe(false);
      expect(result.error).toContain('failed');
    });

    it('returns satisfied when exit code matches expected', async () => {
      // Note: This test relies on the shell to return exit code 1
      // Use a command that will fail with exit code 1
      const result = await checkCommandSuccess('false', 1, testDir);

      // 'false' command exits with 1
      expect(result.satisfied).toBe(true);
    });
  });

  describe('EvidenceChecker.checkArtifact', () => {
    it('checks file_exists artifact', async () => {
      await writeFile(join(testDir, 'test.ts'), 'content');

      const result = await checker.checkArtifact({
        name: 'test_file',
        type: 'file_exists',
        pattern: 'test.ts',
        expected_exit_code: 0,
      });

      expect(result.satisfied).toBe(true);
    });

    it('checks marker_found artifact', async () => {
      await writeFile(join(testDir, 'PLAN.md'), '- [x] Done');

      const result = await checker.checkArtifact({
        name: 'plan_marked',
        type: 'marker_found',
        file: 'PLAN.md',
        pattern: '\\[x\\]',
        expected_exit_code: 0,
      });

      expect(result.satisfied).toBe(true);
    });

    it('checks command_success artifact', async () => {
      const result = await checker.checkArtifact({
        name: 'echo_works',
        type: 'command_success',
        command: 'echo ok',
        expected_exit_code: 0,
      });

      expect(result.satisfied).toBe(true);
    });

    it('returns error for manual evidence type', async () => {
      const result = await checker.checkArtifact({
        name: 'manual_check',
        type: 'manual',
        expected_exit_code: 0,
      });

      expect(result.satisfied).toBe(false);
      expect(result.error).toContain('Manual evidence');
    });
  });

  describe('EvidenceChecker.checkAllRequirements', () => {
    it('checks multiple requirements', async () => {
      await writeFile(join(testDir, 'test.ts'), 'content');
      await writeFile(join(testDir, 'PLAN.md'), '- [x] Done');

      const results = await checker.checkAllRequirements([
        { name: 'test_file', type: 'file_exists', pattern: 'test.ts', expected_exit_code: 0 },
        { name: 'plan_marked', type: 'marker_found', file: 'PLAN.md', pattern: '\\[x\\]', expected_exit_code: 0 },
      ]);

      expect(results.get('test_file')?.satisfied).toBe(true);
      expect(results.get('plan_marked')?.satisfied).toBe(true);
    });

    it('reports unsatisfied requirements', async () => {
      const results = await checker.checkAllRequirements([
        { name: 'missing_file', type: 'file_exists', pattern: 'nonexistent.ts', expected_exit_code: 0 },
      ]);

      expect(results.get('missing_file')?.satisfied).toBe(false);
    });
  });

  describe('EvidenceChecker.createEvidence', () => {
    it('creates evidence object from result', () => {
      const result = {
        satisfied: true,
        evidence_type: 'file_exists' as const,
        evidence_path: 'test.ts',
      };

      const evidence = checker.createEvidence('test_written', 'tdd', result);

      expect(evidence.capability).toBe('test_written');
      expect(evidence.satisfied_by).toBe('tdd');
      expect(evidence.evidence_type).toBe('file_exists');
      expect(evidence.evidence_path).toBe('test.ts');
      expect(evidence.satisfied_at).toBeDefined();
    });
  });
});
