/**
 * Tests for Agent Middleware
 *
 * TDD: RED phase - these tests define the expected behavior
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMiddleware, detectToolCalls } from './middleware.js';
import type { AgentMiddleware } from './types.js';

describe('detectToolCalls', () => {
  it('should detect Skill() call with single argument', () => {
    const response = 'Let me help you. I will call Skill("tdd") to follow the workflow.';
    const calls = detectToolCalls(response);

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe('Skill');
    expect(calls[0].args).toContain('tdd');
  });

  it('should detect Skill() call with skill name as first positional arg', () => {
    const response = 'Using Skill(tdd) now.';
    const calls = detectToolCalls(response);

    expect(calls).toHaveLength(1);
    expect(calls[0].tool).toBe('Skill');
    expect(calls[0].args).toContain('tdd');
  });

  it('should detect multiple Skill() calls', () => {
    const response = 'I will use Skill("tdd") and also Skill("no-workarounds").';
    const calls = detectToolCalls(response);

    expect(calls).toHaveLength(2);
    expect(calls.map(c => c.args[0])).toContain('tdd');
    expect(calls.map(c => c.args[0])).toContain('no-workarounds');
  });

  it('should return empty array when no Skill calls found', () => {
    const response = 'I will help you implement that feature without using any skills.';
    const calls = detectToolCalls(response);

    expect(calls).toHaveLength(0);
  });

  it('should handle kebab-case skill names', () => {
    const response = 'Calling Skill("property-based-testing") now.';
    const calls = detectToolCalls(response);

    expect(calls).toHaveLength(1);
    expect(calls[0].args).toContain('property-based-testing');
  });
});

describe('AgentMiddleware', () => {
  let middleware: AgentMiddleware;

  beforeEach(() => {
    middleware = createMiddleware({ maxRetries: 3 });
  });

  describe('setState', () => {
    it('should update required tools from routing result', () => {
      middleware.setState({
        requiredTools: ['tdd', 'no-workarounds'],
        mode: 'immediate',
      });

      const state = middleware.getState();
      expect(state.requiredTools).toEqual(['tdd', 'no-workarounds']);
      expect(state.mode).toBe('immediate');
    });
  });

  describe('processRequest', () => {
    it('should inject MUST_CALL instruction for immediate mode', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      const enhanced = await middleware.processRequest('Fix the bug');

      expect(enhanced).toContain('MUST_CALL');
      expect(enhanced).toContain('tdd');
      expect(enhanced).toContain('Fix the bug');
    });

    it('should not modify prompt in chat mode', async () => {
      middleware.setState({
        requiredTools: [],
        mode: 'chat',
      });

      const enhanced = await middleware.processRequest('Hello');

      expect(enhanced).toBe('Hello');
    });

    it('should add suggestion for suggestion mode', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'suggestion',
      });

      const enhanced = await middleware.processRequest('Help me');

      expect(enhanced).toContain('CONSIDER_CALLING');
      expect(enhanced).toContain('tdd');
    });
  });

  describe('processResponse', () => {
    it('should accept response when required tool is called', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      const response = 'I will use Skill("tdd") to follow the workflow.';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(true);
      expect(result.foundTools).toContain('tdd');
      expect(result.missingTools).toHaveLength(0);
    });

    it('should reject response without required tool call', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      const response = 'I will help you implement that feature.';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(false);
      expect(result.missingTools).toContain('tdd');
      expect(result.reason).toContain('COMPLIANCE ERROR');
    });

    it('should require ALL required tools to be called', async () => {
      middleware.setState({
        requiredTools: ['tdd', 'no-workarounds'],
        mode: 'immediate',
      });

      const response = 'I will use Skill("tdd") now.';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(false);
      expect(result.foundTools).toContain('tdd');
      expect(result.missingTools).toContain('no-workarounds');
    });

    it('should accept when all required tools are called', async () => {
      middleware.setState({
        requiredTools: ['tdd', 'no-workarounds'],
        mode: 'immediate',
      });

      const response = 'Using Skill("tdd") and Skill("no-workarounds") together.';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(true);
      expect(result.missingTools).toHaveLength(0);
    });

    it('should pass through in suggestion mode without enforcement', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'suggestion',
      });

      const response = 'I will help you implement that feature.';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(true);
    });

    it('should pass through in chat mode', async () => {
      middleware.setState({
        requiredTools: [],
        mode: 'chat',
      });

      const response = 'Hello! How can I help you?';
      const result = await middleware.processResponse(response);

      expect(result.accepted).toBe(true);
    });
  });

  describe('retry logic', () => {
    it('should track retry count', () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      expect(middleware.getState().retryCount).toBe(0);

      middleware.incrementRetry();
      expect(middleware.getState().retryCount).toBe(1);

      middleware.incrementRetry();
      expect(middleware.getState().retryCount).toBe(2);
    });

    it('should allow retry when under max', () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      expect(middleware.shouldRetry()).toBe(true);

      middleware.incrementRetry();
      middleware.incrementRetry();
      expect(middleware.shouldRetry()).toBe(true);

      middleware.incrementRetry();
      expect(middleware.shouldRetry()).toBe(false);
    });

    it('should include attempt count in rejection message', async () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });

      middleware.incrementRetry();
      const response = 'I will implement the feature.';
      const result = await middleware.processResponse(response);

      expect(result.reason).toContain('Attempt 2/3');
    });
  });

  describe('reset', () => {
    it('should reset state to defaults', () => {
      middleware.setState({
        requiredTools: ['tdd'],
        mode: 'immediate',
      });
      middleware.incrementRetry();
      middleware.incrementRetry();

      middleware.reset();

      const state = middleware.getState();
      expect(state.requiredTools).toHaveLength(0);
      expect(state.mode).toBe('chat');
      expect(state.retryCount).toBe(0);
    });
  });
});
