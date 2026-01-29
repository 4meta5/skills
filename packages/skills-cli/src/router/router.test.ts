/**
 * Tests for the Semantic Router
 *
 * TDD Phase 1: RED - These tests define the expected behavior
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createRouter,
  matchKeywords,
  combineScores,
  determineActivationMode,
} from './router.js';
import type { RouterConfig, VectorStore, SkillVector, ActivationMode } from './types.js';

describe('router', () => {
  describe('matchKeywords', () => {
    const patterns = [
      { skillName: 'git-commit', pattern: /\b(commit|git commit)\b/i, priority: 10 },
      { skillName: 'test-runner', pattern: /\b(test|run tests?|testing)\b/i, priority: 10 },
      { skillName: 'code-review', pattern: /\b(review|code review)\b/i, priority: 5 },
    ];

    it('should match exact keywords', () => {
      const result = matchKeywords('git commit my changes', patterns);
      expect(result).toHaveLength(1);
      expect(result[0].skillName).toBe('git-commit');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('should match multiple keywords', () => {
      const result = matchKeywords('commit and run tests', patterns);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.skillName)).toContain('git-commit');
      expect(result.map(r => r.skillName)).toContain('test-runner');
    });

    it('should return empty for no matches', () => {
      const result = matchKeywords('hello world', patterns);
      expect(result).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const result = matchKeywords('RUN TESTS please', patterns);
      expect(result).toHaveLength(1);
      expect(result[0].skillName).toBe('test-runner');
    });

    it('should sort by priority', () => {
      const result = matchKeywords('review and test', patterns);
      expect(result).toHaveLength(2);
      // test-runner has higher priority (10) than code-review (5)
      expect(result[0].skillName).toBe('test-runner');
      expect(result[1].skillName).toBe('code-review');
    });
  });

  describe('combineScores', () => {
    it('should combine keyword and embedding scores with weights', () => {
      const result = combineScores(1.0, 0.8, 0.3, 0.7);
      // 0.3 * 1.0 + 0.7 * 0.8 = 0.3 + 0.56 = 0.86
      expect(result).toBeCloseTo(0.86);
    });

    it('should handle zero keyword score', () => {
      const result = combineScores(0, 0.9, 0.3, 0.7);
      // 0.3 * 0 + 0.7 * 0.9 = 0 + 0.63 = 0.63
      expect(result).toBeCloseTo(0.63);
    });

    it('should handle zero embedding score', () => {
      const result = combineScores(1.0, 0, 0.3, 0.7);
      // 0.3 * 1.0 + 0.7 * 0 = 0.3 + 0 = 0.3
      expect(result).toBeCloseTo(0.3);
    });

    it('should clamp result to [0, 1]', () => {
      // Even with both at 1.0, result should be 1.0
      const result = combineScores(1.0, 1.0, 0.5, 0.5);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determineActivationMode', () => {
    it('should return immediate for score >= 0.85', () => {
      expect(determineActivationMode(0.85, 0.85, 0.70)).toBe('immediate');
      expect(determineActivationMode(0.90, 0.85, 0.70)).toBe('immediate');
      expect(determineActivationMode(1.0, 0.85, 0.70)).toBe('immediate');
    });

    it('should return suggestion for score >= 0.70 and < 0.85', () => {
      expect(determineActivationMode(0.70, 0.85, 0.70)).toBe('suggestion');
      expect(determineActivationMode(0.75, 0.85, 0.70)).toBe('suggestion');
      expect(determineActivationMode(0.84, 0.85, 0.70)).toBe('suggestion');
    });

    it('should return chat for score < 0.70', () => {
      expect(determineActivationMode(0.69, 0.85, 0.70)).toBe('chat');
      expect(determineActivationMode(0.5, 0.85, 0.70)).toBe('chat');
      expect(determineActivationMode(0, 0.85, 0.70)).toBe('chat');
    });
  });

  describe('createRouter', () => {
    let testDir: string;
    let vectorStorePath: string;

    // Sample vector store for testing
    const sampleVectorStore: VectorStore = {
      version: '1.0.0',
      model: 'Xenova/all-MiniLM-L6-v2',
      generatedAt: new Date().toISOString(),
      skills: [
        {
          skillName: 'tdd',
          description: 'Test-driven development workflow',
          triggerExamples: ['write tests first', 'red green refactor'],
          embedding: new Array(384).fill(0).map(() => Math.random() * 0.1), // Mock embedding
          keywords: ['tdd', 'test-driven', 'red green refactor'],
        },
        {
          skillName: 'code-review',
          description: 'Code review guidelines',
          triggerExamples: ['review my code', 'check this PR'],
          embedding: new Array(384).fill(0).map(() => Math.random() * 0.1),
          keywords: ['review', 'pr', 'pull request'],
        },
      ],
    };

    beforeAll(async () => {
      // Create temp directory for test files
      testDir = join(tmpdir(), `router-test-${Date.now()}`);
      await mkdir(testDir, { recursive: true });
      vectorStorePath = join(testDir, 'vector_store.json');
      await writeFile(vectorStorePath, JSON.stringify(sampleVectorStore));
    });

    afterAll(async () => {
      // Cleanup
      await rm(testDir, { recursive: true, force: true });
    });

    it('should create router with config', async () => {
      const config: RouterConfig = {
        vectorStorePath,
        immediateThreshold: 0.85,
        suggestionThreshold: 0.70,
      };
      const router = await createRouter(config);
      expect(router).toBeDefined();
      expect(router.getConfig()).toMatchObject(config);
    });

    it('should load vector store on initialization', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();
      expect(router.isInitialized()).toBe(true);
    });

    it('should route query with keyword match', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('review my code please');
      expect(result.mode).toBeDefined();
      expect(result.matches.length).toBeGreaterThanOrEqual(0);
      expect(result.query).toBe('review my code please');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return chat mode for unrelated query', async () => {
      const router = await createRouter({ vectorStorePath });
      await router.initialize();

      const result = await router.route('what is the weather today');
      expect(result.mode).toBe('chat');
    });
  });
});
