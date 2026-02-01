/**
 * @4meta5/skill-loader
 *
 * Parse and load SKILL.md files for Claude Code skills.
 *
 * @example
 * ```typescript
 * import { loadSkillFromPath, parseFrontmatter } from '@4meta5/skill-loader';
 *
 * // Load a skill from a directory
 * const skill = await loadSkillFromPath('.claude/skills/tdd');
 * console.log(skill.metadata.name); // 'tdd'
 * console.log(skill.content); // Skill instructions
 *
 * // Parse SKILL.md content directly
 * const parsed = parseFrontmatter(content);
 * console.log(parsed.frontmatter.description);
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  Skill,
  SkillMetadata,
  SkillCategory,
  ParsedFrontmatter,
  LoadOptions
} from './types.js';

// Parser
export { parseFrontmatter, formatSkillMd } from './parser.js';

// Loader
export {
  loadSkillFromPath,
  loadSkillsFromDirectory,
  discoverSupportingFiles,
  isSkillDirectory
} from './loader.js';
