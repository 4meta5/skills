import { describe, it, expect, beforeEach } from 'vitest';
import { createEnforcer } from './enforcer.js';
import { TDD_PROFILE, CODE_REVIEW_PROFILE } from './profiles.js';
import type { EnforcerProfile, Enforcer } from './types.js';

describe('createEnforcer', () => {
  describe('with TDD profile', () => {
    let enforcer: Enforcer;

    beforeEach(() => {
      enforcer = createEnforcer(TDD_PROFILE);
    });

    it('starts in RED phase', () => {
      const state = enforcer.getState();
      expect(state.currentPhase).toBe('red');
    });

    it('blocks write_impl in RED phase', () => {
      const result = enforcer.isAllowed('write_impl');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Blocked');
    });

    it('allows write_test in RED phase', () => {
      const result = enforcer.isAllowed('write_test');
      expect(result.allowed).toBe(true);
    });

    it('allows read in all phases', () => {
      expect(enforcer.isAllowed('read').allowed).toBe(true);
    });

    it('allows run in all phases', () => {
      expect(enforcer.isAllowed('run').allowed).toBe(true);
    });

    it('transitions to GREEN when failing_test is satisfied', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
        evidence: {
          satisfiedBy: 'test_runner',
          evidenceType: 'command_success',
        },
      });

      const state = enforcer.getState();
      expect(state.currentPhase).toBe('green');
    });

    it('allows write_impl in GREEN phase', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const result = enforcer.isAllowed('write_impl');
      expect(result.allowed).toBe(true);
    });

    it('still blocks commit in GREEN phase', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const result = enforcer.isAllowed('commit');
      expect(result.allowed).toBe(false);
    });

    it('transitions to REFACTOR when passing_test is satisfied', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'passing_test',
      });

      const state = enforcer.getState();
      expect(state.currentPhase).toBe('refactor');
    });

    it('allows commit in REFACTOR phase', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'passing_test',
      });

      const result = enforcer.isAllowed('commit');
      expect(result.allowed).toBe(true);
    });

    it('records capability evidence', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
        evidence: {
          satisfiedBy: 'vitest',
          evidenceType: 'command_success',
          evidencePath: 'src/test.ts',
        },
      });

      const state = enforcer.getState();
      expect(state.satisfiedCapabilities).toHaveLength(1);
      expect(state.satisfiedCapabilities[0].capability).toBe('failing_test');
      expect(state.satisfiedCapabilities[0].satisfiedBy).toBe('vitest');
    });

    it('does not duplicate capabilities', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const state = enforcer.getState();
      expect(state.satisfiedCapabilities).toHaveLength(1);
    });

    it('resets to initial state', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });
      enforcer.reset();

      const state = enforcer.getState();
      expect(state.currentPhase).toBe('red');
      expect(state.satisfiedCapabilities).toHaveLength(0);
    });

    it('tracks event history', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const state = enforcer.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].type).toBe('capability_satisfied');
    });

    it('returns blocked reason', () => {
      const reason = enforcer.getBlockedReason('write_impl');
      expect(reason).toBeTruthy();
      expect(reason).toContain('Blocked');
    });

    it('returns null for non-blocked intent', () => {
      const reason = enforcer.getBlockedReason('write_test');
      expect(reason).toBeNull();
    });

    it('gets unsatisfied capabilities', () => {
      const unsatisfied = enforcer.getUnsatisfiedCapabilities();
      expect(unsatisfied).toContain('failing_test');
      expect(unsatisfied).toContain('passing_test');
      expect(unsatisfied).toContain('refactored');
    });

    it('removes satisfied capability from unsatisfied list', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const unsatisfied = enforcer.getUnsatisfiedCapabilities();
      expect(unsatisfied).not.toContain('failing_test');
    });

    it('checks if capability is satisfied', () => {
      expect(enforcer.isCapabilitySatisfied('failing_test')).toBe(false);

      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      expect(enforcer.isCapabilitySatisfied('failing_test')).toBe(true);
    });

    it('can complete phase directly', () => {
      enforcer.transition({
        type: 'phase_complete',
        phase: 'red',
      });

      const state = enforcer.getState();
      expect(state.currentPhase).toBe('green');
      expect(enforcer.isCapabilitySatisfied('failing_test')).toBe(true);
    });
  });

  describe('with CODE_REVIEW profile (advisory mode)', () => {
    let enforcer: Enforcer;

    beforeEach(() => {
      enforcer = createEnforcer(CODE_REVIEW_PROFILE);
    });

    it('starts in draft phase', () => {
      expect(enforcer.getState().currentPhase).toBe('draft');
    });

    it('allows most intents in draft phase', () => {
      expect(enforcer.isAllowed('write_impl').allowed).toBe(true);
      expect(enforcer.isAllowed('write_test').allowed).toBe(true);
      expect(enforcer.isAllowed('commit').allowed).toBe(true);
    });

    it('blocks push in draft phase (high-impact)', () => {
      const result = enforcer.isAllowed('push');
      expect(result.allowed).toBe(false);
    });

    it('transitions to review phase', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'code_complete',
      });

      expect(enforcer.getState().currentPhase).toBe('review');
    });

    it('allows push in review phase', () => {
      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'code_complete',
      });

      expect(enforcer.isAllowed('push').allowed).toBe(true);
    });
  });

  describe('with custom profile', () => {
    const customProfile: EnforcerProfile = {
      name: 'custom',
      strictness: 'permissive',
      initialPhase: 'start',
      phases: {
        start: {
          name: 'start',
          provides: ['started'],
          requires: [],
          blockedIntents: ['commit'],
          allowedIntents: ['write', 'read'],
        },
        end: {
          name: 'end',
          provides: ['done'],
          requires: ['started'],
          blockedIntents: [],
          allowedIntents: ['commit', 'read'],
        },
      },
    };

    it('works with custom profile', () => {
      const enforcer = createEnforcer(customProfile);
      expect(enforcer.getState().currentPhase).toBe('start');
    });

    it('permissive mode allows blocked intents', () => {
      const enforcer = createEnforcer(customProfile);
      const result = enforcer.isAllowed('commit');

      // Permissive mode allows everything
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('permissive');
    });
  });

  describe('state immutability', () => {
    it('returns new state object on transition', () => {
      const enforcer = createEnforcer(TDD_PROFILE);
      const state1 = enforcer.getState();

      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const state2 = enforcer.getState();
      expect(state1).not.toBe(state2);
      expect(state1.currentPhase).toBe('red');
      expect(state2.currentPhase).toBe('green');
    });

    it('returns new blocked intents map', () => {
      const enforcer = createEnforcer(TDD_PROFILE);
      const state1 = enforcer.getState();
      const blocked1 = state1.blockedIntents;

      enforcer.transition({
        type: 'capability_satisfied',
        capability: 'failing_test',
      });

      const state2 = enforcer.getState();
      const blocked2 = state2.blockedIntents;

      expect(blocked1).not.toBe(blocked2);
    });
  });
});
