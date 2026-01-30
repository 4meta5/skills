import { describe, it, expect } from 'vitest';

describe('workflow state machine', () => {
  describe('state transitions', () => {
    it('should start in idle state', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      expect(machine.getState()).toBe('idle');
    });

    it('should transition from idle to executing on ROUTER_IMMEDIATE', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd', 'no-workarounds'] });

      expect(machine.getState()).toBe('executing');
      expect(machine.getContext().requiredSkills).toEqual(['tdd', 'no-workarounds']);
      expect(machine.getContext().activationMode).toBe('immediate');
    });

    it('should transition from idle to planning on ROUTER_SUGGESTION', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_SUGGESTION', skills: ['code-review'] });

      expect(machine.getState()).toBe('planning');
      expect(machine.getContext().requiredSkills).toEqual(['code-review']);
      expect(machine.getContext().activationMode).toBe('suggestion');
    });

    it('should stay in idle on ROUTER_CHAT', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_CHAT' });

      expect(machine.getState()).toBe('idle');
      expect(machine.getContext().activationMode).toBe('chat');
    });

    it('should transition from planning to executing on PLAN_APPROVED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_SUGGESTION', skills: ['tdd'] });
      expect(machine.getState()).toBe('planning');

      machine.send({ type: 'PLAN_APPROVED' });
      expect(machine.getState()).toBe('executing');
    });

    it('should transition from planning back to idle on PLAN_REJECTED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_SUGGESTION', skills: ['tdd'] });
      machine.send({ type: 'PLAN_REJECTED' });

      expect(machine.getState()).toBe('idle');
    });

    it('should transition from executing to reviewing on TOOL_CALLED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_CALLED', toolName: 'Skill' });

      expect(machine.getState()).toBe('reviewing');
      expect(machine.getContext().toolCalls).toContain('Skill');
    });

    it('should transition from executing to error_recovery on TOOL_SKIPPED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_SKIPPED' });

      expect(machine.getState()).toBe('error_recovery');
    });

    it('should transition from reviewing to idle on REVIEW_PASSED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_CALLED', toolName: 'Skill' });
      machine.send({ type: 'REVIEW_PASSED' });

      expect(machine.getState()).toBe('idle');
    });

    it('should transition from reviewing to error_recovery on REVIEW_FAILED', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_CALLED', toolName: 'Skill' });
      machine.send({ type: 'REVIEW_FAILED', error: 'Skill not activated' });

      expect(machine.getState()).toBe('error_recovery');
      expect(machine.getContext().lastError).toBe('Skill not activated');
    });
  });

  describe('error recovery', () => {
    it('should retry from error_recovery up to maxRetries', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine({ maxRetries: 2 });

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_SKIPPED' });
      expect(machine.getState()).toBe('error_recovery');
      expect(machine.getContext().attemptCount).toBe(1);

      machine.send({ type: 'RETRY' });
      expect(machine.getState()).toBe('executing');
      expect(machine.getContext().attemptCount).toBe(1);

      machine.send({ type: 'TOOL_SKIPPED' });
      expect(machine.getContext().attemptCount).toBe(2);

      machine.send({ type: 'RETRY' });
      machine.send({ type: 'TOOL_SKIPPED' });
      expect(machine.getContext().attemptCount).toBe(3);

      // After max retries, should send MAX_RETRIES_EXCEEDED
      machine.send({ type: 'MAX_RETRIES_EXCEEDED' });
      expect(machine.getState()).toBe('idle');
    });

    it('should track attempt count across retries', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_SKIPPED' });

      expect(machine.getContext().attemptCount).toBe(1);

      machine.send({ type: 'RETRY' });
      machine.send({ type: 'TOOL_SKIPPED' });

      expect(machine.getContext().attemptCount).toBe(2);
    });
  });

  describe('context management', () => {
    it('should preserve skills through state transitions', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd', 'no-workarounds'] });
      machine.send({ type: 'TOOL_CALLED', toolName: 'Skill' });
      machine.send({ type: 'REVIEW_PASSED' });

      // Skills should still be available after completion
      expect(machine.getContext().requiredSkills).toEqual(['tdd', 'no-workarounds']);
    });

    it('should reset context on RESET event', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_CALLED', toolName: 'Skill' });

      machine.send({ type: 'RESET' });

      expect(machine.getState()).toBe('idle');
      expect(machine.getContext().requiredSkills).toEqual([]);
      expect(machine.getContext().toolCalls).toEqual([]);
      expect(machine.getContext().attemptCount).toBe(0);
    });

    it('should record start timestamp', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      const machine = createWorkflowMachine();

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });

      expect(machine.getContext().startedAt).toBeDefined();
    });
  });

  describe('guards', () => {
    it('should check if retry is allowed', async () => {
      const { createWorkflowMachine } = await import('./machine.js');
      // maxRetries: 2 means we can have 2 failed attempts before exhausting retries
      const machine = createWorkflowMachine({ maxRetries: 2 });

      machine.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      machine.send({ type: 'TOOL_SKIPPED' });
      // attemptCount is now 1, maxRetries is 2
      expect(machine.canRetry()).toBe(true);

      machine.send({ type: 'RETRY' });
      machine.send({ type: 'TOOL_SKIPPED' });
      // attemptCount is now 2, maxRetries is 2
      expect(machine.canRetry()).toBe(false);
    });
  });
});
