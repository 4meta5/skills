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

  describe('path-aware intent blocking', () => {
    let pathAwareSkills: SkillSpec[];

    beforeEach(() => {
      // TDD skill that blocks implementation writes but allows test writes
      pathAwareSkills = [
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
              write_impl: {
                until: 'test_written',
                reason: 'TDD RED: Write a failing test first',
              },
              commit: { until: 'test_green', reason: 'Tests must pass' },
            },
          },
        },
      ];
    });

    it('blocks writes to implementation files when write_impl is blocked', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      // Create session with write_impl blocked
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'TDD RED: Write a failing test first',
        },
      });

      // Write to implementation file should be blocked
      const result = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.ts' },
      });

      expect(result.allowed).toBe(false);
      expect(result.blockedIntents).toContainEqual({
        intent: 'write_impl',
        reason: 'TDD RED: Write a failing test first',
      });
    });

    it('allows writes to test files even when write_impl is blocked', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      // Create session with write_impl blocked
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'TDD RED: Write a failing test first',
        },
      });

      // Write to test file should be allowed
      const result = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.test.ts' },
      });

      expect(result.allowed).toBe(true);
    });

    it('allows writes to spec files even when write_impl is blocked', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'TDD RED: Write a failing test first',
        },
      });

      const result = await hook.check({
        tool: 'Write',
        input: { path: 'tests/auth.spec.ts' },
      });

      expect(result.allowed).toBe(true);
    });

    it('allows writes to documentation files even when write_impl is blocked', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'TDD RED: Write a failing test first',
        },
      });

      const result = await hook.check({
        tool: 'Write',
        input: { path: 'README.md' },
      });

      expect(result.allowed).toBe(true);
    });

    it('blocks all writes when base write intent is blocked', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      // Block the base 'write' intent instead of write_impl
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'no-workarounds',
        activated_at: new Date().toISOString(),
        chain: ['no-workarounds'],
        capabilities_required: ['tool_verified'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write: 'Fix the tool first',
        },
      });

      // Both test and impl writes should be blocked
      const implResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.ts' },
      });
      expect(implResult.allowed).toBe(false);

      const testResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.test.ts' },
      });
      expect(testResult.allowed).toBe(false);
    });

    it('works with Edit tool', async () => {
      const hook = new PreToolUseHook(testDir, pathAwareSkills);

      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'TDD RED: Write a failing test first',
        },
      });

      // Edit to impl file should be blocked
      const implResult = await hook.check({
        tool: 'Edit',
        input: { path: 'src/index.ts' },
      });
      expect(implResult.allowed).toBe(false);

      // Edit to test file should be allowed
      const testResult = await hook.check({
        tool: 'Edit',
        input: { path: 'src/index.test.ts' },
      });
      expect(testResult.allowed).toBe(true);
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

describe('enforcement tiers', () => {
  let testDir: string;
  let stateManager: StateManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-tier-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    stateManager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('hard tier (default)', () => {
    it('blocks all denied intents', async () => {
      const skills: SkillSpec[] = [
        {
          name: 'tdd',
          skill_path: '.claude/skills/tdd',
          provides: ['test_written'],
          requires: [],
          conflicts: [],
          risk: 'low',
          cost: 'low',
          tier: 'hard',
          artifacts: [],
          tool_policy: {
            deny_until: {
              write_impl: { until: 'test_written', reason: 'Write test first' },
              write_test: { until: 'test_written', reason: 'Should not block' },
            },
          },
        },
      ];

      const hook = new PreToolUseHook(testDir, skills);

      await stateManager.create({
        session_id: 'test',
        profile_id: 'test',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'Write test first',
          write_test: 'Should not block',
        },
      });

      // Both should be blocked in hard tier
      const implResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.ts' },
      });
      expect(implResult.allowed).toBe(false);

      const testResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.test.ts' },
      });
      expect(testResult.allowed).toBe(false);
    });
  });

  describe('soft tier', () => {
    it('blocks high-impact intents but allows low-impact ones', async () => {
      const skills: SkillSpec[] = [
        {
          name: 'suggest-tests',
          skill_path: '.claude/skills/suggest-tests',
          provides: ['test_suggestions'],
          requires: [],
          conflicts: [],
          risk: 'low',
          cost: 'low',
          tier: 'soft',
          artifacts: [],
          tool_policy: {
            deny_until: {
              write_impl: { until: 'test_suggestions', reason: 'Review suggestions first' },
              write_test: { until: 'test_suggestions', reason: 'Review suggestions first' },
            },
          },
        },
      ];

      const hook = new PreToolUseHook(testDir, skills);

      await stateManager.create({
        session_id: 'test',
        profile_id: 'test',
        activated_at: new Date().toISOString(),
        chain: ['suggest-tests'],
        capabilities_required: ['test_suggestions'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'Review suggestions first',
          write_test: 'Review suggestions first',
        },
      });

      // write_impl is high-impact, should be blocked
      const implResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.ts' },
      });
      expect(implResult.allowed).toBe(false);

      // write_test is low-impact, should be allowed in soft tier
      const testResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.test.ts' },
      });
      expect(testResult.allowed).toBe(true);
    });

    it('allows commit to be blocked (high-impact)', async () => {
      const skills: SkillSpec[] = [
        {
          name: 'review-skill',
          skill_path: '.claude/skills/review',
          provides: ['reviewed'],
          requires: [],
          conflicts: [],
          risk: 'low',
          cost: 'low',
          tier: 'soft',
          artifacts: [],
          tool_policy: {
            deny_until: {
              commit: { until: 'reviewed', reason: 'Review before commit' },
            },
          },
        },
      ];

      const hook = new PreToolUseHook(testDir, skills);

      await stateManager.create({
        session_id: 'test',
        profile_id: 'test',
        activated_at: new Date().toISOString(),
        chain: ['review-skill'],
        capabilities_required: ['reviewed'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          commit: 'Review before commit',
        },
      });

      const result = await hook.check({
        tool: 'Bash',
        input: { command: 'git commit -m "test"' },
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('none tier', () => {
    it('never blocks any intents', async () => {
      const skills: SkillSpec[] = [
        {
          name: 'code-review',
          skill_path: '.claude/skills/code-review',
          provides: ['code_reviewed'],
          requires: [],
          conflicts: [],
          risk: 'low',
          cost: 'low',
          tier: 'none',
          artifacts: [],
          tool_policy: {
            deny_until: {
              write_impl: { until: 'code_reviewed', reason: 'Would block if not none' },
              commit: { until: 'code_reviewed', reason: 'Would block if not none' },
            },
          },
        },
      ];

      const hook = new PreToolUseHook(testDir, skills);

      await stateManager.create({
        session_id: 'test',
        profile_id: 'test',
        activated_at: new Date().toISOString(),
        chain: ['code-review'],
        capabilities_required: ['code_reviewed'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'Would block if not none',
          commit: 'Would block if not none',
        },
      });

      // All should be allowed in none tier
      const implResult = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.ts' },
      });
      expect(implResult.allowed).toBe(true);

      const commitResult = await hook.check({
        tool: 'Bash',
        input: { command: 'git commit -m "test"' },
      });
      expect(commitResult.allowed).toBe(true);
    });
  });

  describe('default tier', () => {
    it('defaults to hard tier when not specified', async () => {
      const skills: SkillSpec[] = [
        {
          name: 'tdd',
          skill_path: '.claude/skills/tdd',
          provides: ['test_written'],
          requires: [],
          conflicts: [],
          risk: 'low',
          cost: 'low',
          // No tier specified - should default to 'hard'
          artifacts: [],
          tool_policy: {
            deny_until: {
              write_test: { until: 'test_written', reason: 'Test requirement' },
            },
          },
        },
      ];

      const hook = new PreToolUseHook(testDir, skills);

      await stateManager.create({
        session_id: 'test',
        profile_id: 'test',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_test: 'Test requirement',
        },
      });

      // write_test is low-impact but should be blocked with default hard tier
      const result = await hook.check({
        tool: 'Write',
        input: { path: 'src/index.test.ts' },
      });
      expect(result.allowed).toBe(false);
    });
  });
});
