/**
 * Exponential Backoff with Jitter
 *
 * Implements retry logic with exponential backoff for API calls
 */

/** HTTP status codes that should never be retried */
const NON_RETRYABLE_AUTH_CODES = [401, 403] as const;

/** HTTP status code that indicates rate limiting */
const RATE_LIMIT_CODE = 429;

/**
 * Error with optional HTTP status code
 */
export type ErrorWithStatus = Error & { status?: number; statusCode?: number };

/**
 * Extract HTTP status code from an error
 */
function getStatusCode(error: Error): number | undefined {
  const errorWithStatus = error as ErrorWithStatus;
  return errorWithStatus.status ?? errorWithStatus.statusCode;
}

/**
 * Configuration for exponential backoff
 */
export interface BackoffConfig {
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** Multiplier for exponential growth (default: 2) */
  multiplier: number;
  /** Random jitter in milliseconds to add (default: 1000) */
  jitterMs: number;
}

/**
 * Default backoff configuration
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  multiplier: 2,
  jitterMs: 1000,
};

/**
 * Calculate the delay for a given retry attempt
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Backoff configuration
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number, config: BackoffConfig): number {
  // Calculate exponential delay: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.multiplier, attempt);

  // Cap at maxDelayMs
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

  // Add random jitter (0 to jitterMs)
  const jitter = config.jitterMs > 0 ? Math.random() * config.jitterMs : 0;

  return cappedDelay + jitter;
}

/**
 * Determine if an error should trigger a retry
 *
 * @param error - The error that occurred
 * @param attempt - The current attempt number (0-indexed)
 * @param max - Maximum number of attempts
 * @returns true if retry should be attempted
 */
export function shouldRetry(error: Error, attempt: number, max: number): boolean {
  // Check if we've exceeded max attempts
  if (attempt >= max) {
    return false;
  }

  const statusCode = getStatusCode(error);

  // No status code (e.g., network errors) - these are retryable
  if (statusCode === undefined) {
    return true;
  }

  // Auth errors (401, 403) - never retry
  if (NON_RETRYABLE_AUTH_CODES.includes(statusCode as typeof NON_RETRYABLE_AUTH_CODES[number])) {
    return false;
  }

  // Rate limit (429) - always retry
  if (statusCode === RATE_LIMIT_CODE) {
    return true;
  }

  // Server errors (5xx) - always retry
  if (statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // Other client errors (4xx except 429) - don't retry
  if (statusCode >= 400 && statusCode < 500) {
    return false;
  }

  // Default: don't retry for unknown cases
  return false;
}
