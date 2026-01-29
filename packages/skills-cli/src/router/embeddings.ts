/**
 * Embeddings module for the Semantic Router
 *
 * Uses @xenova/transformers to generate embeddings locally.
 * This avoids API latency and privacy concerns.
 */

// Dynamic import to handle ESM module loading
let pipeline: any = null;
let extractor: any = null;
let initialized = false;

// Default model - small, fast, good quality
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Calculate dot product of two vectors
 * For normalized vectors, this equals cosine similarity
 */
export function dotProduct(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Calculate magnitude (L2 norm) of a vector
 */
export function magnitude(v: number[] | Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(v: number[] | Float32Array): number[] {
  const mag = magnitude(v);
  if (mag === 0) {
    return Array.from(v);
  }
  const result: number[] = new Array(v.length);
  for (let i = 0; i < v.length; i++) {
    result[i] = v[i] / mag;
  }
  return result;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 (opposite) and 1 (identical)
 */
export function cosineSimilarity(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * Check if the model is initialized
 */
export function isModelInitialized(): boolean {
  return initialized;
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

  // Dynamic import for ESM compatibility
  const { pipeline: pipelineFn } = await import('@xenova/transformers');
  pipeline = pipelineFn;

  // Create feature extraction pipeline
  extractor = await pipeline('feature-extraction', model, {
    quantized: true, // Use quantized model for smaller size
  });

  initialized = true;
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
  // For larger batches, consider batching
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Reset the model (for testing)
 */
export function resetModel(): void {
  initialized = false;
  extractor = null;
  pipeline = null;
}
