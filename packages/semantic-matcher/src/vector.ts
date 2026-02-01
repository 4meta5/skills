/**
 * Vector operations for embedding similarity
 */

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
export function normalize(v: number[] | Float32Array): number[] {
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
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan distance between two vectors
 */
export function manhattanDistance(
  a: number[] | Float32Array,
  b: number[] | Float32Array
): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum;
}
