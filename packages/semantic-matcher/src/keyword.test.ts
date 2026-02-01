import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  buildKeywordPatterns,
  matchKeywords,
  keywordOverlapScore,
  extractQueryTerms,
} from './keyword.js';

describe('keyword matching', () => {
  describe('escapeRegex', () => {
    it('escapes special regex characters', () => {
      expect(escapeRegex('hello.world')).toBe('hello\\.world');
      expect(escapeRegex('foo*bar')).toBe('foo\\*bar');
      expect(escapeRegex('(test)')).toBe('\\(test\\)');
    });

    it('handles strings without special characters', () => {
      expect(escapeRegex('hello')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(escapeRegex('')).toBe('');
    });
  });

  describe('buildKeywordPatterns', () => {
    it('builds patterns from candidates', () => {
      const candidates = [
        { id: 'skill-1', keywords: ['tdd', 'testing'] },
        { id: 'skill-2', keywords: ['review'] },
      ];
      const patterns = buildKeywordPatterns(candidates);

      expect(patterns).toHaveLength(3);
      expect(patterns.map(p => p.candidateId)).toContain('skill-1');
      expect(patterns.map(p => p.candidateId)).toContain('skill-2');
    });

    it('handles candidates without keywords', () => {
      const candidates = [
        { id: 'skill-1', keywords: ['tdd'] },
        { id: 'skill-2' }, // No keywords
      ];
      const patterns = buildKeywordPatterns(candidates);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].candidateId).toBe('skill-1');
    });

    it('escapes special characters in keywords', () => {
      const candidates = [{ id: 'skill-1', keywords: ['C++'] }];
      const patterns = buildKeywordPatterns(candidates);

      expect(patterns[0].pattern.source).toContain('\\+\\+');
    });
  });

  describe('matchKeywords', () => {
    const patterns = [
      { candidateId: 'git-commit', pattern: /\b(commit|git commit)\b/i, priority: 10 },
      { candidateId: 'test-runner', pattern: /\b(test|run tests?|testing)\b/i, priority: 10 },
      { candidateId: 'code-review', pattern: /\b(review|code review)\b/i, priority: 5 },
    ];

    it('matches exact keywords', () => {
      const result = matchKeywords('git commit my changes', patterns);
      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe('git-commit');
      expect(result[0].score).toBeGreaterThan(0);
    });

    it('matches multiple keywords', () => {
      const result = matchKeywords('commit and run tests', patterns);
      expect(result).toHaveLength(2);
      expect(result.map(r => r.candidateId)).toContain('git-commit');
      expect(result.map(r => r.candidateId)).toContain('test-runner');
    });

    it('returns empty for no matches', () => {
      const result = matchKeywords('hello world', patterns);
      expect(result).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const result = matchKeywords('RUN TESTS please', patterns);
      expect(result).toHaveLength(1);
      expect(result[0].candidateId).toBe('test-runner');
    });

    it('sorts by priority', () => {
      const result = matchKeywords('review and test', patterns);
      expect(result).toHaveLength(2);
      // test-runner has higher priority (10) than code-review (5)
      expect(result[0].candidateId).toBe('test-runner');
      expect(result[1].candidateId).toBe('code-review');
    });

    it('accumulates matched keywords for same candidate', () => {
      const multiPatterns = [
        { candidateId: 'skill-1', pattern: /\bfoo\b/i, priority: 10 },
        { candidateId: 'skill-1', pattern: /\bbar\b/i, priority: 10 },
      ];
      const result = matchKeywords('foo and bar', multiPatterns);
      expect(result).toHaveLength(1);
      expect(result[0].matchedKeywords).toContain('foo');
      expect(result[0].matchedKeywords).toContain('bar');
    });
  });

  describe('keywordOverlapScore', () => {
    it('returns 1 for perfect match', () => {
      const queryTerms = ['tdd', 'testing'];
      const keywords = ['tdd', 'testing'];
      expect(keywordOverlapScore(queryTerms, keywords)).toBe(1);
    });

    it('returns partial score for partial match', () => {
      const queryTerms = ['tdd', 'testing', 'unit'];
      const keywords = ['tdd', 'testing'];
      // 2 out of 3 match
      expect(keywordOverlapScore(queryTerms, keywords)).toBeCloseTo(2 / 3);
    });

    it('returns 0 for no match', () => {
      const queryTerms = ['foo', 'bar'];
      const keywords = ['baz', 'qux'];
      expect(keywordOverlapScore(queryTerms, keywords)).toBe(0);
    });

    it('returns 0 for empty arrays', () => {
      expect(keywordOverlapScore([], ['tdd'])).toBe(0);
      expect(keywordOverlapScore(['tdd'], [])).toBe(0);
      expect(keywordOverlapScore([], [])).toBe(0);
    });

    it('handles substring matches', () => {
      const queryTerms = ['test'];
      const keywords = ['testing'];
      expect(keywordOverlapScore(queryTerms, keywords)).toBe(1);
    });
  });

  describe('extractQueryTerms', () => {
    it('extracts words from query', () => {
      const terms = extractQueryTerms('run my tests');
      expect(terms).toContain('run');
      expect(terms).toContain('tests');
    });

    it('filters out short words', () => {
      const terms = extractQueryTerms('a be testing');
      expect(terms).not.toContain('a');
      expect(terms).not.toContain('be');
      expect(terms).toContain('testing');
    });

    it('filters out stop words', () => {
      const terms = extractQueryTerms('the quick brown fox');
      expect(terms).not.toContain('the');
      expect(terms).toContain('quick');
      expect(terms).toContain('brown');
      expect(terms).toContain('fox');
    });

    it('converts to lowercase', () => {
      const terms = extractQueryTerms('RUN TESTS');
      expect(terms).toContain('run');
      expect(terms).toContain('tests');
    });

    it('handles empty string', () => {
      const terms = extractQueryTerms('');
      expect(terms).toHaveLength(0);
    });
  });
});
