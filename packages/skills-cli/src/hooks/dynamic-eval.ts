/**
 * Dynamic Skill Evaluation Hook
 *
 * Reads skills dynamically from the filesystem instead of using a hardcoded list.
 * Provides caching for performance and generates evaluation prompts.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * Configuration for dynamic skill loading
 */
export interface DynamicSkillConfig {
  /** Directory containing skill folders */
  skillsDir: string;

  /** Cache TTL in milliseconds (default: 60000 = 1 minute) */
  cacheTimeMs?: number;
}

/**
 * Skill information used for evaluation
 */
export interface SkillEvaluation {
  /** Skill name (from frontmatter) */
  name: string;

  /** Skill description (from frontmatter) */
  description: string;
}

/**
 * Internal cache entry structure
 */
interface CacheEntry {
  skills: SkillEvaluation[];
  timestamp: number;
  skillsDir: string;
}

/**
 * Default cache TTL (1 minute)
 */
const DEFAULT_CACHE_TIME_MS = 60000;

/**
 * Internal cache storage
 */
let skillsCache: CacheEntry | null = null;

/**
 * Parse YAML frontmatter from SKILL.md content
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed frontmatter object
 * @throws If frontmatter is invalid or missing required fields
 */
function parseFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter delimiters');
  }

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;

  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    throw new Error('Invalid SKILL.md: missing required "name" field');
  }

  if (!frontmatter.description || typeof frontmatter.description !== 'string') {
    throw new Error('Invalid SKILL.md: missing required "description" field');
  }

  return {
    name: frontmatter.name,
    description: frontmatter.description.trim(),
  };
}

/**
 * Load a single skill from a directory path
 *
 * @param skillPath - Path to the skill directory
 * @returns SkillEvaluation if valid, null if invalid
 */
async function loadSkillFromPath(skillPath: string): Promise<SkillEvaluation | null> {
  const skillMdPath = join(skillPath, 'SKILL.md');

  try {
    await stat(skillMdPath);
  } catch {
    return null; // No SKILL.md file
  }

  try {
    const content = await readFile(skillMdPath, 'utf-8');
    const { name, description } = parseFrontmatter(content);
    return { name, description };
  } catch {
    return null; // Invalid SKILL.md
  }
}

/**
 * Check if the cache is valid for the given config
 *
 * @param config - Dynamic skill config
 * @returns True if cache is valid and not expired
 */
function isCacheValid(config: DynamicSkillConfig): boolean {
  if (!skillsCache) {
    return false;
  }

  // Check if cache is for the same directory
  if (skillsCache.skillsDir !== config.skillsDir) {
    return false;
  }

  // Check if cache has expired
  const cacheTimeMs = config.cacheTimeMs ?? DEFAULT_CACHE_TIME_MS;
  const elapsed = Date.now() - skillsCache.timestamp;
  if (elapsed >= cacheTimeMs) {
    return false;
  }

  return true;
}

/**
 * Load skills from the specified directory for evaluation
 *
 * Reads `.claude/skills/SKILL.md` at runtime and extracts
 * name and description from frontmatter. Results are cached
 * for performance.
 *
 * @param config - Configuration specifying skills directory and cache options
 * @returns Array of skill evaluations
 */
export async function loadSkillsForEvaluation(
  config: DynamicSkillConfig
): Promise<SkillEvaluation[]> {
  // Check cache first
  if (isCacheValid(config)) {
    return skillsCache!.skills;
  }

  const skills: SkillEvaluation[] = [];

  try {
    const entries = await readdir(config.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(config.skillsDir, entry.name);
        const skill = await loadSkillFromPath(skillPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
    // Return empty array
  }

  // Update cache
  skillsCache = {
    skills,
    timestamp: Date.now(),
    skillsDir: config.skillsDir,
  };

  return skills;
}

/**
 * Generate an evaluation prompt from loaded skills
 *
 * Creates a formatted prompt that lists all available skills
 * with their descriptions for use in skill selection.
 *
 * @param skills - Array of skill evaluations
 * @returns Formatted prompt string, or empty string if no skills
 */
export function generateEvaluationPrompt(skills: SkillEvaluation[]): string {
  if (skills.length === 0) {
    return '';
  }

  const lines: string[] = [
    'Available skills:',
    '',
  ];

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const num = i + 1;
    lines.push(num + '. ' + skill.name + ': ' + skill.description);
  }

  return lines.join('\n');
}

/**
 * Get cached skills if available and not expired
 *
 * Returns the cached skill list without reloading from disk.
 * Useful for checking cache state without triggering a reload.
 *
 * @param config - Configuration specifying skills directory and cache options
 * @returns Cached skills or null if cache is empty/expired
 */
export function getCachedSkills(config: DynamicSkillConfig): SkillEvaluation[] | null {
  if (!isCacheValid(config)) {
    return null;
  }

  return skillsCache!.skills;
}

/**
 * Clear the skills cache
 *
 * Forces the next call to loadSkillsForEvaluation to
 * reload skills from disk.
 */
export function clearSkillsCache(): void {
  skillsCache = null;
}
