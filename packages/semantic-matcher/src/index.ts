/**
 * @4meta5/semantic-matcher
 *
 * Hybrid keyword + embedding semantic matcher with RRF fusion.
 *
 * @example
 * ```typescript
 * import { createMatcher } from '@4meta5/semantic-matcher';
 *
 * const matcher = await createMatcher({
 *   keywordWeight: 0.3,
 *   embeddingWeight: 0.7
 * });
 *
 * const candidates = [
 *   { id: 'skill-1', text: 'Test-driven development workflow', keywords: ['tdd', 'testing'] },
 *   { id: 'skill-2', text: 'Code review guidelines', keywords: ['review', 'pr'] }
 * ];
 *
 * const result = await matcher.match('write tests first', candidates);
 * console.log(result.matches[0].candidate.id); // 'skill-1'
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  MatchConfidence,
  SignalType,
  ActivationMode,
  Candidate,
  Match,
  MatchSignal,
  MatchResult,
  KeywordPattern,
  MatcherOptions,
  Matcher,
} from './types.js';

export { DEFAULT_MATCHER_OPTIONS } from './types.js';

// Main matcher
export {
  createMatcher,
  combineScores,
  determineActivationMode,
  determineConfidence,
} from './matcher.js';

// Vector operations
export {
  dotProduct,
  magnitude,
  normalize,
  cosineSimilarity,
  euclideanDistance,
  manhattanDistance,
} from './vector.js';

// Keyword matching
export {
  buildKeywordPatterns,
  matchKeywords,
  escapeRegex,
  keywordOverlapScore,
  extractQueryTerms,
} from './keyword.js';
export type { KeywordMatchResult } from './keyword.js';

// Embedding generation
export {
  initializeModel,
  generateEmbedding,
  generateEmbeddings,
  isModelInitialized,
  getInitError,
  getEmbeddingDimension,
  resetModel,
  fallbackEmbedding,
} from './embedding.js';
