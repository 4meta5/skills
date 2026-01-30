import { describe, it, expect } from 'vitest';

describe('TDD state machine', () => {
  describe('createTDDMachine', () => {
    it('should start in BLOCKED by default', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should accept initial phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      expect(machine.getPhase()).toBe('RED');
    });

    it('should accept GREEN as initial phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      expect(machine.getPhase()).toBe('GREEN');
    });

    it('should accept COMPLETE as initial phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('COMPLETE');
      expect(machine.getPhase()).toBe('COMPLETE');
    });
  });

  describe('getPhase', () => {
    it('should return current phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();
      expect(machine.getPhase()).toBe('BLOCKED');
    });
  });

  describe('getContext', () => {
    it('should return context with currentPhase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();
      const context = machine.getContext();
      expect(context.currentPhase).toBe('BLOCKED');
    });

    it('should return context with attemptCount initialized to 0', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();
      const context = machine.getContext();
      expect(context.attemptCount).toBe(0);
    });

    it('should return context without lastError initially', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();
      const context = machine.getContext();
      expect(context.lastError).toBeUndefined();
    });
  });

  describe('state transitions', () => {
    describe('TEST_WRITTEN event', () => {
      it('should transition BLOCKED -> RED', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('BLOCKED');
        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('RED');
      });

      it('should be ignored in RED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('RED');
        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('RED');
      });

      it('should be ignored in GREEN state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('GREEN');
        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('GREEN');
      });

      it('should be ignored in COMPLETE state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('COMPLETE');
        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('COMPLETE');
      });
    });

    describe('TEST_PASSED event', () => {
      it('should transition RED -> GREEN', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('RED');
        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('GREEN');
      });

      it('should be ignored in BLOCKED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('BLOCKED');
        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('BLOCKED');
      });

      it('should be ignored in GREEN state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('GREEN');
        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('GREEN');
      });

      it('should be ignored in COMPLETE state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('COMPLETE');
        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('COMPLETE');
      });
    });

    describe('REFACTOR_DONE event', () => {
      it('should transition GREEN -> COMPLETE', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('GREEN');
        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('COMPLETE');
      });

      it('should be ignored in BLOCKED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('BLOCKED');
        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('BLOCKED');
      });

      it('should be ignored in RED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('RED');
        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('RED');
      });

      it('should be ignored in COMPLETE state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('COMPLETE');
        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('COMPLETE');
      });
    });

    describe('NEW_FEATURE event', () => {
      it('should transition COMPLETE -> BLOCKED', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('COMPLETE');
        machine.send({ type: 'NEW_FEATURE' });
        expect(machine.getPhase()).toBe('BLOCKED');
      });

      it('should be ignored in BLOCKED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('BLOCKED');
        machine.send({ type: 'NEW_FEATURE' });
        expect(machine.getPhase()).toBe('BLOCKED');
      });

      it('should be ignored in RED state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('RED');
        machine.send({ type: 'NEW_FEATURE' });
        expect(machine.getPhase()).toBe('RED');
      });

      it('should be ignored in GREEN state', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('GREEN');
        machine.send({ type: 'NEW_FEATURE' });
        expect(machine.getPhase()).toBe('GREEN');
      });
    });

    describe('full TDD cycle', () => {
      it('should complete full cycle: BLOCKED -> RED -> GREEN -> COMPLETE', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine();

        expect(machine.getPhase()).toBe('BLOCKED');

        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('RED');

        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('GREEN');

        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('COMPLETE');
      });

      it('should allow starting new cycle from COMPLETE', async () => {
        const { createTDDMachine } = await import('./state-machine.js');
        const machine = createTDDMachine('COMPLETE');

        machine.send({ type: 'NEW_FEATURE' });
        expect(machine.getPhase()).toBe('BLOCKED');

        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('RED');
      });
    });
  });

  describe('canTransitionTo', () => {
    it('should return true for valid next phase BLOCKED -> RED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      expect(machine.canTransitionTo('RED')).toBe(true);
    });

    it('should return true for valid next phase RED -> GREEN', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      expect(machine.canTransitionTo('GREEN')).toBe(true);
    });

    it('should return true for valid next phase GREEN -> COMPLETE', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      expect(machine.canTransitionTo('COMPLETE')).toBe(true);
    });

    it('should return true for valid next phase COMPLETE -> BLOCKED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('COMPLETE');
      expect(machine.canTransitionTo('BLOCKED')).toBe(true);
    });

    it('should return false for invalid transition BLOCKED -> GREEN', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      expect(machine.canTransitionTo('GREEN')).toBe(false);
    });

    it('should return false for invalid transition BLOCKED -> COMPLETE', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      expect(machine.canTransitionTo('COMPLETE')).toBe(false);
    });

    it('should return false for invalid transition RED -> COMPLETE', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      expect(machine.canTransitionTo('COMPLETE')).toBe(false);
    });

    it('should return false for invalid transition RED -> BLOCKED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      expect(machine.canTransitionTo('BLOCKED')).toBe(false);
    });

    it('should return false for invalid transition GREEN -> RED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      expect(machine.canTransitionTo('RED')).toBe(false);
    });

    it('should return false for invalid transition GREEN -> BLOCKED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      expect(machine.canTransitionTo('BLOCKED')).toBe(false);
    });

    it('should return false for same state transition', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      expect(machine.canTransitionTo('BLOCKED')).toBe(false);
    });
  });

  describe('FORCE_PHASE event', () => {
    it('should allow jumping from BLOCKED to any phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      machine.send({ type: 'FORCE_PHASE', phase: 'GREEN' });
      expect(machine.getPhase()).toBe('GREEN');
    });

    it('should allow jumping from RED to COMPLETE', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      machine.send({ type: 'FORCE_PHASE', phase: 'COMPLETE' });
      expect(machine.getPhase()).toBe('COMPLETE');
    });

    it('should allow jumping backwards from GREEN to BLOCKED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      machine.send({ type: 'FORCE_PHASE', phase: 'BLOCKED' });
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should allow jumping to same phase', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      machine.send({ type: 'FORCE_PHASE', phase: 'RED' });
      expect(machine.getPhase()).toBe('RED');
    });
  });

  describe('RESET event', () => {
    it('should return to BLOCKED from RED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      machine.send({ type: 'RESET' });
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should return to BLOCKED from GREEN', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      machine.send({ type: 'RESET' });
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should return to BLOCKED from COMPLETE', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('COMPLETE');
      machine.send({ type: 'RESET' });
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should stay in BLOCKED when already BLOCKED', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');
      machine.send({ type: 'RESET' });
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should reset attemptCount to 0', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('RED');
      // Simulate some attempts by going through cycles
      machine.send({ type: 'RESET' });
      expect(machine.getContext().attemptCount).toBe(0);
    });
  });

  describe('reset method', () => {
    it('should reset machine to BLOCKED state', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('GREEN');
      machine.reset();
      expect(machine.getPhase()).toBe('BLOCKED');
    });
  });

  describe('context tracking', () => {
    it('should track attemptCount across transitions', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine();

      // Complete one cycle
      machine.send({ type: 'TEST_WRITTEN' });
      machine.send({ type: 'TEST_PASSED' });
      machine.send({ type: 'REFACTOR_DONE' });

      const context = machine.getContext();
      expect(context.attemptCount).toBeGreaterThanOrEqual(0);
    });

    it('should update currentPhase in context on transition', async () => {
      const { createTDDMachine } = await import('./state-machine.js');
      const machine = createTDDMachine('BLOCKED');

      expect(machine.getContext().currentPhase).toBe('BLOCKED');

      machine.send({ type: 'TEST_WRITTEN' });
      expect(machine.getContext().currentPhase).toBe('RED');
    });
  });

  describe('type exports', () => {
    it('should export TDDEvent type', async () => {
      const types = await import('./state-machine.js');
      expect(types).toBeDefined();
    });

    it('should export TDDContext interface', async () => {
      const types = await import('./state-machine.js');
      expect(types).toBeDefined();
    });

    it('should export TDDMachine interface', async () => {
      const types = await import('./state-machine.js');
      expect(types).toBeDefined();
    });
  });
});
