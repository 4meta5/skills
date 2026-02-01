import { describe, it, expect } from 'vitest';
import {
  dotProduct,
  magnitude,
  normalize,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
} from './vector.js';

describe('vector operations', () => {
  describe('dotProduct', () => {
    it('calculates dot product of two vectors', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      expect(dotProduct(a, b)).toBe(32);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(dotProduct(a, b)).toBe(0);
    });

    it('handles empty vectors', () => {
      expect(dotProduct([], [])).toBe(0);
    });

    it('works with Float32Array', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      expect(dotProduct(a, b)).toBe(32);
    });

    it('handles vectors of different lengths', () => {
      const a = [1, 2, 3, 4];
      const b = [1, 2];
      // Only considers first 2 elements: 1*1 + 2*2 = 5
      expect(dotProduct(a, b)).toBe(5);
    });
  });

  describe('magnitude', () => {
    it('calculates magnitude of a vector', () => {
      const v = [3, 4];
      // sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
      expect(magnitude(v)).toBe(5);
    });

    it('returns 0 for zero vector', () => {
      expect(magnitude([0, 0, 0])).toBe(0);
    });

    it('returns 1 for unit vector', () => {
      expect(magnitude([1, 0])).toBe(1);
      expect(magnitude([0, 1])).toBe(1);
    });
  });

  describe('normalize', () => {
    it('normalizes a vector to unit length', () => {
      const v = [3, 4]; // magnitude = 5
      const normalized = normalize(v);
      expect(normalized[0]).toBeCloseTo(0.6);
      expect(normalized[1]).toBeCloseTo(0.8);
    });

    it('returns zero vector for zero input', () => {
      const v = [0, 0, 0];
      const normalized = normalize(v);
      expect(normalized).toEqual([0, 0, 0]);
    });

    it('handles already normalized vectors', () => {
      const v = [1, 0];
      const normalized = normalize(v);
      expect(normalized[0]).toBeCloseTo(1);
      expect(normalized[1]).toBeCloseTo(0);
    });

    it('results in unit magnitude', () => {
      const v = [1, 2, 3, 4, 5];
      const normalized = normalize(v);
      expect(magnitude(normalized)).toBeCloseTo(1);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const v = [1, 2, 3];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it('returns -1 for opposite vectors', () => {
      const a = [1, 0];
      const b = [-1, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(-1);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0];
      const b = [0, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0);
    });

    it('handles pre-normalized vectors efficiently', () => {
      const a = [0.6, 0.8];
      const b = [0.8, 0.6];
      // cos(θ) = 0.6*0.8 + 0.8*0.6 = 0.96
      expect(cosineSimilarity(a, b)).toBeCloseTo(0.96);
    });

    it('returns 0 when either vector is zero', () => {
      const a = [0, 0];
      const b = [1, 2];
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it('is symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
    });
  });

  describe('euclideanDistance', () => {
    it('calculates distance between two points', () => {
      const a = [0, 0];
      const b = [3, 4];
      expect(euclideanDistance(a, b)).toBe(5);
    });

    it('returns 0 for identical vectors', () => {
      const v = [1, 2, 3];
      expect(euclideanDistance(v, v)).toBe(0);
    });

    it('is symmetric', () => {
      const a = [1, 2, 3];
      const b = [4, 5, 6];
      expect(euclideanDistance(a, b)).toBeCloseTo(euclideanDistance(b, a));
    });
  });

  describe('manhattanDistance', () => {
    it('calculates Manhattan distance', () => {
      const a = [0, 0];
      const b = [3, 4];
      // |3-0| + |4-0| = 7
      expect(manhattanDistance(a, b)).toBe(7);
    });

    it('returns 0 for identical vectors', () => {
      const v = [1, 2, 3];
      expect(manhattanDistance(v, v)).toBe(0);
    });

    it('handles negative values', () => {
      const a = [-1, -2];
      const b = [1, 2];
      // |1-(-1)| + |2-(-2)| = 2 + 4 = 6
      expect(manhattanDistance(a, b)).toBe(6);
    });
  });
});
