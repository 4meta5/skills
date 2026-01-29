import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectAnalysis, DetectedTechnology, Confidence } from './detector/types.js';
import {
  matchSkills,
  getAllRecommendations,
  filterByConfidence,
  filterByTag,
  type MatchResult,
  type SkillRecommendation
} from './matcher.js';

// Mock the skills library
vi.mock('@anthropic/skills-library', () => ({
  createSkillsLibrary: () => ({
    loadSkill: vi.fn().mockImplementation(async (name: string) => {
      // Return mock skills for bundled skills
      if (name === 'code-review-rust' || name === 'code-review-ts') {
        return {
          metadata: { name, description: `Mock ${name} skill` },
          content: '',
          path: `/bundled/${name}`
        };
      }
      throw new Error(`Skill not found: ${name}`);
    }),
    listSkills: vi.fn().mockResolvedValue([])
  })
}));

// Mock the registry
vi.mock('./registry.js', () => ({
  listRemoteSkills: vi.fn().mockResolvedValue([]),
  loadRemoteSkill: vi.fn().mockRejectedValue(new Error('Not found'))
}));

// Mock the config
vi.mock('./config.js', () => ({
  getSources: vi.fn().mockResolvedValue([]),
  getSource: vi.fn().mockResolvedValue(undefined)
}));

function createAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    languages: [],
    frameworks: [],
    deployment: [],
    testing: [],
    databases: [],
    existingSkills: [],
    projectPath: '/test/project',
    ...overrides
  };
}

function createTech(
  name: string,
  category: 'language' | 'framework' | 'deployment' | 'testing' | 'database',
  tags: string[],
  confidence: Confidence = 'high'
): DetectedTechnology {
  return {
    name,
    category,
    confidence,
    evidence: 'test',
    tags
  };
}

describe('Skill Matcher', () => {
  describe('matchSkills', () => {
    it('matches Rust code review skill for Rust projects', async () => {
      const analysis = createAnalysis({
        languages: [createTech('Rust', 'language', ['rust', 'cargo'])]
      });

      const result = await matchSkills(analysis);

      expect(result.high.length + result.medium.length + result.low.length).toBeGreaterThan(0);
      const rustSkill = getAllRecommendations(result).find(r => r.name === 'code-review-rust');
      expect(rustSkill).toBeDefined();
      expect(rustSkill!.source).toBe('bundled');
    });

    it('matches TypeScript code review skill for TS projects', async () => {
      const analysis = createAnalysis({
        languages: [createTech('TypeScript', 'language', ['typescript', 'ts'])]
      });

      const result = await matchSkills(analysis);

      const tsSkill = getAllRecommendations(result).find(r => r.name === 'code-review-ts');
      expect(tsSkill).toBeDefined();
      expect(tsSkill!.source).toBe('bundled');
    });

    it('skips already installed skills', async () => {
      const analysis = createAnalysis({
        languages: [createTech('Rust', 'language', ['rust', 'cargo'])],
        existingSkills: ['code-review-rust']
      });

      const result = await matchSkills(analysis);

      const rustSkill = getAllRecommendations(result).find(r => r.name === 'code-review-rust');
      expect(rustSkill).toBeUndefined();
    });

    it('assigns higher confidence for better tag matches', async () => {
      const analysis = createAnalysis({
        languages: [
          createTech('TypeScript', 'language', ['typescript', 'ts', 'javascript', 'js'], 'high')
        ]
      });

      const result = await matchSkills(analysis);

      const tsSkill = getAllRecommendations(result).find(r => r.name === 'code-review-ts');
      expect(tsSkill).toBeDefined();
      // Should be high confidence because multiple tags match
      expect(tsSkill!.confidence).toBe('high');
    });
  });

  describe('filterByConfidence', () => {
    const mockResult: MatchResult = {
      high: [
        { name: 'skill-1', confidence: 'high', reason: '', source: 'bundled', tags: [] }
      ],
      medium: [
        { name: 'skill-2', confidence: 'medium', reason: '', source: 'bundled', tags: [] }
      ],
      low: [
        { name: 'skill-3', confidence: 'low', reason: '', source: 'bundled', tags: [] }
      ]
    };

    it('returns only high confidence when filter is high', () => {
      const filtered = filterByConfidence(mockResult, 'high');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('skill-1');
    });

    it('returns high and medium when filter is medium', () => {
      const filtered = filterByConfidence(mockResult, 'medium');
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.name)).toContain('skill-1');
      expect(filtered.map(r => r.name)).toContain('skill-2');
    });

    it('returns all when filter is low', () => {
      const filtered = filterByConfidence(mockResult, 'low');
      expect(filtered).toHaveLength(3);
    });
  });

  describe('filterByTag', () => {
    const recommendations: SkillRecommendation[] = [
      { name: 'svelte-skill', confidence: 'high', reason: '', source: 'curated', tags: ['svelte', 'frontend'] },
      { name: 'rust-skill', confidence: 'high', reason: '', source: 'bundled', tags: ['rust', 'cargo'] },
      { name: 'cloudflare-skill', confidence: 'medium', reason: '', source: 'curated', tags: ['cloudflare', 'workers'] }
    ];

    it('filters by exact tag match', () => {
      const filtered = filterByTag(recommendations, 'svelte');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('svelte-skill');
    });

    it('filters by partial tag match', () => {
      const filtered = filterByTag(recommendations, 'cloud');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('cloudflare-skill');
    });

    it('filters by name match', () => {
      const filtered = filterByTag(recommendations, 'rust');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('rust-skill');
    });

    it('returns empty array when no matches', () => {
      const filtered = filterByTag(recommendations, 'python');
      expect(filtered).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const filtered = filterByTag(recommendations, 'SVELTE');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('svelte-skill');
    });
  });

  describe('getAllRecommendations', () => {
    it('returns recommendations in confidence order', () => {
      const result: MatchResult = {
        high: [{ name: 'high-1', confidence: 'high', reason: '', source: 'bundled', tags: [] }],
        medium: [{ name: 'med-1', confidence: 'medium', reason: '', source: 'bundled', tags: [] }],
        low: [{ name: 'low-1', confidence: 'low', reason: '', source: 'bundled', tags: [] }]
      };

      const all = getAllRecommendations(result);

      expect(all).toHaveLength(3);
      expect(all[0].name).toBe('high-1');
      expect(all[1].name).toBe('med-1');
      expect(all[2].name).toBe('low-1');
    });
  });
});

describe('Curated Sources Matching', () => {
  it('recommends Svelte skills for Svelte 5 projects', async () => {
    const analysis = createAnalysis({
      frameworks: [
        createTech('Svelte 5', 'framework', ['svelte', 'svelte5', 'runes', 'frontend'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    // Should have curated Svelte skills
    const svelteRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('svelte')) && r.source === 'curated'
    );
    expect(svelteRecs.length).toBeGreaterThan(0);
  });

  it('recommends Cloudflare skills for Workers projects', async () => {
    const analysis = createAnalysis({
      deployment: [
        createTech('Cloudflare Workers', 'deployment', ['cloudflare', 'workers', 'edge', 'serverless'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const cfRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('cloudflare')) && r.source === 'curated'
    );
    expect(cfRecs.length).toBeGreaterThan(0);
  });

  it('recommends database skills for Neon projects', async () => {
    const analysis = createAnalysis({
      databases: [
        createTech('Neon Postgres', 'database', ['neon', 'postgres', 'postgresql', 'serverless', 'database'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const dbRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('neon') || t.includes('postgres')) && r.source === 'curated'
    );
    expect(dbRecs.length).toBeGreaterThan(0);
  });

  it('recommends AWS skills for CDK projects', async () => {
    const analysis = createAnalysis({
      deployment: [
        createTech('AWS CDK', 'deployment', ['aws', 'cdk', 'infrastructure', 'iac'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const awsRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('aws') || t.includes('cdk')) && r.source === 'curated'
    );
    expect(awsRecs.length).toBeGreaterThan(0);
  });
});
