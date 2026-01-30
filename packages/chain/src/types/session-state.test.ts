import { describe, it, expect } from 'vitest';
import {
  CapabilityEvidence,
  BlockedIntent,
  SessionState,
  ResolutionResult,
} from './session-state.js';

describe('SessionState schemas', () => {
  describe('CapabilityEvidence', () => {
    it('parses valid evidence', () => {
      const evidence = CapabilityEvidence.parse({
        capability: 'test_written',
        satisfied_at: '2026-01-30T12:00:00Z',
        satisfied_by: 'tdd',
        evidence_type: 'file_exists',
        evidence_path: 'src/foo.test.ts',
      });
      expect(evidence.capability).toBe('test_written');
      expect(evidence.satisfied_by).toBe('tdd');
    });

    it('allows omitting evidence_path', () => {
      const evidence = CapabilityEvidence.parse({
        capability: 'test_written',
        satisfied_at: '2026-01-30T12:00:00Z',
        satisfied_by: 'tdd',
        evidence_type: 'manual',
      });
      expect(evidence.evidence_path).toBeUndefined();
    });
  });

  describe('BlockedIntent', () => {
    it('parses valid blocked intent', () => {
      const blocked = BlockedIntent.parse({
        intent: 'write',
        reason: 'TDD RED phase requires test first',
        blocked_until: 'test_written',
      });
      expect(blocked.intent).toBe('write');
      expect(blocked.blocked_until).toBe('test_written');
    });
  });

  describe('SessionState', () => {
    it('parses minimal session state', () => {
      const state = SessionState.parse({
        session_id: 'abc123',
        profile_id: 'bug-fix',
        activated_at: '2026-01-30T12:00:00Z',
        chain: ['tdd', 'doc-maintenance'],
        capabilities_required: ['test_written', 'test_green'],
        strictness: 'strict',
      });
      expect(state.session_id).toBe('abc123');
      expect(state.chain).toEqual(['tdd', 'doc-maintenance']);
      expect(state.capabilities_satisfied).toEqual([]);
      expect(state.current_skill_index).toBe(0);
      expect(state.blocked_intents).toEqual({});
    });

    it('parses complete session state', () => {
      const state = SessionState.parse({
        session_id: 'abc123',
        profile_id: 'bug-fix',
        activated_at: '2026-01-30T12:00:00Z',
        chain: ['tdd', 'doc-maintenance'],
        capabilities_required: ['test_written', 'test_green'],
        capabilities_satisfied: [
          {
            capability: 'test_written',
            satisfied_at: '2026-01-30T12:05:00Z',
            satisfied_by: 'tdd',
            evidence_type: 'file_exists',
            evidence_path: 'src/foo.test.ts',
          },
        ],
        current_skill_index: 1,
        strictness: 'strict',
        blocked_intents: {
          commit: 'Must satisfy test_green first',
        },
      });
      expect(state.capabilities_satisfied).toHaveLength(1);
      expect(state.current_skill_index).toBe(1);
      expect(state.blocked_intents.commit).toBe('Must satisfy test_green first');
    });
  });

  describe('ResolutionResult', () => {
    it('parses valid resolution result', () => {
      const result = ResolutionResult.parse({
        chain: ['tdd', 'doc-maintenance', 'repo-hygiene'],
        explanations: [
          {
            skill: 'tdd',
            reason: 'Provides test_written, test_green',
            provides: ['test_written', 'test_green'],
            requires: [],
          },
          {
            skill: 'doc-maintenance',
            reason: 'Provides docs_updated',
            provides: ['docs_updated'],
            requires: ['test_green'],
          },
        ],
        blocked_intents: {
          write: 'TDD RED phase',
          commit: 'TDD GREEN phase',
        },
      });
      expect(result.chain).toHaveLength(3);
      expect(result.explanations).toHaveLength(2);
      expect(result.warnings).toEqual([]);
    });

    it('includes warnings when present', () => {
      const result = ResolutionResult.parse({
        chain: ['tdd'],
        explanations: [],
        blocked_intents: {},
        warnings: ['No skill provides capability: unknown_cap'],
      });
      expect(result.warnings).toContain('No skill provides capability: unknown_cap');
    });
  });
});
