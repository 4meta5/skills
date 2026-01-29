/**
 * Types for the Semantic Router
 *
 * Implements the "Iris" architecture from NEW_RESEARCH.md:
 * - Multi-signal extraction (keyword + embedding)
 * - Threshold-based activation decisions
 * - Deterministic skill enforcement
 */

/**
 * Activation mode determined by the router
 * - IMMEDIATE: Score > 0.85 - Skip LLM decision, force tool use
 * - SUGGESTION: Score 0.70-0.85 - Suggest skill to LLM
 * - CHAT: Score < 0.70 - Normal conversation mode
 */
export type ActivationMode = 'immediate' | 'suggestion' | 'chat';

/**
 * Signal type used for routing decision
 */
export type SignalType = 'keyword' | 'embedding' | 'combined';

/**
 * A single routing signal with its score
 */
export interface RoutingSignal {
  type: SignalType;
  score: number;
  source: string; // What matched (regex pattern or "semantic")
}

/**
 * Stored vector for a skill
 */
export interface SkillVector {
  skillName: string;
  description: string;
  triggerExamples: string[];
  embedding: number[]; // Float32Array serialized as number[]
  keywords: string[]; // Fast-path regex patterns
}

/**
 * Result of routing a query
 */
export interface RoutingResult {
  query: string;
  mode: ActivationMode;
  matches: SkillMatch[];
  signals: RoutingSignal[];
  processingTimeMs: number;
}

/**
 * A matched skill with its scores
 */
export interface SkillMatch {
  skillName: string;
  score: number;
  keywordScore: number;
  embeddingScore: number;
  matchedKeywords: string[];
}

/**
 * Configuration for the router
 */
export interface RouterConfig {
  /** Path to vector store JSON file */
  vectorStorePath: string;

  /** Embedding model to use (default: Xenova/all-MiniLM-L6-v2) */
  embeddingModel?: string;

  /** Threshold for immediate activation (default: 0.85) */
  immediateThreshold?: number;

  /** Threshold for suggestion mode (default: 0.70) */
  suggestionThreshold?: number;

  /** Weight for keyword signals (0-1, default: 0.3) */
  keywordWeight?: number;

  /** Weight for embedding signals (0-1, default: 0.7) */
  embeddingWeight?: number;

  /** Enable caching of embeddings (default: true) */
  cacheEmbeddings?: boolean;
}

/**
 * Default router configuration
 */
export const DEFAULT_ROUTER_CONFIG: Required<RouterConfig> = {
  vectorStorePath: '',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  immediateThreshold: 0.85,
  suggestionThreshold: 0.70,
  keywordWeight: 0.3,
  embeddingWeight: 0.7,
  cacheEmbeddings: true,
};

/**
 * Vector store format (stored as JSON)
 */
export interface VectorStore {
  version: string;
  model: string;
  generatedAt: string;
  skills: SkillVector[];
}

/**
 * Router instance interface
 */
export interface Router {
  /**
   * Initialize the router (loads model and vector store)
   */
  initialize(): Promise<void>;

  /**
   * Route a query to determine activation mode
   */
  route(query: string): Promise<RoutingResult>;

  /**
   * Check if router is initialized
   */
  isInitialized(): boolean;

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig;
}

/**
 * Keyword pattern for fast-path routing
 */
export interface KeywordPattern {
  skillName: string;
  pattern: RegExp;
  priority: number; // Higher = checked first
}
