/**
 * Tests for Exponential Backoff
 *
 * TDD: RED phase - these tests define the expected behavior
 */

import { describe, it, expect } from 'vitest';
import { calculateDelay, shouldRetry, DEFAULT_BACKOFF_CONFIG } from './backoff.js';
import type { BackoffConfig } from './backoff.js';

describe('calculateDelay', () => {
  const baseConfig: BackoffConfig = {
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    multiplier: 2,
    jitterMs: 0, // No jitter for deterministic tests
  };

  it('should return exponential values based on attempt number', () => {
    // attempt 0: 1000ms
    // attempt 1: 2000ms
    // attempt 2: 4000ms
    // attempt 3: 8000ms
    expect(calculateDelay(0, baseConfig)).toBe(1000);
    expect(calculateDelay(1, baseConfig)).toBe(2000);
    expect(calculateDelay(2, baseConfig)).toBe(4000);
    expect(calculateDelay(3, baseConfig)).toBe(8000);
  });

  it('should respect maxDelayMs cap', () => {
    const configWithLowMax: BackoffConfig = {
      ...baseConfig,
      maxDelayMs: 5000,
    };

    // attempt 3 would be 8000ms, but capped at 5000ms
    expect(calculateDelay(3, configWithLowMax)).toBe(5000);
    expect(calculateDelay(10, configWithLowMax)).toBe(5000);
  });

  it('should add jitter within range', () => {
    const configWithJitter: BackoffConfig = {
      ...baseConfig,
      jitterMs: 1000,
    };

    // Run multiple times to verify jitter is within range
    const results: number[] = [];
    for (let i = 0; i < 100; i++) {
      results.push(calculateDelay(0, configWithJitter));
    }

    // Base delay is 1000ms, jitter is 0-1000ms
    // So all values should be between 1000 and 2000
    expect(results.every((r) => r >= 1000 && r <= 2000)).toBe(true);

    // Verify there's some variation (jitter is being applied)
    const uniqueValues = new Set(results);
    expect(uniqueValues.size).toBeGreaterThan(1);
  });

  it('should use default config values', () => {
    expect(DEFAULT_BACKOFF_CONFIG.initialDelayMs).toBe(1000);
    expect(DEFAULT_BACKOFF_CONFIG.maxDelayMs).toBe(30000);
    expect(DEFAULT_BACKOFF_CONFIG.multiplier).toBe(2);
    expect(DEFAULT_BACKOFF_CONFIG.jitterMs).toBe(1000);
  });

  it('should handle custom multiplier', () => {
    const configWithMultiplier3: BackoffConfig = {
      ...baseConfig,
      multiplier: 3,
    };

    // attempt 0: 1000ms
    // attempt 1: 3000ms
    // attempt 2: 9000ms
    expect(calculateDelay(0, configWithMultiplier3)).toBe(1000);
    expect(calculateDelay(1, configWithMultiplier3)).toBe(3000);
    expect(calculateDelay(2, configWithMultiplier3)).toBe(9000);
  });
});

describe('shouldRetry', () => {
  const maxAttempts = 3;

  it('should return false for auth errors (401)', () => {
    const error = new Error('Unauthorized') as Error & { status?: number };
    error.status = 401;

    expect(shouldRetry(error, 0, maxAttempts)).toBe(false);
    expect(shouldRetry(error, 1, maxAttempts)).toBe(false);
  });

  it('should return false for auth errors (403)', () => {
    const error = new Error('Forbidden') as Error & { status?: number };
    error.status = 403;

    expect(shouldRetry(error, 0, maxAttempts)).toBe(false);
    expect(shouldRetry(error, 1, maxAttempts)).toBe(false);
  });

  it('should return true for rate limit errors (429)', () => {
    const error = new Error('Too Many Requests') as Error & { status?: number };
    error.status = 429;

    expect(shouldRetry(error, 0, maxAttempts)).toBe(true);
    expect(shouldRetry(error, 1, maxAttempts)).toBe(true);
  });

  it('should return true for server errors (5xx)', () => {
    const error500 = new Error('Internal Server Error') as Error & { status?: number };
    error500.status = 500;

    const error502 = new Error('Bad Gateway') as Error & { status?: number };
    error502.status = 502;

    const error503 = new Error('Service Unavailable') as Error & { status?: number };
    error503.status = 503;

    expect(shouldRetry(error500, 0, maxAttempts)).toBe(true);
    expect(shouldRetry(error502, 0, maxAttempts)).toBe(true);
    expect(shouldRetry(error503, 0, maxAttempts)).toBe(true);
  });

  it('should return false when max attempts exceeded', () => {
    const error = new Error('Server Error') as Error & { status?: number };
    error.status = 500;

    expect(shouldRetry(error, 2, maxAttempts)).toBe(true); // attempt 2, max 3 -> can retry
    expect(shouldRetry(error, 3, maxAttempts)).toBe(false); // attempt 3, max 3 -> no more retries
    expect(shouldRetry(error, 5, maxAttempts)).toBe(false); // way over max
  });

  it('should return false for client errors (4xx except 429)', () => {
    const error400 = new Error('Bad Request') as Error & { status?: number };
    error400.status = 400;

    const error404 = new Error('Not Found') as Error & { status?: number };
    error404.status = 404;

    const error422 = new Error('Unprocessable Entity') as Error & { status?: number };
    error422.status = 422;

    expect(shouldRetry(error400, 0, maxAttempts)).toBe(false);
    expect(shouldRetry(error404, 0, maxAttempts)).toBe(false);
    expect(shouldRetry(error422, 0, maxAttempts)).toBe(false);
  });

  it('should handle errors without status code as retryable', () => {
    const networkError = new Error('Network error');
    const timeoutError = new Error('Timeout');

    // Network errors without status codes should be retryable
    expect(shouldRetry(networkError, 0, maxAttempts)).toBe(true);
    expect(shouldRetry(timeoutError, 0, maxAttempts)).toBe(true);
  });

  it('should handle errors with statusCode property', () => {
    const error = new Error('Rate limited') as Error & { statusCode?: number };
    error.statusCode = 429;

    expect(shouldRetry(error, 0, maxAttempts)).toBe(true);
  });
});
