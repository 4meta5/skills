import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { PreToolUseHook, checkPreToolUse } from './pre-tool-use.js';
import { StateManager } from '../session/index.js';
import type { SkillSpec, SessionState } from '../types/index.js';

describe('PreToolUseHook', () => {
  let testDir: string;
  let stateManager: StateManager;
  let mockSkills: SkillSpec[];

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    stateManager = new StateManager(testDir);

    mockSkills = [
      {
        name: 'tdd',
        skill_path: '.claude/skills/tdd',
        provides: ['test_written', 'test_green'],
        requires: [],
        conflicts: [],
        risk: 'low',
        cost: 'low',
        artifacts: [],
        tool_policy: {
          deny_until: {
            write: { until: 'test_written', reason: 'Tests must be written first' },
            commit: { until: 'test_green', reason: 'Tests must pass first' },
          },
        },
      },
    ];
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('check', () => {
    it('allows tool when no active session', async () => {
      const hook = new PreToolUseHook(testDir, mockSkills);

      const result = await hook.check({ tool: 'Write' });

      expect(result.allowed).toBe(true);
      expect(result.blockedIntents).toBeUndefined();
    });

    it('allows tool when intent is not blocked', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.check({ tool: 'Read' });

      expect(result.allowed).toBe(true);
    });

    it('includes skill guidance when tool is allowed', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written', 'test_green'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.check({ tool: 'Read' });

      expect(result.allowed).toBe(true);
      expect(result.message).toContain('[chain] bug-fix:');
      expect(result.message).toContain('CURRENT: tdd');
      expect(result.message).toContain('Skill(skill: "tdd")');
    });

    it('includes completion message when all capabilities satisfied', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written', 'test_green'],
        capabilities_satisfied: [
          {
            capability: 'test_written',
            satisfied_at: '2024-01-01T00:00:00Z',
            satisfied_by: 'tdd',
            evidence_type: 'file_exists',
          },
          {
            capability: 'test_green',
            satisfied_at: '2024-01-01T00:00:00Z',
            satisfied_by: 'tdd',
            evidence_type: 'command_success',
          },
        ],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.check({ tool: 'Read' });

      expect(result.allowed).toBe(true);
      expect(result.message).toContain('[chain] bug-fix:');
      expect(result.message).toContain('COMPLETE');
    });

    it('blocks tool when intent is blocked', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write: 'Tests must be written first (TDD RED phase)',
        },
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.check({ tool: 'Write' });

      expect(result.allowed).toBe(false);
      expect(result.blockedIntents).toHaveLength(1);
      expect(result.blockedIntents![0].intent).toBe('write');
      expect(result.message).toContain('CHAIN ENFORCEMENT: BLOCKED');
    });

    it('blocks Bash git commit when commit intent is blocked', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_green'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          commit: 'Tests must pass first',
        },
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.check({
        tool: 'Bash',
        input: { command: 'git commit -m "message"' },
      });

      expect(result.allowed).toBe(false);
      expect(result.blockedIntents).toHaveLength(1);
      expect(result.blockedIntents![0].intent).toBe('commit');
    });
  });

  describe('checkWithExitCode', () => {
    it('returns exit code 0 when allowed', async () => {
      const hook = new PreToolUseHook(testDir, mockSkills);

      const result = await hook.checkWithExitCode({ tool: 'Read' });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });

    it('returns exit code 1 when blocked', async () => {
      const sessionState: SessionState = {
        session_id: 'test-session',
        profile_id: 'bug-fix',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write: 'Tests must be written first',
        },
      };

      await stateManager.create(sessionState);

      const hook = new PreToolUseHook(testDir, mockSkills);
      const result = await hook.checkWithExitCode({ tool: 'Write' });

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('CHAIN ENFORCEMENT: BLOCKED');
    });
  });
});

describe('checkPreToolUse', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('provides standalone function', async () => {
    const mockSkills: SkillSpec[] = [];
    const result = await checkPreToolUse(testDir, mockSkills, { tool: 'Read' });

    expect(result.allowed).toBe(true);
  });
});

describe('auto-activation', () => {
  let testDir: string;
  let stateManager: StateManager;
  let mockSkills: SkillSpec[];
  const mockProfiles = [
    {
      name: 'bug-fix',
      description: 'Workflow for fixing bugs',
      match: ['fix', 'bug', 'broken', 'error'],
      capabilities_required: ['test_written', 'test_green'],
      strictness: 'strict' as const,
      priority: 10,
      completion_requirements: [],
    },
    {
      name: 'new-feature',
      description: 'Workflow for new features',
      match: ['add', 'implement', 'create', 'feature'],
      capabilities_required: ['test_written'],
      strictness: 'strict' as const,
      priority: 5,
      completion_requirements: [],
    },
    {
      name: 'permissive',
      description: 'Default permissive',
      match: [],
      capabilities_required: [],
      strictness: 'permissive' as const,
      priority: 0,
      completion_requirements: [],
    },
  ];

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    stateManager = new StateManager(testDir);

    mockSkills = [
      {
        name: 'tdd',
        skill_path: '.claude/skills/tdd',
        provides: ['test_written', 'test_green'],
        requires: [],
        conflicts: [],
        risk: 'low',
        cost: 'low',
        artifacts: [],
        tool_policy: {
          deny_until: {
            write: { until: 'test_written', reason: 'Tests must be written first' },
          },
        },
      },
    ];
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('auto-activates profile when no session and prompt matches', async () => {
    const hook = new PreToolUseHook(testDir, mockSkills, mockProfiles);

    const result = await hook.check(
      { tool: 'Write' },
      { prompt: 'fix the login bug' }
    );

    // Should have activated bug-fix profile
    const state = await stateManager.loadCurrent();
    expect(state).not.toBeNull();
    expect(state!.profile_id).toBe('bug-fix');
    expect(result.message).toContain('bug-fix');
  });

  it('does not auto-activate when autoSelect is false', async () => {
    const hook = new PreToolUseHook(testDir, mockSkills, mockProfiles);

    const result = await hook.check(
      { tool: 'Write' },
      { prompt: 'fix the login bug', autoSelect: false }
    );

    // Should not have activated any profile
    const state = await stateManager.loadCurrent();
    expect(state).toBeNull();
    expect(result.allowed).toBe(true);
  });

  it('does not auto-activate when prompt does not match any profile', async () => {
    const hook = new PreToolUseHook(testDir, mockSkills, mockProfiles);

    const result = await hook.check(
      { tool: 'Read' },
      { prompt: 'hello world' }
    );

    const state = await stateManager.loadCurrent();
    expect(state).toBeNull();
    expect(result.allowed).toBe(true);
  });

  it('persists profile selection for subsequent calls', async () => {
    const hook = new PreToolUseHook(testDir, mockSkills, mockProfiles);

    // First call - should auto-activate
    await hook.check({ tool: 'Read' }, { prompt: 'fix the bug' });

    // Second call without prompt - should use persisted profile
    const result = await hook.check({ tool: 'Write' });

    const state = await stateManager.loadCurrent();
    expect(state).not.toBeNull();
    expect(state!.profile_id).toBe('bug-fix');
  });

  it('includes auto-activation info in message', async () => {
    const hook = new PreToolUseHook(testDir, mockSkills, mockProfiles);

    const result = await hook.check(
      { tool: 'Read' },
      { prompt: 'implement new search feature' }
    );

    expect(result.message).toContain('auto-activated');
    expect(result.message).toContain('new-feature');
  });
});
