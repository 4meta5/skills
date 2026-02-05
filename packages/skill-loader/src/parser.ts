import { parse as parseYaml } from 'yaml';
import type { SkillMetadata, ParsedFrontmatter, SkillCategory } from './types.js';

/**
 * Valid skill categories for validation
 */
const VALID_CATEGORIES: readonly SkillCategory[] = [
  'testing',
  'development',
  'documentation',
  'refactoring',
  'security',
  'performance',
];

/**
 * Type guard to check if a value is a valid SkillCategory
 */
function isValidCategory(value: unknown): value is SkillCategory {
  return typeof value === 'string' && VALID_CATEGORIES.includes(value as SkillCategory);
}

/**
 * Validate parsed YAML frontmatter and return typed SkillMetadata
 * @throws Error if validation fails
 */
function validateFrontmatter(parsed: unknown): SkillMetadata {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid SKILL.md: frontmatter must be an object');
  }

  const obj = parsed as Record<string, unknown>;

  // Validate required fields
  if (obj.name === undefined || obj.name === null) {
    throw new Error('Invalid SKILL.md: missing required "name" field');
  }
  if (typeof obj.name !== 'string') {
    throw new Error('Invalid SKILL.md: "name" field must be a string');
  }

  if (obj.description === undefined || obj.description === null) {
    throw new Error('Invalid SKILL.md: missing required "description" field');
  }
  if (typeof obj.description !== 'string') {
    throw new Error('Invalid SKILL.md: "description" field must be a string');
  }

  // Validate optional category if present
  if (obj.category !== undefined && !isValidCategory(obj.category)) {
    throw new Error(
      `Invalid SKILL.md: invalid category "${obj.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`
    );
  }

  // Build validated metadata object
  const metadata: SkillMetadata = {
    name: obj.name,
    description: obj.description,
  };

  // Add optional fields if they exist and are valid
  if (obj.category !== undefined) {
    metadata.category = obj.category as SkillCategory;
  }
  if (typeof obj['disable-model-invocation'] === 'boolean') {
    metadata['disable-model-invocation'] = obj['disable-model-invocation'];
  }
  if (typeof obj['user-invocable'] === 'boolean') {
    metadata['user-invocable'] = obj['user-invocable'];
  }
  if (typeof obj['allowed-tools'] === 'string') {
    metadata['allowed-tools'] = obj['allowed-tools'];
  }
  if (obj.context === 'fork' || obj.context === 'inline') {
    metadata.context = obj.context;
  }
  if (typeof obj.agent === 'string') {
    metadata.agent = obj.agent;
  }

  return metadata;
}

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

  const parsed = parseYaml(match[1]);
  const frontmatter = validateFrontmatter(parsed);

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
