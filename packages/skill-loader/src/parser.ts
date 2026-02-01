import { parse as parseYaml } from 'yaml';
import type { SkillMetadata, ParsedFrontmatter } from './types.js';

/**
 * Parse YAML frontmatter from SKILL.md content
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed frontmatter metadata and body content
 * @throws Error if frontmatter format is invalid or required fields are missing
 *
 * @example
 * ```typescript
 * const result = parseFrontmatter(`---
 * name: my-skill
 * description: A helpful skill
 * ---
 *
 * # My Skill
 *
 * Instructions here.
 * `);
 *
 * console.log(result.frontmatter.name); // 'my-skill'
 * console.log(result.body); // '# My Skill\n\nInstructions here.'
 * ```
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter delimiters');
  }

  const frontmatter = parseYaml(match[1]) as SkillMetadata;

  if (!frontmatter.name) {
    throw new Error('Invalid SKILL.md: missing required "name" field');
  }

  if (!frontmatter.description) {
    throw new Error('Invalid SKILL.md: missing required "description" field');
  }

  return {
    frontmatter,
    body: match[2].trim()
  };
}

/**
 * Format a skill back to SKILL.md content
 *
 * @param metadata - Skill metadata for frontmatter
 * @param body - Body content of the skill
 * @returns Formatted SKILL.md content string
 *
 * @example
 * ```typescript
 * const content = formatSkillMd(
 *   { name: 'my-skill', description: 'A skill' },
 *   '# Instructions'
 * );
 * ```
 */
export function formatSkillMd(
  metadata: SkillMetadata,
  body: string
): string {
  const frontmatterLines = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }

  frontmatterLines.push('---');

  return `${frontmatterLines.join('\n')}\n\n${body}`;
}
