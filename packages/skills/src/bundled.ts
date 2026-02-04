import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './loader.js';
import type { Skill } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Path Resolution (Internal, Cached) ---

let _skillsDir: string | null = null;

/**
 * Resolve the bundled skills directory path.
 * Probes candidate paths to support src/, dist/src/, and published package.
 */
function getSkillsDir(): string {
  if (_skillsDir !== null) {
    return _skillsDir;
  }

  const candidates = [
    // From dist/src -> go up 4 levels to repo root, then skills/
    join(__dirname, '..', '..', '..', '..', 'skills'),
    // From src -> go up 3 levels to repo root, then skills/
    join(__dirname, '..', '..', '..', 'skills'),
    // Published package: skills at package root
    join(__dirname, '..', '..', 'skills'),
  ];

  for (const candidate of candidates) {
    const probe = join(candidate, 'tdd', 'SKILL.md');
    if (existsSync(probe)) {
      _skillsDir = candidate;
      return _skillsDir;
    }
  }

  // Fallback to package skills
  _skillsDir = join(__dirname, '..', '..', 'skills');
  return _skillsDir;
}

// --- Lazy Loading Infrastructure ---

const cache = new Map<string, Skill>();

/**
 * Load a skill from disk. Returns undefined if file missing. Throws on parse errors.
 */
function loadSkill(name: string): Skill | undefined {
  const skillPath = join(getSkillsDir(), name);
  const skillFile = join(skillPath, 'SKILL.md');

  if (!existsSync(skillFile)) {
    return undefined;
  }

  const content = readFileSync(skillFile, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    metadata: frontmatter,
    content: body,
    path: skillPath
  };
}

/**
 * Registry of bundled skill names (for lazy loading)
 */
const BUNDLED_SKILLS = [
  'tdd',
  'unit-test-workflow',
  'suggest-tests',
  'no-workarounds',
  'code-review',
  'code-review-ts',
  'code-review-js',
  'code-review-rust',
  'pr-description',
  'refactor-suggestions',
  'security-analysis',
  'describe-codebase',
] as const;

const bundledSet = new Set<string>(BUNDLED_SKILLS);

// --- Public API ---

/**
 * Get a bundled skill by name. Lazy loads and caches.
 * Returns undefined if skill not found or file missing.
 */
export function getBundledSkill(name: string): Skill | undefined {
  if (!bundledSet.has(name)) {
    return undefined;
  }

  if (cache.has(name)) {
    return cache.get(name);
  }

  const skill = loadSkill(name);
  if (skill) {
    cache.set(name, skill);
  }
  return skill;
}

/**
 * List all bundled skill names (without loading).
 */
export function listBundledSkillNames(): string[] {
  return [...BUNDLED_SKILLS];
}
