/**
 * Embedding generation module
 *
 * Uses @xenova/transformers for local embedding generation.
 * Falls back to a simple hash-based embedding if transformers is not available.
 */

// Dynamic import to handle optional peer dependency
let pipeline: any = null;
let extractor: any = null;
let initialized = false;
let initError: Error | null = null;

// Default model - small, fast, good quality
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIM = 384;

/**
 * Check if the embedding model is initialized
 */
export function isModelInitialized(): boolean {
  return initialized;
}

/**
 * Get initialization error if any
 */
export function getInitError(): Error | null {
  return initError;
}

/**
 * Initialize the embedding model
 * Downloads model on first use (~30MB)
 */
export async function initializeModel(modelName?: string): Promise<void> {
  if (initialized) {
    return;
  }

  const model = modelName || DEFAULT_MODEL;

  try {
    // Dynamic import for ESM compatibility and optional peer dependency
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;

    // Create feature extraction pipeline
    extractor = await pipeline('feature-extraction', model, {
      quantized: true, // Use quantized model for smaller size
    });

    initialized = true;
    initError = null;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    throw new Error(
      `Failed to initialize embedding model. Make sure @xenova/transformers is installed: ${initError.message}`
    );
  }
}

/**
 * Generate embedding for text
 * Returns normalized 384-dimensional vector (for MiniLM)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!initialized || !extractor) {
    throw new Error('Model not initialized. Call initializeModel() first.');
  }

  // Generate embedding
  const output = await extractor(text, {
    pooling: 'mean', // Mean pooling for sentence embeddings
    normalize: true, // L2 normalization
  });

  // Convert to array and ensure normalization
  const embedding = Array.from(output.data as Float32Array);
  return embedding;
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!initialized || !extractor) {
    throw new Error('Model not initialized. Call initializeModel() first.');
  }

  const embeddings: number[][] = [];

  // Process sequentially to avoid memory issues
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Get embedding dimension
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIM;
}

/**
 * Reset the model (for testing)
 */
export function resetModel(): void {
  initialized = false;
  extractor = null;
  pipeline = null;
  initError = null;
}

/**
 * Simple fallback embedding using character-level hashing
 * Used when @xenova/transformers is not available
 * NOT suitable for production - only for testing/fallback
 */
export function fallbackEmbedding(text: string, dim: number = EMBEDDING_DIM): number[] {
  const embedding = new Array(dim).fill(0);
  const normalized = text.toLowerCase().trim();

  // Simple hash-based embedding
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * (i + 1)) % dim;
    embedding[index] += 1 / (normalized.length || 1);
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, x) => sum + x * x, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dim; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}
