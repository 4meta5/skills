/**
 * Tests for Corrective Loop
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCorrectiveLoop } from './corrective-loop.js';
import type { RoutingResult } from '../router/types.js';

function createMockRoutingResult(
  mode: 'immediate' | 'suggestion' | 'chat',
  skills: { name: string; score: number }[]
): RoutingResult {
  return {
    query: 'test query',
    mode,
    matches: skills.map((s) => ({
      skillName: s.name,
      score: s.score,
      keywordScore: s.score,
      embeddingScore: s.score,
      matchedKeywords: [],
    })),
    signals: [],
    processingTimeMs: 10,
  };
}

describe('createCorrectiveLoop', () => {
  describe('initializeFromRouting', () => {
    it('should set required tools from immediate mode routing', async () => {
      const loop = createCorrectiveLoop();
      const routing = createMockRoutingResult('immediate', [
        { name: 'tdd', score: 0.92 },
        { name: 'no-workarounds', score: 0.85 },
      ]);

      await await loop.initializeFromRouting(routing);

      const state = loop.getState();
      expect(state.mode).toBe('immediate');
      expect(state.requiredTools).toContain('tdd');
      expect(state.requiredTools).toContain('no-workarounds');
    });

    it('should filter out low-score matches', async () => {
      const loop = createCorrectiveLoop();
      const routing = createMockRoutingResult('immediate', [
        { name: 'tdd', score: 0.92 },
        { name: 'other', score: 0.50 },
      ]);

      await loop.initializeFromRouting(routing);

      const state = loop.getState();
      expect(state.requiredTools).toContain('tdd');
      expect(state.requiredTools).not.toContain('other');
    });

    it('should set suggestion mode correctly', async () => {
      const loop = createCorrectiveLoop();
      const routing = createMockRoutingResult('suggestion', [
        { name: 'tdd', score: 0.75 },
      ]);

      await loop.initializeFromRouting(routing);

      const state = loop.getState();
      expect(state.mode).toBe('suggestion');
    });

    it('should set chat mode with no required tools', async () => {
      const loop = createCorrectiveLoop();
      const routing = createMockRoutingResult('chat', []);

      await loop.initializeFromRouting(routing);

      const state = loop.getState();
      expect(state.mode).toBe('chat');
      expect(state.requiredTools).toHaveLength(0);
    });
  });

  describe('processResponse', () => {
    it('should accept response with required tool calls', async () => {
      const loop = createCorrectiveLoop();
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      const result = await loop.processResponse('I will use Skill("tdd") now.');

      expect(result.accepted).toBe(true);
      expect(result.foundTools).toContain('tdd');
    });

    it('should reject response without required tool calls', async () => {
      const loop = createCorrectiveLoop();
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      const result = await loop.processResponse('I will implement the feature.');

      expect(result.accepted).toBe(false);
      expect(result.missingTools).toContain('tdd');
    });

    it('should call onAccepted callback when accepted', async () => {
      const onAccepted = vi.fn();
      const loop = createCorrectiveLoop({ onAccepted });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      await loop.processResponse('Using Skill("tdd") now.');

      expect(onAccepted).toHaveBeenCalledTimes(1);
    });

    it('should call onRejection callback when rejected', async () => {
      const onRejection = vi.fn();
      const loop = createCorrectiveLoop({ onRejection });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      await loop.processResponse('I will implement the feature.');

      expect(onRejection).toHaveBeenCalledTimes(1);
      expect(onRejection).toHaveBeenCalledWith(expect.any(Object), 1);
    });
  });

  describe('retry flow', () => {
    it('should allow retries up to max', async () => {
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      expect(loop.shouldRetry()).toBe(true);
      expect(loop.prepareRetry()).toBe(true);

      expect(loop.shouldRetry()).toBe(true);
      expect(loop.prepareRetry()).toBe(true);

      expect(loop.shouldRetry()).toBe(true);
      expect(loop.prepareRetry()).toBe(true);

      // Now at max
      expect(loop.shouldRetry()).toBe(false);
      expect(loop.prepareRetry()).toBe(false);
    });

    it('should call onMaxRetriesExceeded when exceeded', async () => {
      const onMaxRetriesExceeded = vi.fn();
      const loop = createCorrectiveLoop({ maxRetries: 1, onMaxRetriesExceeded });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      loop.prepareRetry(); // First retry
      loop.prepareRetry(); // Exceeds max

      expect(onMaxRetriesExceeded).toHaveBeenCalledTimes(1);
    });

    it('should generate retry prompt with attempt count', async () => {
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      loop.prepareRetry();
      const prompt = loop.getRetryPrompt('Fix the bug', 'Tool not called');

      expect(prompt).toContain('RETRY 2/3');
      expect(prompt).toContain('Skill("tdd")');
      expect(prompt).toContain('Fix the bug');
    });
  });

  describe('runCycle', () => {
    it('should return accepted on first try if tool is called', async () => {
      const loop = createCorrectiveLoop();
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      const getResponse = vi.fn().mockResolvedValue('Using Skill("tdd") now.');

      const result = await loop.runCycle(getResponse, 'Fix the bug');

      expect(result.accepted).toBe(true);
      expect(result.attempts).toBe(1);
      expect(getResponse).toHaveBeenCalledTimes(1);
    });

    it('should retry until tool is called', async () => {
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      const getResponse = vi
        .fn()
        .mockResolvedValueOnce('I will implement...')
        .mockResolvedValueOnce('Still implementing...')
        .mockResolvedValueOnce('Using Skill("tdd") now.');

      const result = await loop.runCycle(getResponse, 'Fix the bug');

      expect(result.accepted).toBe(true);
      expect(result.attempts).toBe(3);
      expect(getResponse).toHaveBeenCalledTimes(3);
    });

    it('should return error after max retries exceeded', async () => {
      const loop = createCorrectiveLoop({ maxRetries: 2 });
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );

      const getResponse = vi.fn().mockResolvedValue('I will implement...');

      const result = await loop.runCycle(getResponse, 'Fix the bug');

      expect(result.accepted).toBe(false);
      expect(result.attempts).toBe(3); // 1 initial + 2 retries
      expect(result.error).toContain('Max retries');
      expect(result.error).toContain('tdd');
    });
  });

  describe('reset', () => {
    it('should reset state for new request', async () => {
      const loop = createCorrectiveLoop();
      await loop.initializeFromRouting(
        createMockRoutingResult('immediate', [{ name: 'tdd', score: 0.92 }])
      );
      loop.prepareRetry();
      loop.prepareRetry();

      loop.reset();

      expect(loop.isInitialized()).toBe(false);
      const state = loop.getState();
      expect(state.retryCount).toBe(0);
      expect(state.requiredTools).toHaveLength(0);
    });
  });
});
