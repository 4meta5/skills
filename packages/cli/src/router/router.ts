/**
 * Semantic Router Implementation
 *
 * Implements the "Iris" architecture for deterministic skill activation:
 * 1. Keyword signals (fast regex matching)
 * 2. Embedding signals (semantic similarity)
 * 3. Combined scoring with configurable weights
 * 4. Threshold-based activation mode determination
 */

import { readFile } from 'fs/promises';
import { z } from 'zod';
import {
  initializeModel,
  generateEmbedding,
  cosineSimilarity,
  isModelInitialized,
} from './embeddings.js';
import type {
  Router,
  RouterConfig,
  RoutingResult,
  SkillMatch,
  RoutingSignal,
  VectorStore,
  SkillVector,
  KeywordPattern,
  ActivationMode,
  DEFAULT_ROUTER_CONFIG,
} from './types.js';

/**
 * Zod schema for validating SkillVector structure
 */
const SkillVectorSchema = z.object({
  skillName: z.string(),
  description: z.string(),
  triggerExamples: z.array(z.string()),
  embedding: z.array(z.number()),
  keywords: z.array(z.string()),
});

/**
 * Zod schema for validating VectorStore structure
 */
const VectorStoreSchema = z.object({
  version: z.string(),
  model: z.string(),
  generatedAt: z.string(),
  skills: z.array(SkillVectorSchema),
});

/**
 * Validate and parse a VectorStore from unknown JSON data
 * @throws Error with descriptive message if validation fails
 */
function parseVectorStore(data: unknown): VectorStore {
  const result = VectorStoreSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Invalid vector store format: ${issues}`);
  }
  return result.data;
}

/**
 * Result of keyword matching
 */
interface KeywordMatchResult {
  skillName: string;
  score: number;
  matchedKeywords: string[];
  priority: number;
}

/**
 * Match query against keyword patterns
 * Returns matches sorted by priority (highest first)
 */
export function matchKeywords(
  query: string,
  patterns: KeywordPattern[]
): KeywordMatchResult[] {
  const results: KeywordMatchResult[] = [];

  for (const pattern of patterns) {
    const match = query.match(pattern.pattern);
    if (match) {
      results.push({
        skillName: pattern.skillName,
        score: 1.0, // Keyword match is binary but confident
        matchedKeywords: [match[0]],
        priority: pattern.priority,
      });
    }
  }

  // Sort by priority descending
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

/**
 * Combine keyword and embedding scores with weights
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
    return 'chat';
  }
}

/**
 * Build keyword patterns from skill vectors
 */
function buildKeywordPatterns(skills: SkillVector[]): KeywordPattern[] {
  const patterns: KeywordPattern[] = [];

  for (const skill of skills) {
    for (const keyword of skill.keywords) {
      // Escape special regex characters except those we want to use
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      patterns.push({
        skillName: skill.skillName,
        pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
        priority: 10, // Default priority
      });
    }
  }

  return patterns;
}

/**
 * Create a semantic router instance
 */
export async function createRouter(config: RouterConfig): Promise<Router> {
  // Merge with defaults
  const fullConfig: Required<RouterConfig> = {
    vectorStorePath: config.vectorStorePath,
    embeddingModel: config.embeddingModel || 'Xenova/all-MiniLM-L6-v2',
    immediateThreshold: config.immediateThreshold ?? 0.85,
    suggestionThreshold: config.suggestionThreshold ?? 0.70,
    keywordWeight: config.keywordWeight ?? 0.3,
    embeddingWeight: config.embeddingWeight ?? 0.7,
    cacheEmbeddings: config.cacheEmbeddings ?? true,
  };

  let vectorStore: VectorStore | null = null;
  let keywordPatterns: KeywordPattern[] = [];
  let initialized = false;

  // Embedding cache
  const embeddingCache = new Map<string, number[]>();

  return {
    async initialize(): Promise<void> {
      if (initialized) {
        return;
      }

      // Load vector store with validation
      const content = await readFile(fullConfig.vectorStorePath, 'utf-8');
      const parsed = JSON.parse(content);
      vectorStore = parseVectorStore(parsed);

      // Build keyword patterns
      keywordPatterns = buildKeywordPatterns(vectorStore.skills);

      // Initialize embedding model
      if (!isModelInitialized()) {
        await initializeModel(fullConfig.embeddingModel);
      }

      initialized = true;
    },

    async route(query: string): Promise<RoutingResult> {
      const startTime = performance.now();
      const signals: RoutingSignal[] = [];
      const matches: SkillMatch[] = [];

      if (!initialized || !vectorStore) {
        throw new Error('Router not initialized. Call initialize() first.');
      }

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
      let queryEmbedding: number[];
      if (fullConfig.cacheEmbeddings && embeddingCache.has(query)) {
        queryEmbedding = embeddingCache.get(query)!;
      } else {
        queryEmbedding = await generateEmbedding(query);
        if (fullConfig.cacheEmbeddings) {
          embeddingCache.set(query, queryEmbedding);
        }
      }

      // Calculate similarity with all skills
      for (const skill of vectorStore.skills) {
        const embeddingScore = cosineSimilarity(queryEmbedding, skill.embedding);

        // Find keyword match for this skill
        const keywordMatch = keywordMatches.find(km => km.skillName === skill.skillName);
        const keywordScore = keywordMatch ? keywordMatch.score : 0;

        // Combine scores
        const combinedScore = combineScores(
          keywordScore,
          embeddingScore,
          fullConfig.keywordWeight,
          fullConfig.embeddingWeight
        );

        matches.push({
          skillName: skill.skillName,
          score: combinedScore,
          keywordScore,
          embeddingScore,
          matchedKeywords: keywordMatch?.matchedKeywords || [],
        });

        // Track embedding signal
        signals.push({
          type: 'embedding',
          score: embeddingScore,
          source: `semantic similarity with ${skill.skillName}`,
        });
      }

      // Sort matches by score descending
      matches.sort((a, b) => b.score - a.score);

      // Determine mode based on top match
      const topScore = matches.length > 0 ? matches[0].score : 0;
      const mode = determineActivationMode(
        topScore,
        fullConfig.immediateThreshold,
        fullConfig.suggestionThreshold
      );

      const processingTimeMs = performance.now() - startTime;

      return {
        query,
        mode,
        matches,
        signals,
        processingTimeMs,
      };
    },

    isInitialized(): boolean {
      return initialized;
    },

    getConfig(): RouterConfig {
      return fullConfig;
    },
  };
}
