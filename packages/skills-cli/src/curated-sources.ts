import type { SkillSource } from './config.js';
import type { SkillCategory } from './detector/types.js';

/**
 * A curated skill source with metadata for matching
 */
export interface CuratedSource {
  source: SkillSource;
  description: string;
  tags: string[];           // Tags for matching detected technologies
  skills: string[];         // Known skill names in this source
  category: SkillCategory;  // Functional category for deduplication
  priority?: number;        // Higher = better (default 0). Used to pick best skill in category
}

/**
 * Pre-configured curated skill sources
 *
 * These are community-maintained skill repositories that are
 * automatically recommended when relevant technologies are detected.
 *
 * DEDUPLICATION: Only ONE skill per (category + tags) combination should be kept.
 * When multiple skills serve the same purpose, keep the most comprehensive/maintained one.
 */
export const CURATED_SOURCES: CuratedSource[] = [
  // Svelte 5 Skills - DEDUPLICATED: kept only the most comprehensive one
  // Removed: claude-svelte5-skill (splinesreticulating), svelte-5-runes (wiesson)
  {
    source: {
      name: 'svelte-claude-skills',
      url: 'https://github.com/spences10/svelte-claude-skills',
      path: '.claude/skills',
      type: 'git'
    },
    description: 'Svelte 5 runes and reactivity patterns',
    tags: ['svelte', 'svelte5', 'sveltekit', 'runes'],
    skills: ['svelte-runes'],
    category: 'framework',
    priority: 10  // Primary Svelte 5 skill
  },

  // AWS Skills
  {
    source: {
      name: 'aws-skills',
      url: 'https://github.com/zxkane/aws-skills',
      type: 'git'
    },
    description: 'AWS CDK, Lambda, ECS, SAM, and cost estimation skills',
    tags: ['aws', 'cdk', 'lambda', 'sam', 'ecs', 'infrastructure', 'iac'],
    skills: ['aws-cdk', 'aws-lambda', 'aws-sam', 'aws-ecs', 'aws-cost'],
    category: 'deployment',
    priority: 10
  },

  // Cloudflare Skills
  {
    source: {
      name: 'cloudflare-skills',
      url: 'https://github.com/jezweb/claude-skills',
      path: 'cloudflare',
      type: 'git'
    },
    description: '16 Cloudflare skills: Workers, D1, R2, KV, Pages, Queues',
    tags: ['cloudflare', 'workers', 'd1', 'r2', 'kv', 'pages', 'edge', 'serverless'],
    skills: [
      'cloudflare-workers',
      'cloudflare-d1',
      'cloudflare-r2',
      'cloudflare-kv',
      'cloudflare-pages',
      'cloudflare-queues'
    ],
    category: 'deployment',
    priority: 10
  },

  // Database Skills
  {
    source: {
      name: 'database-skills',
      url: 'https://github.com/jezweb/claude-skills',
      path: 'skills',
      type: 'git'
    },
    description: 'Neon Postgres, Drizzle ORM, and database integration skills',
    tags: ['neon', 'postgres', 'postgresql', 'drizzle', 'database', 'serverless'],
    skills: ['neon-vercel-postgres', 'drizzle-orm'],
    category: 'database',
    priority: 10
  }
];

/**
 * Find curated sources that match the given tags
 */
export function findMatchingCuratedSources(tags: string[]): CuratedSource[] {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));

  return CURATED_SOURCES.filter(source => {
    return source.tags.some(tag => tagSet.has(tag.toLowerCase()));
  });
}

/**
 * Get all curated source names
 */
export function getCuratedSourceNames(): string[] {
  return CURATED_SOURCES.map(s => s.source.name);
}

/**
 * Get a curated source by name
 */
export function getCuratedSource(name: string): CuratedSource | undefined {
  return CURATED_SOURCES.find(s => s.source.name === name);
}

/**
 * Check if a source name is a curated source
 */
export function isCuratedSource(name: string): boolean {
  return CURATED_SOURCES.some(s => s.source.name === name);
}
