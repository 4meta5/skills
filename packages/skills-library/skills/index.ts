import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from '../src/loader.js';
import type { Skill } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load and export the test-first-bugfix skill
 */
function loadBundledSkill(name: string): Skill {
  const skillPath = join(__dirname, name);
  const content = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    metadata: frontmatter,
    content: body,
    path: skillPath
  };
}

export const testFirstBugfix = loadBundledSkill('test-first-bugfix');

/**
 * Registry of all bundled skills
 */
export const bundledSkills: Record<string, Skill> = {
  'test-first-bugfix': testFirstBugfix
};

/**
 * Get a bundled skill by name
 */
export function getBundledSkill(name: string): Skill | undefined {
  return bundledSkills[name];
}

/**
 * List all bundled skill names
 */
export function listBundledSkillNames(): string[] {
  return Object.keys(bundledSkills);
}
