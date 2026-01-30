import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { StopHook, checkStop } from './stop-hook.js';
import { StateManager } from '../session/index.js';
import type { SessionState, ProfileSpec } from '../types/index.js';

describe('StopHook', () => {
  let testDir: string;
  let stateManager: StateManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    stateManager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('check', () => {
    it('allows stop when no active session', async () => {
      const hook = new StopHook(testDir);

      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });

    it('allows stop when strictness is not strict', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'permissive',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'permissive',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const hook = new StopHook(testDir);
      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });

    it('allows stop when no completion requirements', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const hook = new StopHook(testDir, null);
      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });

    it('allows stop when all requirements are satisfied', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      // Create the required file
      await writeFile(join(testDir, 'test.ts'), 'content');

      const profile: ProfileSpec = {
        name: 'bug-fix',
        match: ['fix'],
        capabilities_required: [],
        strictness: 'strict',
        priority: 0,
        completion_requirements: [
          {
            name: 'test_file',
            type: 'file_exists',
            pattern: 'test.ts',
            expected_exit_code: 0,
          },
        ],
      };

      const hook = new StopHook(testDir, profile);
      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });

    it('blocks stop when requirements are not satisfied', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const profile: ProfileSpec = {
        name: 'bug-fix',
        match: ['fix'],
        capabilities_required: [],
        strictness: 'strict',
        priority: 0,
        completion_requirements: [
          {
            name: 'test_file',
            type: 'file_exists',
            description: 'Test file must exist',
            pattern: 'missing.ts',
            expected_exit_code: 0,
          },
        ],
      };

      const hook = new StopHook(testDir, profile);
      const result = await hook.check();

      expect(result.allowed).toBe(false);
      expect(result.missingRequirements).toHaveLength(1);
      expect(result.missingRequirements![0].requirement.name).toBe('test_file');
      expect(result.message).toContain('CHAIN ENFORCEMENT: STOP BLOCKED');
    });

    it('checks marker_found requirements', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);
      await writeFile(join(testDir, 'PLAN.md'), '- [x] Task complete');

      const profile: ProfileSpec = {
        name: 'bug-fix',
        match: ['fix'],
        capabilities_required: [],
        strictness: 'strict',
        priority: 0,
        completion_requirements: [
          {
            name: 'task_complete',
            type: 'marker_found',
            file: 'PLAN.md',
            pattern: '\\[x\\]',
            expected_exit_code: 0,
          },
        ],
      };

      const hook = new StopHook(testDir, profile);
      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });

    it('checks command_success requirements', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const profile: ProfileSpec = {
        name: 'bug-fix',
        match: ['fix'],
        capabilities_required: [],
        strictness: 'strict',
        priority: 0,
        completion_requirements: [
          {
            name: 'echo_works',
            type: 'command_success',
            command: 'echo "hello"',
            expected_exit_code: 0,
          },
        ],
      };

      const hook = new StopHook(testDir, profile);
      const result = await hook.check();

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkWithExitCode', () => {
    it('returns exit code 0 when allowed', async () => {
      const hook = new StopHook(testDir);

      const result = await hook.checkWithExitCode();

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });

    it('returns exit code 1 when blocked', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: [],
        capabilities_required: [],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const profile: ProfileSpec = {
        name: 'bug-fix',
        match: ['fix'],
        capabilities_required: [],
        strictness: 'strict',
        priority: 0,
        completion_requirements: [
          {
            name: 'missing_file',
            type: 'file_exists',
            pattern: 'nonexistent.ts',
            expected_exit_code: 0,
          },
        ],
      };

      const hook = new StopHook(testDir, profile);
      const result = await hook.checkWithExitCode();

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('CHAIN ENFORCEMENT: STOP BLOCKED');
    });
  });
});

describe('checkStop', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('provides standalone function', async () => {
    const result = await checkStop(testDir);

    expect(result.allowed).toBe(true);
  });
});
