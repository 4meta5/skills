/**
 * Keyword matching module
 *
 * Provides fast-path matching using regex patterns.
 */

import type { KeywordPattern } from './types.js';

/**
 * Result of keyword matching
 */
export interface KeywordMatchResult {
  candidateId: string;
  score: number;
  matchedKeywords: string[];
  priority: number;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build keyword patterns from candidates
 */
export function buildKeywordPatterns(
  candidates: Array<{ id: string; keywords?: string[] }>,
  defaultPriority: number = 10
): KeywordPattern[] {
  const patterns: KeywordPattern[] = [];

  for (const candidate of candidates) {
    if (!candidate.keywords) continue;

    for (const keyword of candidate.keywords) {
      const escaped = escapeRegex(keyword);
      patterns.push({
        candidateId: candidate.id,
        pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
        priority: defaultPriority,
      });
    }
  }

  return patterns;
}

/**
 * Match query against keyword patterns
 * Returns matches sorted by priority (highest first)
 */
export function matchKeywords(
  query: string,
  patterns: KeywordPattern[]
): KeywordMatchResult[] {
  const resultMap = new Map<string, KeywordMatchResult>();

  for (const pattern of patterns) {
    const match = query.match(pattern.pattern);
    if (match) {
      const existing = resultMap.get(pattern.candidateId);
      if (existing) {
        // Accumulate matched keywords
        existing.matchedKeywords.push(match[0]);
        // Use highest priority
        existing.priority = Math.max(existing.priority, pattern.priority);
        // Increase score for multiple matches
        existing.score = Math.min(1.0, existing.score + 0.2);
      } else {
        resultMap.set(pattern.candidateId, {
          candidateId: pattern.candidateId,
          score: 1.0,
          matchedKeywords: [match[0]],
          priority: pattern.priority,
        });
      }
    }
  }

  // Convert to array and sort by priority descending
  const results = Array.from(resultMap.values());
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

/**
 * Simple keyword overlap scoring
 * Returns a score between 0 and 1 based on keyword overlap
 */
export function keywordOverlapScore(
  queryTerms: string[],
  candidateKeywords: string[]
): number {
  if (queryTerms.length === 0 || candidateKeywords.length === 0) {
    return 0;
  }

  const querySet = new Set(queryTerms.map(t => t.toLowerCase()));
  const candidateSet = new Set(candidateKeywords.map(k => k.toLowerCase()));

  let matches = 0;
  for (const term of querySet) {
    for (const keyword of candidateSet) {
      if (keyword.includes(term) || term.includes(keyword)) {
        matches++;
        break;
      }
    }
  }

  return matches / querySet.size;
}

/**
 * Extract terms from a query for keyword matching
 */
export function extractQueryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2) // Filter out short words
    .filter(term => !STOP_WORDS.has(term));
}

/**
 * Common stop words to filter out
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'under', 'again',
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
  'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'this', 'that', 'these', 'those',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'doing', 'would', 'could', 'might', 'must', 'shall',
  'what', 'which', 'who', 'whom', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
]);
