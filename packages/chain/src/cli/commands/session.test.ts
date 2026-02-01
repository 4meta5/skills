import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { StateManager } from '../../session/state-manager.js';

describe('chain explain --session', () => {
  let testDir: string;
  let stateManager: StateManager;

  beforeEach(() => {
    testDir = join(tmpdir(), `chain-session-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    stateManager = new StateManager(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('explainSession', () => {
    it('returns blocked intents with reasons', async () => {
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written', 'test_green'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {
          write_impl: 'Write a failing test first (TDD RED phase)',
          commit: 'Tests must pass before committing',
        },
      });

      const { explainSession } = await import('./session.js');
      const result = await explainSession('test-session', testDir);

      expect(result!.session_id).toBe('test-session');
      expect(result!.blocked).toHaveLength(2);
      expect(result!.blocked).toContainEqual({
        intent: 'write_impl',
        reason: 'Write a failing test first (TDD RED phase)',
        short_reason: 'TDD RED phase',
      });
      expect(result!.blocked).toContainEqual({
        intent: 'commit',
        reason: 'Tests must pass before committing',
        short_reason: 'Tests must pass',
      });
    });

    it('returns empty blocked array when no blocks', async () => {
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [{
          capability: 'test_written',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        }],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: {},
      });

      const { explainSession } = await import('./session.js');
      const result = await explainSession('test-session', testDir);

      expect(result!.blocked).toHaveLength(0);
      expect(result!.status).toBe('complete'); // All capabilities satisfied
    });

    it('returns null for non-existent session', async () => {
      const { explainSession } = await import('./session.js');
      const result = await explainSession('nonexistent', testDir);

      expect(result).toBeNull();
    });

    it('includes progress information', async () => {
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: new Date().toISOString(),
        chain: ['tdd', 'doc-maintenance'],
        capabilities_required: ['test_written', 'test_green', 'docs_updated'],
        capabilities_satisfied: [{
          capability: 'test_written',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        }],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: { commit: 'Tests must pass' },
      });

      const { explainSession } = await import('./session.js');
      const result = await explainSession('test-session', testDir);

      expect(result!.progress).toEqual({
        satisfied: 1,
        required: 3,
        percent: 33,
      });
      expect(result!.current_skill).toBe('tdd');
      expect(result!.next_capability).toBe('test_green');
    });
  });

  describe('getSessionState', () => {
    it('returns full session state as JSON-serializable object', async () => {
      const createdAt = new Date().toISOString();
      await stateManager.create({
        session_id: 'test-session',
        profile_id: 'tdd',
        activated_at: createdAt,
        chain: ['tdd'],
        capabilities_required: ['test_written'],
        capabilities_satisfied: [],
        current_skill_index: 0,
        strictness: 'strict',
        blocked_intents: { write_impl: 'Test first' },
      });

      const { getSessionState } = await import('./session.js');
      const result = await getSessionState('test-session', testDir);

      expect(result).not.toBeNull();
      expect(result!.session_id).toBe('test-session');
      expect(result!.profile_id).toBe('tdd');
      expect(result!.activated_at).toBe(createdAt);
      expect(result!.chain).toEqual(['tdd']);
      expect(result!.blocked_intents).toEqual({ write_impl: 'Test first' });
    });

    it('returns null for non-existent session', async () => {
      const { getSessionState } = await import('./session.js');
      const result = await getSessionState('nonexistent', testDir);

      expect(result).toBeNull();
    });
  });

  describe('extractShortReason', () => {
    it('extracts parenthetical content as short reason', async () => {
      const { extractShortReason } = await import('./session.js');

      expect(extractShortReason('Write a failing test first (TDD RED phase)')).toBe('TDD RED phase');
      expect(extractShortReason('Tests must pass (GREEN phase)')).toBe('GREEN phase');
    });

    it('truncates long reasons without parentheses', async () => {
      const { extractShortReason } = await import('./session.js');

      expect(extractShortReason('Tests must pass before committing')).toBe('Tests must pass');
      expect(extractShortReason('Short')).toBe('Short');
    });

    it('handles empty and undefined', async () => {
      const { extractShortReason } = await import('./session.js');

      expect(extractShortReason('')).toBe('');
      expect(extractShortReason(undefined as unknown as string)).toBe('');
    });
  });
});

describe('deterministic short reasons', () => {
  it('produces consistent short reasons for common blocks', async () => {
    const { extractShortReason } = await import('./session.js');

    // These should produce stable, predictable short reasons
    const testCases = [
      ['Write a failing test first (TDD RED phase)', 'TDD RED phase'],
      ['Tests must pass before committing (TDD GREEN phase)', 'TDD GREEN phase'],
      ['Documentation must be updated after changes', 'Documentation must be updated'],
      ['Security review required before deployment', 'Security review required'],
      ['Code review approval needed', 'Code review approval needed'],
    ];

    for (const [input, expected] of testCases) {
      expect(extractShortReason(input)).toBe(expected);
    }
  });
});
