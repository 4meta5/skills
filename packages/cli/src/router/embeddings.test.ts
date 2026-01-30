/**
 * Tests for the embeddings module
 *
 * TDD Phase 1: RED - These tests will fail until implementation exists
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeModel,
  generateEmbedding,
  cosineSimilarity,
  dotProduct,
  normalizeVector,
  isModelInitialized,
} from './embeddings.js';

describe('embeddings', () => {
  describe('vector operations', () => {
    describe('dotProduct', () => {
      it('should calculate dot product of two vectors', () => {
        const a = [1, 2, 3];
        const b = [4, 5, 6];
        // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
        expect(dotProduct(a, b)).toBe(32);
      });

      it('should return 0 for orthogonal vectors', () => {
        const a = [1, 0];
        const b = [0, 1];
        expect(dotProduct(a, b)).toBe(0);
      });

      it('should handle empty vectors', () => {
        expect(dotProduct([], [])).toBe(0);
      });

      it('should work with Float32Array', () => {
        const a = new Float32Array([1, 2, 3]);
        const b = new Float32Array([4, 5, 6]);
        expect(dotProduct(a, b)).toBe(32);
      });
    });

    describe('normalizeVector', () => {
      it('should normalize a vector to unit length', () => {
        const v = [3, 4]; // magnitude = 5
        const normalized = normalizeVector(v);
        expect(normalized[0]).toBeCloseTo(0.6);
        expect(normalized[1]).toBeCloseTo(0.8);
      });

      it('should return zero vector for zero input', () => {
        const v = [0, 0, 0];
        const normalized = normalizeVector(v);
        expect(normalized).toEqual([0, 0, 0]);
      });

      it('should handle already normalized vectors', () => {
        const v = [1, 0];
        const normalized = normalizeVector(v);
        expect(normalized[0]).toBeCloseTo(1);
        expect(normalized[1]).toBeCloseTo(0);
      });
    });

    describe('cosineSimilarity', () => {
      it('should return 1 for identical vectors', () => {
        const v = [1, 2, 3];
        expect(cosineSimilarity(v, v)).toBeCloseTo(1);
      });

      it('should return -1 for opposite vectors', () => {
        const a = [1, 0];
        const b = [-1, 0];
        expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
      });

      it('should return 0 for orthogonal vectors', () => {
        const a = [1, 0];
        const b = [0, 1];
        expect(cosineSimilarity(a, b)).toBeCloseTo(0);
      });

      it('should handle pre-normalized vectors efficiently', () => {
        const a = [0.6, 0.8];
        const b = [0.8, 0.6];
        // cos(θ) = 0.6*0.8 + 0.8*0.6 = 0.96
        expect(cosineSimilarity(a, b)).toBeCloseTo(0.96);
      });
    });
  });

  describe('model operations', () => {
    // Note: These tests require the model to be downloaded
    // In CI, we might skip these or use mocks

    describe('isModelInitialized', () => {
      it('should return false before initialization', () => {
        expect(isModelInitialized()).toBe(false);
      });
    });

    describe('initializeModel', () => {
      it('should initialize the embedding model', async () => {
        // This test may take a while on first run (model download)
        await initializeModel();
        expect(isModelInitialized()).toBe(true);
      }, 60000); // 60s timeout for model download
    });

    describe('generateEmbedding', () => {
      beforeAll(async () => {
        // Ensure model is initialized
        if (!isModelInitialized()) {
          await initializeModel();
        }
      }, 60000);

      it('should generate embedding for text', async () => {
        const embedding = await generateEmbedding('hello world');
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBeGreaterThan(0);
        // MiniLM produces 384-dimensional embeddings
        expect(embedding.length).toBe(384);
      });

      it('should generate normalized embeddings', async () => {
        const embedding = await generateEmbedding('test text');
        const magnitude = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
        expect(magnitude).toBeCloseTo(1, 3);
      });

      it('should generate similar embeddings for similar text', async () => {
        const e1 = await generateEmbedding('fix the bug in the code');
        const e2 = await generateEmbedding('debug the issue in the program');
        const similarity = cosineSimilarity(e1, e2);
        expect(similarity).toBeGreaterThan(0.5);
      });

      it('should generate different embeddings for unrelated text', async () => {
        const e1 = await generateEmbedding('write unit tests');
        const e2 = await generateEmbedding('weather forecast today');
        const similarity = cosineSimilarity(e1, e2);
        expect(similarity).toBeLessThan(0.5);
      });
    });
  });
});
