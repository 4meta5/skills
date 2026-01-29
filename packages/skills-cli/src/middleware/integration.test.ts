/**
 * Integration tests for Router + Middleware
 *
 * TDD Phase 1: RED - These tests capture the full corrective loop behavior
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRouter } from '../router/router.js';
import { createCorrectiveLoop } from './corrective-loop.js';
import { createMiddleware, detectToolCalls } from './middleware.js';
import type { RouterConfig } from '../router/types.js';

describe('Router + Middleware Integration', { timeout: 60000 }, () => {
  let testDir: string;
  let vectorStorePath: string;

  const createVectorStore = () => {
    // Create embeddings that will produce predictable scores
    const makeEmbedding = (seed: number) => {
      const vec = new Array(384).fill(0).map((_, i) => Math.sin(seed + i * 0.1));
      const mag = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
      return vec.map((x) => x / mag);
    };

    return {
      version: '1.0.0',
      model: 'Xenova/all-MiniLM-L6-v2',
      generatedAt: new Date().toISOString(),
      skills: [
        {
          skillName: 'tdd',
          description: 'Test-driven development workflow with RED GREEN REFACTOR phases',
          triggerExamples: ['write tests first', 'fix bug with TDD', 'RED GREEN REFACTOR'],
          embedding: makeEmbedding(1),
          keywords: ['tdd', 'test-driven', 'red', 'green', 'refactor'],
        },
        {
          skillName: 'no-workarounds',
          description: 'Prevent manual workarounds when building tools',
          triggerExamples: ['fix the tool', 'no manual workarounds'],
          embedding: makeEmbedding(2),
          keywords: ['workaround', 'manual', 'fix the tool'],
        },
        {
          skillName: 'security-analysis',
          description: 'Security review and vulnerability analysis',
          triggerExamples: ['security review', 'check for vulnerabilities'],
          embedding: makeEmbedding(3),
          keywords: ['security', 'vulnerability', 'CVE'],
        },
      ],
    };
  };

  beforeAll(async () => {
    testDir = join(tmpdir(), 'router-middleware-integration-' + Date.now());
    await mkdir(testDir, { recursive: true });
    vectorStorePath = join(testDir, 'vector_store.json');
    await writeFile(vectorStorePath, JSON.stringify(createVectorStore()));
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('end-to-end skill enforcement', () => {
    it('should enforce skill activation when router returns immediate mode', async () => {
      // Setup router with low thresholds for testing
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      // Route a TDD-related prompt
      const result = await router.route('fix this bug using tdd red green refactor');

      // Should trigger immediate mode due to keyword match
      expect(result.mode).toBe('immediate');
      expect(result.matches.length).toBeGreaterThan(0);

      // Setup corrective loop from routing result
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(result);

      const state = loop.getState();
      expect(state.mode).toBe('immediate');
      expect(state.requiredTools.length).toBeGreaterThan(0);
    });

    it('should accept response that calls required skill', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      const routingResult = await router.route('use tdd to fix this');
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(routingResult);

      // Simulate Claude response that DOES call the skill
      const compliantResponse = 'I will use Skill("tdd") to follow the TDD workflow.';
      const middlewareResult = await loop.processResponse(compliantResponse);

      expect(middlewareResult.accepted).toBe(true);
      expect(middlewareResult.foundTools).toContain('tdd');
    });

    it('should reject response that ignores required skill', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      const routingResult = await router.route('use tdd to implement this feature');
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(routingResult);

      // Simulate Claude response that IGNORES the skill
      const nonCompliantResponse =
        'I will help you implement that feature. Let me start coding...';
      const middlewareResult = await loop.processResponse(nonCompliantResponse);

      expect(middlewareResult.accepted).toBe(false);
      expect(middlewareResult.missingTools.length).toBeGreaterThan(0);
      expect(middlewareResult.reason).toContain('COMPLIANCE ERROR');
    });
  });

  describe('corrective loop with retry', () => {
    it('should retry until skill is called', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      const routingResult = await router.route('fix bug with tdd');
      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(routingResult);

      // Simulate: first 2 responses ignore, third complies
      const responses = [
        'Let me implement the fix directly...',
        'I will write the code now...',
        'I will use Skill("tdd") to follow the proper workflow.',
      ];

      let responseIndex = 0;
      const getResponse = async () => responses[responseIndex++];

      const result = await loop.runCycle(getResponse, 'fix the bug');

      expect(result.accepted).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should fail after max retries exceeded', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      const routingResult = await router.route('use tdd please');
      const loop = createCorrectiveLoop({ maxRetries: 2 });
      loop.initializeFromRouting(routingResult);

      // All responses ignore the skill
      const getResponse = async () => 'I will implement without following any skill...';

      const result = await loop.runCycle(getResponse, 'use tdd');

      expect(result.accepted).toBe(false);
      expect(result.attempts).toBe(3); // 1 initial + 2 retries
      expect(result.error).toContain('Max retries');
    });

    it('should call onRejection callback for each rejection', async () => {
      const onRejection = vi.fn();

      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.2,
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      const routingResult = await router.route('tdd workflow');
      const loop = createCorrectiveLoop({ maxRetries: 2, onRejection });
      loop.initializeFromRouting(routingResult);

      // First ignore, second comply
      const responses = ['Ignoring skill...', 'Using Skill("tdd") now.'];
      let idx = 0;

      const result = await loop.runCycle(async () => responses[idx++], 'prompt');

      expect(result.accepted).toBe(true);
      expect(onRejection).toHaveBeenCalledTimes(1);
    });
  });

  describe('multiple required skills', () => {
    it('should require ALL skills to be called', async () => {
      const middleware = createMiddleware({ maxRetries: 3 });

      // Manually set multiple required skills
      middleware.setState({
        requiredTools: ['tdd', 'no-workarounds'],
        mode: 'immediate',
      });

      // Response only calls one skill
      const partialResponse = 'I will use Skill("tdd") but ignore the other.';
      const result = await middleware.processResponse(partialResponse);

      expect(result.accepted).toBe(false);
      expect(result.foundTools).toContain('tdd');
      expect(result.missingTools).toContain('no-workarounds');
    });

    it('should accept when all skills are called', async () => {
      const middleware = createMiddleware({ maxRetries: 3 });

      middleware.setState({
        requiredTools: ['tdd', 'no-workarounds'],
        mode: 'immediate',
      });

      const compliantResponse =
        'I will use Skill("tdd") and Skill("no-workarounds") together.';
      const result = await middleware.processResponse(compliantResponse);

      expect(result.accepted).toBe(true);
      expect(result.foundTools).toContain('tdd');
      expect(result.foundTools).toContain('no-workarounds');
      expect(result.missingTools).toHaveLength(0);
    });
  });

  describe('suggestion mode passthrough', () => {
    it('should not enforce in suggestion mode', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.9, // High threshold = suggestion mode more likely
        suggestionThreshold: 0.1,
      };

      const router = await createRouter(config);
      await router.initialize();

      // This should hit suggestion mode with high immediate threshold
      const routingResult = await router.route('maybe use security analysis');

      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(routingResult);

      // Even if response ignores skill, should be accepted in suggestion mode
      const response = 'I will proceed without any skill activation.';
      const middlewareResult = await loop.processResponse(response);

      // In suggestion mode, should always accept
      if (loop.getState().mode === 'suggestion') {
        expect(middlewareResult.accepted).toBe(true);
      }
    });
  });

  describe('chat mode passthrough', () => {
    it('should not enforce in chat mode', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.9,
        suggestionThreshold: 0.8, // High thresholds = chat mode more likely
      };

      const router = await createRouter(config);
      await router.initialize();

      // Unrelated prompt should hit chat mode
      const routingResult = await router.route('what is the weather today?');

      expect(routingResult.mode).toBe('chat');

      const loop = createCorrectiveLoop({ maxRetries: 3 });
      loop.initializeFromRouting(routingResult);

      const response = 'The weather is sunny today!';
      const middlewareResult = await loop.processResponse(response);

      expect(middlewareResult.accepted).toBe(true);
    });
  });
});

describe('detectToolCalls edge cases', () => {
  it('should detect skill with args parameter syntax', () => {
    const response = 'Using Skill(skill: "tdd", args: "--verbose")';
    const calls = detectToolCalls(response);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('should handle mixed quote styles', () => {
    const response = "Skill('tdd') and Skill(\"no-workarounds\")";
    const calls = detectToolCalls(response);
    expect(calls).toHaveLength(2);
  });

  it('should not match partial skill names', () => {
    const response = 'Skill("tdd-extra") should not match tdd';
    const calls = detectToolCalls(response);
    // Should find tdd-extra, not tdd
    expect(calls.map((c) => c.args[0])).toContain('tdd-extra');
    expect(calls).toHaveLength(1);
  });
});
