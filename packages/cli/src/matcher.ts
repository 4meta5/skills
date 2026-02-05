import { createSkillsLibrary } from '@4meta5/skills';
import type { Skill } from '@4meta5/skills';
import type { ProjectAnalysis, Confidence, DetectedTechnology, SkillCategory } from './detector/types.js';
import { getAllTags, getAllTechnologies } from './detector/index.js';
import {
  findMatchingCuratedSources,
  type CuratedSource
} from './curated-sources.js';
import { getSources, type SkillSource } from './config.js';
import { listRemoteSkills, loadRemoteSkill, type RemoteSkill } from './registry.js';

/**
 * Alternative skill that was deduplicated
 */
export interface SkillAlternative {
  name: string;
  source: string;
}

/**
 * A skill recommendation with confidence and source
 */
export interface SkillRecommendation {
  name: string;
  confidence: Confidence;
  reason: string;
  source: SkillSourceType;
  sourceName?: string;        // Name of the source (for registered/curated)
  skill?: Skill;              // Loaded skill details (if available)
  tags: string[];             // Tags that matched
  category?: SkillCategory;   // Functional category for grouping/dedup
  priority?: number;          // Priority within category (higher = better)
  alternatives?: SkillAlternative[];  // Other skills for same purpose that were deduplicated
}

/**
 * Type of skill source
 */
export type SkillSourceType = 'bundled' | 'registered' | 'curated';

/**
 * Result of matching skills to a project
 */
export interface MatchResult {
  high: SkillRecommendation[];
  medium: SkillRecommendation[];
  low: SkillRecommendation[];
}

/**
 * Built-in skill mappings (bundled skills) with categories for deduplication
 */
interface BundledSkillMapping {
  tags: string[];
  category: SkillCategory;
  priority: number;  // Higher = better within same category
}

export const BUNDLED_SKILL_MAPPINGS: Record<string, BundledSkillMapping> = {
  'code-review-rust': {
    tags: ['rust', 'rs', 'cargo'],
    category: 'refactoring',
    priority: 10
  },
  'code-review-ts': {
    tags: ['typescript', 'ts'],
    category: 'refactoring',
    priority: 10
  },
  'unit-test-workflow': {
    tags: ['testing', 'unit-testing'],
    category: 'testing',
    priority: 10  // Primary testing skill
  },
  'suggest-tests': {
    tags: ['testing', 'unit-testing'],
    category: 'testing',
    priority: 7  // Complementary to unit-test-workflow
  },
  'security-analysis': {
    tags: ['security'],
    category: 'security',
    priority: 10
  },
  'differential-review': {
    tags: ['security', 'code-review'],
    category: 'security',
    priority: 8  // More specialized than security-analysis
  },
  'deploy-mystack': {
    tags: ['mystack'],
    category: 'development',
    priority: 12
  },
  'google-oauth': {
    tags: ['oauth', 'google', 'auth', 'openid'],
    category: 'security',
    priority: 9
  },
  'svelte5-cloudflare-pages': {
    tags: ['svelte5', 'sveltekit', 'cloudflare-pages', 'pages', 'wrangler'],
    category: 'development',
    priority: 9
  },
  'rust-aws-lambda': {
    tags: ['rust', 'lambda', 'aws', 'lambda_http', 'lambda_runtime'],
    category: 'development',
    priority: 9
  },
  'neon-postgres': {
    tags: ['neon', 'postgres', 'database', 'pgbouncer', 'pooler'],
    category: 'development',
    priority: 9
  }
};

// Backwards compatibility: extract just tags
const BUNDLED_SKILL_TAGS: Record<string, string[]> = Object.fromEntries(
  Object.entries(BUNDLED_SKILL_MAPPINGS).map(([name, mapping]) => [name, mapping.tags])
);

/**
 * Calculate confidence score based on tag matches
 */
function calculateConfidence(
  skillTags: string[],
  detectedTags: Set<string>,
  technologies: DetectedTechnology[]
): { confidence: Confidence; matchedTags: string[]; reason: string } {
  const matchedTags = skillTags.filter(tag => detectedTags.has(tag.toLowerCase()));
  const matchRatio = matchedTags.length / skillTags.length;

  // Find the technology that best explains this match
  let reason = '';
  let bestConfidence: Confidence = 'low';

  for (const tech of technologies) {
    const techMatches = tech.tags.filter(t => matchedTags.includes(t.toLowerCase()));
    if (techMatches.length > 0) {
      reason = `Detected ${tech.name}`;
      if (tech.evidence) {
        reason += ` (${tech.evidence})`;
      }
      bestConfidence = tech.confidence;
      break;
    }
  }

  // Adjust confidence based on match ratio
  let confidence: Confidence;
  if (matchRatio >= 0.5 && bestConfidence === 'high') {
    confidence = 'high';
  } else if (matchRatio >= 0.3 || bestConfidence === 'medium') {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { confidence, matchedTags, reason };
}

/**
 * Match bundled skills to detected technologies
 */
async function matchBundledSkills(
  analysis: ProjectAnalysis,
  detectedTags: Set<string>,
  technologies: DetectedTechnology[]
): Promise<SkillRecommendation[]> {
  const recommendations: SkillRecommendation[] = [];
  const library = createSkillsLibrary({ cwd: analysis.projectPath });

  for (const [skillName, mapping] of Object.entries(BUNDLED_SKILL_MAPPINGS)) {
    // Skip if already installed
    if (analysis.existingSkills.includes(skillName)) {
      continue;
    }

    const { confidence, matchedTags, reason } = calculateConfidence(
      mapping.tags,
      detectedTags,
      technologies
    );

    if (matchedTags.length > 0) {
      try {
        const skill = await library.loadSkill(skillName);
        recommendations.push({
          name: skillName,
          confidence,
          reason,
          source: 'bundled',
          skill,
          tags: matchedTags,
          category: mapping.category,
          priority: mapping.priority
        });
      } catch {
        // Skill not found in bundled, skip
      }
    }
  }

  return recommendations;
}

/**
 * Match registered source skills to detected technologies
 */
async function matchRegisteredSkills(
  analysis: ProjectAnalysis,
  detectedTags: Set<string>,
  technologies: DetectedTechnology[]
): Promise<SkillRecommendation[]> {
  const recommendations: SkillRecommendation[] = [];
  const remoteSkills = await listRemoteSkills(false);

  for (const remote of remoteSkills) {
    // Skip if already installed
    if (analysis.existingSkills.includes(remote.name)) {
      continue;
    }

    try {
      const skill = await loadRemoteSkill(remote.source.name, remote.name);
      const skillDescription = skill.metadata.description?.toLowerCase() || '';
      const skillName = skill.metadata.name.toLowerCase();

      // Extract tags from skill name and description
      const skillTags = extractTagsFromSkill(skillName, skillDescription, remote.source);

      const { confidence, matchedTags, reason } = calculateConfidence(
        skillTags,
        detectedTags,
        technologies
      );

      if (matchedTags.length > 0) {
        // Infer category from skill metadata
        const category = inferCategory(skillName, skillDescription, matchedTags);

        recommendations.push({
          name: remote.name,
          confidence,
          reason,
          source: 'registered',
          sourceName: remote.source.name,
          skill,
          tags: matchedTags,
          category,
          priority: 0  // Registered skills get default priority
        });
      }
    } catch {
      // Skip skills that fail to load
    }
  }

  return recommendations;
}

/**
 * Match curated source skills to detected technologies
 */
function matchCuratedSkills(
  analysis: ProjectAnalysis,
  detectedTags: Set<string>,
  technologies: DetectedTechnology[]
): SkillRecommendation[] {
  const recommendations: SkillRecommendation[] = [];
  const matchingSources = findMatchingCuratedSources(Array.from(detectedTags));

  for (const curated of matchingSources) {
    for (const skillName of curated.skills) {
      // Skip if already installed
      if (analysis.existingSkills.includes(skillName)) {
        continue;
      }

      const { confidence, matchedTags, reason } = calculateConfidence(
        curated.tags,
        detectedTags,
        technologies
      );

      recommendations.push({
        name: skillName,
        confidence,
        reason: reason || curated.description,
        source: 'curated',
        sourceName: curated.source.name,
        tags: matchedTags,
        category: curated.category,
        priority: curated.priority ?? 0
      });
    }
  }

  return recommendations;
}

/**
 * Extract tags from skill name and description
 */
function extractTagsFromSkill(
  name: string,
  description: string,
  source: SkillSource
): string[] {
  const tags: string[] = [];
  const combined = `${name} ${description}`.toLowerCase();

  // Technology keywords to look for
  const keywords = [
    'svelte', 'sveltekit', 'react', 'vue', 'angular', 'nextjs', 'nuxt',
    'typescript', 'javascript', 'rust', 'python', 'go',
    'cloudflare', 'workers', 'aws', 'lambda', 'cdk', 'sam',
    'postgres', 'postgresql', 'neon', 'supabase', 'prisma', 'drizzle',
    'testing', 'jest', 'vitest', 'playwright', 'cypress',
    'security', 'authentication', 'authorization'
  ];

  for (const keyword of keywords) {
    if (combined.includes(keyword)) {
      tags.push(keyword);
    }
  }

  return tags;
}

/**
 * Infer category from skill name, description, and tags.
 * Order matters - more specific categories should be checked first.
 * Uses word boundary matching to avoid false positives.
 */
function inferCategory(
  name: string,
  description: string,
  tags: string[]
): SkillCategory | undefined {
  const combined = `${name} ${description}`.toLowerCase();

  // Helper to check if any keyword matches as a word boundary
  const matchesKeyword = (keywords: string[]): boolean => {
    return keywords.some(k => {
      // For short keywords, require word boundaries
      // For longer/compound keywords, substring match is fine
      if (k.length <= 4 || k.includes('-')) {
        return new RegExp(`\\b${k.replace('-', '[-\\s]')}\\b`, 'i').test(combined);
      }
      return combined.includes(k);
    });
  };

  // Code quality category - check FIRST because it's the most general assessment category
  // "maturity assessor", "guidelines advisor", "code review" etc.
  const codeQualityKeywords = [
    'maturity', 'assessor', 'advisor', 'guidelines',
    'code-review', 'code review', 'lint', 'format', 'style',
    'code-quality', 'best-practice', 'circular-dependency',
    'refactor', 'clean-code', 'complexity'
  ];
  if (matchesKeyword(codeQualityKeywords) || tags.some(t => codeQualityKeywords.includes(t))) {
    return 'code-quality';
  }

  // Security category - specific security tools and vulnerabilities
  // Be careful not to match general words like "audit" or "access" in non-security contexts
  const securityKeywords = [
    'security', 'vulnerability', 'vulnerabilities',
    'crypto', 'cryptographic', 'cryptography',
    'constant-time', 'wycheproof', 'cve',
    'exploit', 'injection', 'xss', 'csrf',
    'penetration', 'scanner', 'malware'
  ];
  // Also match if name explicitly contains security-related patterns
  const securityNamePatterns = ['security', 'vuln', 'scanner', 'wycheproof', 'constant-time'];
  if (matchesKeyword(securityKeywords) ||
      securityNamePatterns.some(p => name.toLowerCase().includes(p)) ||
      tags.some(t => securityKeywords.includes(t))) {
    return 'security';
  }

  // Documentation category - check before testing
  const documentationKeywords = ['documentation', 'docs', 'readme', 'handbook', 'guide'];
  if (matchesKeyword(documentationKeywords) || tags.some(t => documentationKeywords.includes(t))) {
    return 'documentation';
  }

  // Testing category - specific testing frameworks and patterns
  const testingKeywords = [
    'unit-test', 'e2e', 'integration-test', 'property-based',
    'vitest', 'jest', 'playwright', 'cypress', 'mocha',
    'coverage', 'assertion', 'mock', 'stub', 'test-driven'
  ];
  if (matchesKeyword(testingKeywords) || tags.some(t => testingKeywords.includes(t))) {
    return 'testing';
  }
  // Match 'testing' as a word, but not just 'test' alone (too generic)
  if (/\btesting\b/i.test(combined) && !combined.includes('constant-time')) {
    return 'testing';
  }

  // Framework category
  const frameworkKeywords = ['svelte', 'react', 'vue', 'angular', 'nextjs', 'nuxt', 'sveltekit', 'hono', 'express', 'fastify'];
  if (matchesKeyword(frameworkKeywords) || tags.some(t => frameworkKeywords.includes(t))) {
    return 'framework';
  }

  // Deployment category
  const deploymentKeywords = ['cloudflare', 'workers', 'aws', 'lambda', 'cdk', 'sam', 'docker', 'kubernetes', 'deploy', 'vercel'];
  if (matchesKeyword(deploymentKeywords) || tags.some(t => deploymentKeywords.includes(t))) {
    return 'deployment';
  }

  // Database category
  const databaseKeywords = ['database', 'postgres', 'postgresql', 'mysql', 'sqlite', 'mongo', 'redis', 'drizzle', 'prisma', 'orm', 'neon', 'supabase'];
  if (matchesKeyword(databaseKeywords) || tags.some(t => databaseKeywords.includes(t))) {
    return 'database';
  }

  // Workflow category
  const workflowKeywords = ['workflow', 'automation'];
  if (matchesKeyword(workflowKeywords) || tags.some(t => workflowKeywords.includes(t))) {
    return 'workflow';
  }

  return undefined;
}

/**
 * Create a deduplication key for category-based grouping.
 * Skills with same category AND overlapping tags are considered duplicates.
 */
function getDeduplicationKey(rec: SkillRecommendation): string {
  if (!rec.category) {
    // Skills without category get unique key (no dedup)
    return `uncategorized:${rec.name}`;
  }

  // Sort tags to ensure consistent key regardless of order
  const sortedTags = [...rec.tags].sort().join(',');
  return `${rec.category}:${sortedTags}`;
}

/**
 * Deduplicate skills by functional category + tags.
 * Skills with same purpose (category + overlapping tags) are grouped,
 * keeping the highest priority one and tracking alternatives.
 */
function deduplicateByFunction(
  recommendations: SkillRecommendation[]
): SkillRecommendation[] {
  // Group by deduplication key
  const groups = new Map<string, SkillRecommendation[]>();

  for (const rec of recommendations) {
    const key = getDeduplicationKey(rec);
    const existing = groups.get(key) || [];
    existing.push(rec);
    groups.set(key, existing);
  }

  // For each group, keep the best one and track alternatives
  const deduplicated: SkillRecommendation[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      continue;
    }

    // Sort by: source priority (bundled > registered > curated), then by priority field
    const sourcePriority: Record<SkillSourceType, number> = {
      bundled: 3,
      registered: 2,
      curated: 1
    };

    group.sort((a, b) => {
      const sourceCompare = sourcePriority[b.source] - sourcePriority[a.source];
      if (sourceCompare !== 0) return sourceCompare;
      return (b.priority ?? 0) - (a.priority ?? 0);
    });

    const [best, ...rest] = group;

    // Track alternatives
    if (rest.length > 0) {
      best.alternatives = rest.map(r => ({
        name: r.name,
        source: r.sourceName || r.source
      }));
    }

    deduplicated.push(best);
  }

  return deduplicated;
}

/**
 * Match skills to a project analysis
 */
export async function matchSkills(analysis: ProjectAnalysis): Promise<MatchResult> {
  const detectedTags = new Set(getAllTags(analysis).map(t => t.toLowerCase()));
  const technologies = getAllTechnologies(analysis);

  // Match from all sources
  const [bundled, registered, curated] = await Promise.all([
    matchBundledSkills(analysis, detectedTags, technologies),
    matchRegisteredSkills(analysis, detectedTags, technologies),
    matchCuratedSkills(analysis, detectedTags, technologies)
  ]);

  // Combine and deduplicate by name first (bundled > registered > curated)
  const allRecommendations: SkillRecommendation[] = [];
  const seenNames = new Set<string>();

  // Add in priority order
  for (const rec of [...bundled, ...registered, ...curated]) {
    if (!seenNames.has(rec.name)) {
      seenNames.add(rec.name);
      allRecommendations.push(rec);
    }
  }

  // Apply functional deduplication by category + tags
  const deduplicated = deduplicateByFunction(allRecommendations);

  // Sort into confidence buckets
  const result: MatchResult = {
    high: [],
    medium: [],
    low: []
  };

  for (const rec of deduplicated) {
    result[rec.confidence].push(rec);
  }

  // Sort each bucket by number of matched tags (descending)
  for (const level of ['high', 'medium', 'low'] as Confidence[]) {
    result[level].sort((a, b) => b.tags.length - a.tags.length);
  }

  return result;
}

/**
 * Get all recommendations as a flat list, sorted by confidence
 */
export function getAllRecommendations(result: MatchResult): SkillRecommendation[] {
  return [...result.high, ...result.medium, ...result.low];
}

/**
 * Filter recommendations by minimum confidence
 */
export function filterByConfidence(
  result: MatchResult,
  minConfidence: Confidence
): SkillRecommendation[] {
  switch (minConfidence) {
    case 'high':
      return result.high;
    case 'medium':
      return [...result.high, ...result.medium];
    case 'low':
      return getAllRecommendations(result);
  }
}

/**
 * Filter recommendations by technology tag
 */
export function filterByTag(
  recommendations: SkillRecommendation[],
  tag: string
): SkillRecommendation[] {
  const normalizedTag = tag.toLowerCase();
  return recommendations.filter(rec =>
    rec.tags.some(t => t.toLowerCase().includes(normalizedTag))
  );
}
