/**
 * Semantic Router Module
 *
 * Provides deterministic skill activation based on:
 * - Keyword signals (fast regex matching)
 * - Embedding signals (semantic similarity via transformers.js)
 * - Threshold-based activation modes (immediate, suggestion, chat)
 */

export * from './types.js';
export * from './embeddings.js';
export {
  createRouter,
  matchKeywords,
  combineScores,
  determineActivationMode,
} from './router.js';
