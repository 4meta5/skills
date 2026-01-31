/**
 * Profile Matcher - Phase 4 Auto-Selection
 * 
 * Matches user prompts to workflow profiles using regex scoring.
 * Returns the best-matching profile with score metadata.
 */

import type { ProfileSpec } from '../types/profile-spec.js';

export interface MatchResult extends ProfileSpec {
  matchScore: number;
  matchedPatterns: string[];
}

/**
 * Calculate how well a prompt matches a profile's patterns.
 * Returns a score based on number of pattern matches.
 */
export function calculateMatchScore(
  prompt: string,
  profile: ProfileSpec
): number {
  if (!prompt || !profile.match || profile.match.length === 0) {
    return 0;
  }

  const normalizedPrompt = prompt.toLowerCase();
  let score = 0;

  for (const pattern of profile.match) {
    try {
      // Try as regex first
      const regex = new RegExp(pattern, 'i');
      if (regex.test(normalizedPrompt)) {
        score += 1;
      }
    } catch {
      // Fall back to simple string match if regex is invalid
      if (normalizedPrompt.includes(pattern.toLowerCase())) {
        score += 1;
      }
    }
  }

  return score;
}

/**
 * Find which patterns in a profile match the prompt.
 */
function findMatchedPatterns(prompt: string, profile: ProfileSpec): string[] {
  if (!prompt || !profile.match || profile.match.length === 0) {
    return [];
  }

  const normalizedPrompt = prompt.toLowerCase();
  const matched: string[] = [];

  for (const pattern of profile.match) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(normalizedPrompt)) {
        matched.push(pattern);
      }
    } catch {
      if (normalizedPrompt.includes(pattern.toLowerCase())) {
        matched.push(pattern);
      }
    }
  }

  return matched;
}

/**
 * Match a prompt to the best-fitting profile.
 * 
 * Returns null if:
 * - Empty prompt
 * - No profiles
 * - Only the permissive (default) profile matches
 * 
 * Scoring:
 * 1. Calculate match score for each profile
 * 2. Filter out zero-score and permissive profiles
 * 3. Sort by score (desc), then priority (desc)
 * 4. Return the best match with metadata
 */
export function matchProfileToPrompt(
  prompt: string,
  profiles: ProfileSpec[]
): MatchResult | null {
  if (!prompt || !profiles || profiles.length === 0) {
    return null;
  }

  // Calculate scores for all profiles
  const scored = profiles
    .map(profile => ({
      profile,
      score: calculateMatchScore(prompt, profile),
      patterns: findMatchedPatterns(prompt, profile),
    }))
    .filter(item => item.score > 0 && item.profile.name !== 'permissive');

  if (scored.length === 0) {
    return null;
  }

  // Sort by score (desc), then priority (desc)
  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (b.profile.priority || 0) - (a.profile.priority || 0);
  });

  const best = scored[0];
  
  return {
    ...best.profile,
    matchScore: best.score,
    matchedPatterns: best.patterns,
  };
}
