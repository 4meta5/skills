import { describe, it, expect } from 'vitest';
import {
  createMatcher,
  combineScores,
  determineActivationMode,
  determineConfidence,
  fallbackEmbedding,
  cosineSimilarity,
} from './index.js';
import type { Candidate } from './types.js';

describe('matcher', () => {
  describe('combineScores', () => {
    it('combines keyword and embedding scores with weights', () => {
      const result = combineScores(1.0, 0.8, 0.3, 0.7);
      // 0.3 * 1.0 + 0.7 * 0.8 = 0.3 + 0.56 = 0.86
      expect(result).toBeCloseTo(0.86);
    });

    it('handles zero keyword score', () => {
      const result = combineScores(0, 0.9, 0.3, 0.7);
      // 0.3 * 0 + 0.7 * 0.9 = 0 + 0.63 = 0.63
      expect(result).toBeCloseTo(0.63);
    });

    it('handles zero embedding score', () => {
      const result = combineScores(1.0, 0, 0.3, 0.7);
      // 0.3 * 1.0 + 0.7 * 0 = 0.3 + 0 = 0.3
      expect(result).toBeCloseTo(0.3);
    });

    it('clamps result to [0, 1]', () => {
      const result = combineScores(1.0, 1.0, 0.5, 0.5);
      expect(result).toBeLessThanOrEqual(1);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determineActivationMode', () => {
    it('returns immediate for score >= 0.85', () => {
      expect(determineActivationMode(0.85, 0.85, 0.70)).toBe('immediate');
      expect(determineActivationMode(0.90, 0.85, 0.70)).toBe('immediate');
      expect(determineActivationMode(1.0, 0.85, 0.70)).toBe('immediate');
    });

    it('returns suggestion for score >= 0.70 and < 0.85', () => {
      expect(determineActivationMode(0.70, 0.85, 0.70)).toBe('suggestion');
      expect(determineActivationMode(0.75, 0.85, 0.70)).toBe('suggestion');
      expect(determineActivationMode(0.84, 0.85, 0.70)).toBe('suggestion');
    });

    it('returns none for score < 0.70', () => {
      expect(determineActivationMode(0.69, 0.85, 0.70)).toBe('none');
      expect(determineActivationMode(0.5, 0.85, 0.70)).toBe('none');
      expect(determineActivationMode(0, 0.85, 0.70)).toBe('none');
    });
  });

  describe('determineConfidence', () => {
    it('returns high for score >= 0.8', () => {
      expect(determineConfidence(0.8)).toBe('high');
      expect(determineConfidence(0.9)).toBe('high');
      expect(determineConfidence(1.0)).toBe('high');
    });

    it('returns medium for score >= 0.6 and < 0.8', () => {
      expect(determineConfidence(0.6)).toBe('medium');
      expect(determineConfidence(0.7)).toBe('medium');
      expect(determineConfidence(0.79)).toBe('medium');
    });

    it('returns low for score < 0.6', () => {
      expect(determineConfidence(0.59)).toBe('low');
      expect(determineConfidence(0.3)).toBe('low');
      expect(determineConfidence(0)).toBe('low');
    });
  });

  describe('createMatcher', () => {
    // Use fallback embeddings for tests (no model required)
    const candidates: Candidate[] = [
      {
        id: 'tdd',
        text: 'Test-driven development workflow with red green refactor',
        keywords: ['tdd', 'test-driven', 'red green refactor'],
      },
      {
        id: 'code-review',
        text: 'Code review guidelines and best practices',
        keywords: ['review', 'pr', 'pull request'],
      },
      {
        id: 'documentation',
        text: 'Writing documentation and API references',
        keywords: ['docs', 'documentation', 'readme'],
      },
    ];

    it('creates matcher with options', async () => {
      const matcher = await createMatcher({
        immediateThreshold: 0.85,
        suggestionThreshold: 0.70,
      });
      expect(matcher).toBeDefined();
      expect(matcher.getOptions()).toMatchObject({
        immediateThreshold: 0.85,
        suggestionThreshold: 0.70,
      });
    });

    it('uses default options when not specified', async () => {
      const matcher = await createMatcher();
      const options = matcher.getOptions();
      expect(options.keywordWeight).toBe(0.3);
      expect(options.embeddingWeight).toBe(0.7);
      expect(options.immediateThreshold).toBe(0.85);
      expect(options.suggestionThreshold).toBe(0.70);
    });

    it('reports initialized after creation', async () => {
      const matcher = await createMatcher();
      expect(matcher.isInitialized()).toBe(true);
    });

    it('matches query with keyword', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('review my code please', candidates);

      expect(result.query).toBe('review my code please');
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);

      // Code review should have a keyword match
      const reviewMatch = result.matches.find(m => m.candidate.id === 'code-review');
      expect(reviewMatch).toBeDefined();
      expect(reviewMatch!.keywordScore).toBeGreaterThan(0);
    });

    it('returns matches sorted by score', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('write tests first', candidates);

      for (let i = 1; i < result.matches.length; i++) {
        expect(result.matches[i - 1].score).toBeGreaterThanOrEqual(result.matches[i].score);
      }
    });

    it('handles empty candidates', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('any query', []);

      expect(result.matches).toHaveLength(0);
      expect(result.signals).toHaveLength(0);
    });

    it('respects maxMatches option', async () => {
      const matcher = await createMatcher({ maxMatches: 2 });
      const result = await matcher.match('test', candidates);

      expect(result.matches.length).toBeLessThanOrEqual(2);
    });

    it('uses pre-computed embeddings when available', async () => {
      const embedding1 = fallbackEmbedding('Test-driven development');
      const embedding2 = fallbackEmbedding('Code review');

      const candidatesWithEmbeddings: Candidate[] = [
        { id: 'skill-1', text: 'Test-driven development', embedding: embedding1 },
        { id: 'skill-2', text: 'Code review', embedding: embedding2 },
      ];

      const matcher = await createMatcher();
      const result = await matcher.match('tdd workflow', candidatesWithEmbeddings);

      expect(result.matches.length).toBe(2);
    });

    it('can embed text directly', async () => {
      const matcher = await createMatcher();
      const embedding = await matcher.embed('hello world');

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
    });

    it('includes signals in result', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('review the code', candidates);

      expect(result.signals.length).toBeGreaterThan(0);

      const keywordSignals = result.signals.filter(s => s.type === 'keyword');
      const embeddingSignals = result.signals.filter(s => s.type === 'embedding');

      expect(keywordSignals.length).toBeGreaterThan(0);
      expect(embeddingSignals.length).toBeGreaterThan(0);
    });

    it('assigns mode to each match', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('review', candidates);

      for (const match of result.matches) {
        expect(['immediate', 'suggestion', 'none']).toContain(match.mode);
      }
    });

    it('assigns confidence to each match', async () => {
      const matcher = await createMatcher();
      const result = await matcher.match('review', candidates);

      for (const match of result.matches) {
        expect(['high', 'medium', 'low']).toContain(match.confidence);
      }
    });
  });

  describe('fallback embedding', () => {
    it('generates embeddings without model', () => {
      const embedding = fallbackEmbedding('hello world');
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    it('generates normalized embeddings', () => {
      const embedding = fallbackEmbedding('test text');
      const mag = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
      expect(mag).toBeCloseTo(1, 1);
    });

    it('generates similar embeddings for similar text', () => {
      const e1 = fallbackEmbedding('hello world');
      const e2 = fallbackEmbedding('hello world');
      expect(cosineSimilarity(e1, e2)).toBeCloseTo(1);
    });

    it('generates different embeddings for different text', () => {
      const e1 = fallbackEmbedding('hello world');
      const e2 = fallbackEmbedding('completely different');
      expect(cosineSimilarity(e1, e2)).toBeLessThan(1);
    });
  });
});
