import { createSkillsLibrary } from '@anthropic/skills-library';
import type { Skill } from '@anthropic/skills-library';
import type { ProjectAnalysis, Confidence, DetectedTechnology } from './detector/types.js';
import { getAllTags, getAllTechnologies } from './detector/index.js';
import {
  findMatchingCuratedSources,
  type CuratedSource
} from './curated-sources.js';
import { getSources, type SkillSource } from './config.js';
import { listRemoteSkills, loadRemoteSkill, type RemoteSkill } from './registry.js';

/**
 * A skill recommendation with confidence and source
 */
export interface SkillRecommendation {
  name: string;
  confidence: Confidence;
  reason: string;
  source: SkillSourceType;
  sourceName?: string;  // Name of the source (for registered/curated)
  skill?: Skill;        // Loaded skill details (if available)
  tags: string[];       // Tags that matched
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
 * Built-in skill mappings (bundled skills)
 */
const BUNDLED_SKILL_TAGS: Record<string, string[]> = {
  'code-review-rust': ['rust', 'rs', 'cargo'],
  'code-review-ts': ['typescript', 'ts'],
  'test-first-bugfix': ['testing', 'unit-testing', 'tdd'],
  'unit-test-workflow': ['testing', 'unit-testing'],
  'suggest-tests': ['testing', 'unit-testing'],
  'security-analysis': ['security'],
  'differential-review': ['security', 'code-review']
};

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

  for (const [skillName, skillTags] of Object.entries(BUNDLED_SKILL_TAGS)) {
    // Skip if already installed
    if (analysis.existingSkills.includes(skillName)) {
      continue;
    }

    const { confidence, matchedTags, reason } = calculateConfidence(
      skillTags,
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
          tags: matchedTags
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
        recommendations.push({
          name: remote.name,
          confidence,
          reason,
          source: 'registered',
          sourceName: remote.source.name,
          skill,
          tags: matchedTags
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
        tags: matchedTags
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

  // Combine and deduplicate (bundled > registered > curated)
  const allRecommendations: SkillRecommendation[] = [];
  const seenNames = new Set<string>();

  // Add in priority order
  for (const rec of [...bundled, ...registered, ...curated]) {
    if (!seenNames.has(rec.name)) {
      seenNames.add(rec.name);
      allRecommendations.push(rec);
    }
  }

  // Sort into confidence buckets
  const result: MatchResult = {
    high: [],
    medium: [],
    low: []
  };

  for (const rec of allRecommendations) {
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
