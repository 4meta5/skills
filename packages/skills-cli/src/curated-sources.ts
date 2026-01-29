import type { SkillSource } from './config.js';

/**
 * A curated skill source with metadata for matching
 */
export interface CuratedSource {
  source: SkillSource;
  description: string;
  tags: string[];      // Tags for matching detected technologies
  skills: string[];    // Known skill names in this source
}

/**
 * Pre-configured curated skill sources
 *
 * These are community-maintained skill repositories that are
 * automatically recommended when relevant technologies are detected.
 */
export const CURATED_SOURCES: CuratedSource[] = [
  // Svelte 5 Skills
  {
    source: {
      name: 'svelte-claude-skills',
      url: 'https://github.com/spences10/svelte-claude-skills',
      type: 'git'
    },
    description: 'Svelte 5 runes and reactivity patterns',
    tags: ['svelte', 'svelte5', 'sveltekit', 'runes'],
    skills: ['svelte5-runes']
  },
  {
    source: {
      name: 'claude-svelte5-skill',
      url: 'https://github.com/splinesreticulating/claude-svelte5-skill',
      type: 'git'
    },
    description: 'Comprehensive SvelteKit 2 + Svelte 5 skill',
    tags: ['svelte', 'svelte5', 'sveltekit', 'sveltekit2'],
    skills: ['svelte5']
  },
  {
    source: {
      name: 'svelte-5-runes',
      url: 'https://github.com/wiesson/svelte-5-runes',
      type: 'git'
    },
    description: 'Dedicated Svelte 5 runes skill',
    tags: ['svelte', 'svelte5', 'runes'],
    skills: ['svelte-5-runes']
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
    skills: ['aws-cdk', 'aws-lambda', 'aws-sam', 'aws-ecs', 'aws-cost']
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
    ]
  },

  // Database Skills
  {
    source: {
      name: 'database-skills',
      url: 'https://github.com/jezweb/claude-skills',
      path: 'database',
      type: 'git'
    },
    description: 'Neon Postgres, Drizzle ORM, and database integration skills',
    tags: ['neon', 'postgres', 'postgresql', 'drizzle', 'database', 'serverless'],
    skills: ['neon-postgres', 'drizzle-orm']
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
