/**
 * Types for the Semantic Matcher
 *
 * Implements hybrid keyword + embedding matching with RRF fusion.
 * Default weights: 30% keyword, 70% embedding.
 */

/**
 * Match confidence level
 */
export type MatchConfidence = 'high' | 'medium' | 'low';

/**
 * Signal type used for matching
 */
export type SignalType = 'keyword' | 'embedding' | 'combined';

/**
 * Activation mode based on score thresholds
 * - immediate: Score >= immediateThreshold (default 0.85)
 * - suggestion: Score >= suggestionThreshold (default 0.70)
 * - none: Score < suggestionThreshold
 */
export type ActivationMode = 'immediate' | 'suggestion' | 'none';

/**
 * A candidate item that can be matched against
 */
export interface Candidate<T = unknown> {
  /** Unique identifier for the candidate */
  id: string;
  /** Text to generate embedding from (description, content, etc.) */
  text: string;
  /** Keywords for fast-path matching */
  keywords?: string[];
  /** Pre-computed embedding (if available) */
  embedding?: number[];
  /** Optional metadata associated with the candidate */
  metadata?: T;
}

/**
 * A match result with scores
 */
export interface Match<T = unknown> {
  /** Candidate that was matched */
  candidate: Candidate<T>;
  /** Combined score (0-1) */
  score: number;
  /** Keyword match score (0-1) */
  keywordScore: number;
  /** Embedding similarity score (0-1) */
  embeddingScore: number;
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Activation mode based on thresholds */
  mode: ActivationMode;
  /** Confidence level */
  confidence: MatchConfidence;
}

/**
 * Signal contributing to the match score
 */
export interface MatchSignal {
  type: SignalType;
  score: number;
  source: string;
}

/**
 * Result of a matching operation
 */
export interface MatchResult<T = unknown> {
  /** Original query */
  query: string;
  /** All matches sorted by score (descending) */
  matches: Match<T>[];
  /** Signals that contributed to the decision */
  signals: MatchSignal[];
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Keyword pattern for fast-path matching
 */
export interface KeywordPattern {
  /** ID of the candidate this pattern matches */
  candidateId: string;
  /** Regex pattern to match against query */
  pattern: RegExp;
  /** Priority (higher = checked first) */
  priority: number;
}

/**
 * Configuration for the matcher
 */
export interface MatcherOptions {
  /** Embedding model to use (default: 'Xenova/all-MiniLM-L6-v2') */
  embeddingModel?: string;

  /** Weight for keyword signals (0-1, default: 0.3) */
  keywordWeight?: number;

  /** Weight for embedding signals (0-1, default: 0.7) */
  embeddingWeight?: number;

  /** Threshold for immediate activation (default: 0.85) */
  immediateThreshold?: number;

  /** Threshold for suggestion mode (default: 0.70) */
  suggestionThreshold?: number;

  /** Enable caching of embeddings (default: true) */
  cacheEmbeddings?: boolean;

  /** Maximum number of matches to return (default: 10) */
  maxMatches?: number;
}

/**
 * Default matcher options
 */
export const DEFAULT_MATCHER_OPTIONS: Required<MatcherOptions> = {
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  keywordWeight: 0.3,
  embeddingWeight: 0.7,
  immediateThreshold: 0.85,
  suggestionThreshold: 0.70,
  cacheEmbeddings: true,
  maxMatches: 10,
};

/**
 * Matcher interface
 */
export interface Matcher<T = unknown> {
  /**
   * Match a query against candidates
   */
  match(query: string, candidates: Candidate<T>[]): Promise<MatchResult<T>>;

  /**
   * Generate embedding for text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Check if the embedding model is initialized
   */
  isInitialized(): boolean;

  /**
   * Get current options
   */
  getOptions(): Required<MatcherOptions>;
}
