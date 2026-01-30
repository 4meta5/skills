import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('middleware hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createHookableMiddleware', () => {
    it('should create middleware with hookable support', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      expect(middleware).toBeDefined();
      expect(middleware.hook).toBeDefined();
      expect(middleware.callHook).toBeDefined();
    });

    it('should allow registering beforeRequest hooks', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const hookFn = vi.fn().mockResolvedValue('modified prompt');
      middleware.hook('beforeRequest', hookFn);

      const result = await middleware.callHook('beforeRequest', 'original prompt', { mode: 'immediate' });

      expect(hookFn).toHaveBeenCalledWith('original prompt', { mode: 'immediate' });
      expect(result).toBe('modified prompt');
    });

    it('should allow registering afterResponse hooks', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const hookFn = vi.fn().mockResolvedValue({
        accepted: true,
        response: 'processed response',
        foundTools: ['tdd'],
        missingTools: [],
      });
      middleware.hook('afterResponse', hookFn);

      const result = await middleware.callHook('afterResponse', 'response text', { mode: 'immediate' });

      expect(hookFn).toHaveBeenCalled();
      expect(result.accepted).toBe(true);
    });

    it('should allow registering onToolCall hooks', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const hookFn = vi.fn().mockResolvedValue(true);
      middleware.hook('onToolCall', hookFn);

      const result = await middleware.callHook('onToolCall', 'Skill', { skill: 'tdd' });

      expect(hookFn).toHaveBeenCalledWith('Skill', { skill: 'tdd' });
      expect(result).toBe(true);
    });

    it('should allow registering onRetry hooks', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const hookFn = vi.fn().mockResolvedValue(undefined);
      middleware.hook('onRetry', hookFn);

      await middleware.callHook('onRetry', 1, 'Tool not called');

      expect(hookFn).toHaveBeenCalledWith(1, 'Tool not called');
    });
  });

  describe('hook chaining', () => {
    it('should execute multiple hooks in order', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const order: string[] = [];

      middleware.hook('beforeRequest', async (prompt) => {
        order.push('hook1');
        return prompt + ' [hook1]';
      });

      middleware.hook('beforeRequest', async (prompt) => {
        order.push('hook2');
        return prompt + ' [hook2]';
      });

      const result = await middleware.callHook('beforeRequest', 'original', {});

      expect(order).toEqual(['hook1', 'hook2']);
      expect(result).toContain('[hook1]');
      expect(result).toContain('[hook2]');
    });

    it('should allow hooks to short-circuit', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      middleware.hook('onToolCall', async () => {
        return false; // Block the tool call
      });

      const result = await middleware.callHook('onToolCall', 'Skill', { skill: 'blocked' });

      expect(result).toBe(false);
    });
  });

  describe('removeHook', () => {
    it('should remove registered hooks', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const middleware = createHookableMiddleware();

      const hookFn = vi.fn().mockResolvedValue('modified');
      const unregister = middleware.hook('beforeRequest', hookFn);

      // First call should trigger hook
      await middleware.callHook('beforeRequest', 'test', {});
      expect(hookFn).toHaveBeenCalledTimes(1);

      // Remove hook
      unregister();

      // Second call should not trigger hook
      await middleware.callHook('beforeRequest', 'test', {});
      expect(hookFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration with state machine', () => {
    it('should integrate with workflow machine', async () => {
      const { createHookableMiddleware } = await import('./hooks.js');
      const { createWorkflowMachine } = await import('../workflow/machine.js');

      const middleware = createHookableMiddleware();
      const workflow = createWorkflowMachine();

      // Track state changes
      const stateChanges: string[] = [];
      middleware.hook('onStateChange', async (newState) => {
        stateChanges.push(newState);
      });

      // Simulate workflow
      workflow.send({ type: 'ROUTER_IMMEDIATE', skills: ['tdd'] });
      await middleware.callHook('onStateChange', workflow.getState());

      workflow.send({ type: 'TOOL_CALLED', toolName: 'Skill' });
      await middleware.callHook('onStateChange', workflow.getState());

      expect(stateChanges).toContain('executing');
      expect(stateChanges).toContain('reviewing');
    });
  });
});
