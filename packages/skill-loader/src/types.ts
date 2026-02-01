/**
 * Category classification for skills
 */
export type SkillCategory =
  | 'testing'
  | 'development'
  | 'documentation'
  | 'refactoring'
  | 'security'
  | 'performance';

/**
 * Metadata extracted from SKILL.md frontmatter
 */
export interface SkillMetadata {
  name: string;
  description: string;
  category?: SkillCategory;
  'disable-model-invocation'?: boolean;
  'user-invocable'?: boolean;
  'allowed-tools'?: string;
  context?: 'fork' | 'inline';
  agent?: string;
}

/**
 * A fully loaded skill with content and metadata
 */
export interface Skill {
  metadata: SkillMetadata;
  content: string;
  path: string;
  supportingFiles?: string[];
}

/**
 * Result of parsing frontmatter from SKILL.md
 */
export interface ParsedFrontmatter {
  frontmatter: SkillMetadata;
  body: string;
}

/**
 * Options for loading skills from a directory
 */
export interface LoadOptions {
  /**
   * Maximum depth to search for nested skills
   * @default 4
   */
  maxDepth?: number;
}
