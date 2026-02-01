/**
 * Semantic Matcher Implementation
 *
 * Implements hybrid keyword + embedding matching with RRF fusion.
 * Default weights: 30% keyword, 70% embedding.
 */

import { cosineSimilarity } from './vector.js';
import {
  initializeModel,
  generateEmbedding,
  isModelInitialized,
  fallbackEmbedding,
} from './embedding.js';
import { buildKeywordPatterns, matchKeywords } from './keyword.js';
import type {
  Matcher,
  MatcherOptions,
  MatchResult,
  Match,
  MatchSignal,
  Candidate,
  ActivationMode,
  MatchConfidence,
  DEFAULT_MATCHER_OPTIONS,
} from './types.js';

/**
 * Combine keyword and embedding scores with weights (RRF fusion)
 * Returns a value between 0 and 1
 */
export function combineScores(
  keywordScore: number,
  embeddingScore: number,
  keywordWeight: number,
  embeddingWeight: number
): number {
  const combined = keywordWeight * keywordScore + embeddingWeight * embeddingScore;
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, combined));
}

/**
 * Determine activation mode based on score and thresholds
 */
export function determineActivationMode(
  score: number,
  immediateThreshold: number,
  suggestionThreshold: number
): ActivationMode {
  if (score >= immediateThreshold) {
    return 'immediate';
  } else if (score >= suggestionThreshold) {
    return 'suggestion';
  } else {
    return 'none';
  }
}

/**
 * Determine confidence level based on score
 */
export function determineConfidence(score: number): MatchConfidence {
  if (score >= 0.8) {
    return 'high';
  } else if (score >= 0.6) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Create a semantic matcher instance
 */
export async function createMatcher<T = unknown>(
  options: MatcherOptions = {}
): Promise<Matcher<T>> {
  // Merge with defaults
  const fullOptions: Required<MatcherOptions> = {
    embeddingModel: options.embeddingModel || 'Xenova/all-MiniLM-L6-v2',
    keywordWeight: options.keywordWeight ?? 0.3,
    embeddingWeight: options.embeddingWeight ?? 0.7,
    immediateThreshold: options.immediateThreshold ?? 0.85,
    suggestionThreshold: options.suggestionThreshold ?? 0.70,
    cacheEmbeddings: options.cacheEmbeddings ?? true,
    maxMatches: options.maxMatches ?? 10,
  };

  let initialized = false;
  let useFallback = false;

  // Embedding cache
  const embeddingCache = new Map<string, number[]>();

  // Try to initialize the model
  try {
    if (!isModelInitialized()) {
      await initializeModel(fullOptions.embeddingModel);
    }
    initialized = true;
  } catch {
    // Model initialization failed, will use fallback
    useFallback = true;
    initialized = true; // Mark as initialized to allow matching
  }

  /**
   * Get or compute embedding for text
   */
  async function getEmbedding(text: string): Promise<number[]> {
    if (fullOptions.cacheEmbeddings && embeddingCache.has(text)) {
      return embeddingCache.get(text)!;
    }

    let embedding: number[];
    if (useFallback) {
      embedding = fallbackEmbedding(text);
    } else {
      embedding = await generateEmbedding(text);
    }

    if (fullOptions.cacheEmbeddings) {
      embeddingCache.set(text, embedding);
    }

    return embedding;
  }

  return {
    async match(query: string, candidates: Candidate<T>[]): Promise<MatchResult<T>> {
      const startTime = performance.now();
      const signals: MatchSignal[] = [];
      const matches: Match<T>[] = [];

      if (candidates.length === 0) {
        return {
          query,
          matches: [],
          signals: [],
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Build keyword patterns from candidates
      const keywordPatterns = buildKeywordPatterns(
        candidates.map(c => ({ id: c.id, keywords: c.keywords }))
      );

      // Step 1: Keyword matching (fast path)
      const keywordMatches = matchKeywords(query, keywordPatterns);

      // Track keyword signals
      for (const km of keywordMatches) {
        signals.push({
          type: 'keyword',
          score: km.score,
          source: km.matchedKeywords.join(', '),
        });
      }

      // Step 2: Embedding similarity
      const queryEmbedding = await getEmbedding(query);

      // Calculate similarity with all candidates
      for (const candidate of candidates) {
        // Get or compute candidate embedding
        let candidateEmbedding: number[];
        if (candidate.embedding) {
          candidateEmbedding = candidate.embedding;
        } else {
          candidateEmbedding = await getEmbedding(candidate.text);
        }

        const embeddingScore = cosineSimilarity(queryEmbedding, candidateEmbedding);

        // Find keyword match for this candidate
        const keywordMatch = keywordMatches.find(km => km.candidateId === candidate.id);
        const keywordScore = keywordMatch ? keywordMatch.score : 0;

        // Combine scores
        const combinedScore = combineScores(
          keywordScore,
          embeddingScore,
          fullOptions.keywordWeight,
          fullOptions.embeddingWeight
        );

        // Determine mode and confidence
        const mode = determineActivationMode(
          combinedScore,
          fullOptions.immediateThreshold,
          fullOptions.suggestionThreshold
        );
        const confidence = determineConfidence(combinedScore);

        matches.push({
          candidate,
          score: combinedScore,
          keywordScore,
          embeddingScore,
          matchedKeywords: keywordMatch?.matchedKeywords || [],
          mode,
          confidence,
        });

        // Track embedding signal
        signals.push({
          type: 'embedding',
          score: embeddingScore,
          source: `semantic similarity with ${candidate.id}`,
        });
      }

      // Sort matches by score descending
      matches.sort((a, b) => b.score - a.score);

      // Limit to maxMatches
      const limitedMatches = matches.slice(0, fullOptions.maxMatches);

      const processingTimeMs = performance.now() - startTime;

      return {
        query,
        matches: limitedMatches,
        signals,
        processingTimeMs,
      };
    },

    async embed(text: string): Promise<number[]> {
      return getEmbedding(text);
    },

    isInitialized(): boolean {
      return initialized;
    },

    getOptions(): Required<MatcherOptions> {
      return fullOptions;
    },
  };
}
