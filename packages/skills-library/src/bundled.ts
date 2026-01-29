import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseFrontmatter } from './loader.js';
import type { Skill } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to bundled skills directory
 * From dist/src/bundled.js -> ../../skills
 */
function getSkillsDir(): string {
  return join(__dirname, '..', '..', 'skills');
}

/**
 * Load a bundled skill by name
 */
function loadBundledSkill(name: string): Skill {
  const skillPath = join(getSkillsDir(), name);
  const content = readFileSync(join(skillPath, 'SKILL.md'), 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    metadata: frontmatter,
    content: body,
    path: skillPath
  };
}

// Testing skills
export const testFirstBugfix = loadBundledSkill('test-first-bugfix');
export const unitTestWorkflow = loadBundledSkill('unit-test-workflow');
export const suggestTests = loadBundledSkill('suggest-tests');

// Development skills
export const codeReview = loadBundledSkill('code-review');
export const codeReviewTs = loadBundledSkill('code-review-ts');
export const codeReviewJs = loadBundledSkill('code-review-js');
export const codeReviewRust = loadBundledSkill('code-review-rust');
export const prDescription = loadBundledSkill('pr-description');

// Refactoring skills
export const refactorSuggestions = loadBundledSkill('refactor-suggestions');

// Security skills
export const securityAnalysis = loadBundledSkill('security-analysis');

// Documentation skills
export const describeCodebase = loadBundledSkill('describe-codebase');

/**
 * Registry of all bundled skills
 */
export const bundledSkills: Record<string, Skill> = {
  // Testing
  'test-first-bugfix': testFirstBugfix,
  'unit-test-workflow': unitTestWorkflow,
  'suggest-tests': suggestTests,

  // Development
  'code-review': codeReview,
  'code-review-ts': codeReviewTs,
  'code-review-js': codeReviewJs,
  'code-review-rust': codeReviewRust,
  'pr-description': prDescription,

  // Refactoring
  'refactor-suggestions': refactorSuggestions,

  // Security
  'security-analysis': securityAnalysis,

  // Documentation
  'describe-codebase': describeCodebase
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
