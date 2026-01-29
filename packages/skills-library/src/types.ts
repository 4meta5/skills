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
 * File structure entry for project templates
 */
export interface FileStructure {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

/**
 * Template for creating new projects with skills
 */
export interface ProjectTemplate {
  name: string;
  description: string;
  skills: string[];
  claudemd: string;
  structure: FileStructure[];
}

/**
 * Options for skill installation
 */
export interface InstallOptions {
  location: 'project' | 'user';
  cwd?: string;
}

/**
 * Options for creating a skills library instance
 */
export interface SkillsLibraryOptions {
  cwd?: string;
  skillsDir?: string;
}

/**
 * Result of parsing frontmatter from SKILL.md
 */
export interface ParsedFrontmatter {
  frontmatter: SkillMetadata;
  body: string;
}

/**
 * Main skills library interface
 */
export interface SkillsLibrary {
  loadSkill(name: string): Promise<Skill>;
  listSkills(category?: SkillCategory): Promise<Skill[]>;
  installSkill(skill: Skill, options: InstallOptions): Promise<void>;
  createProject(template: ProjectTemplate, targetPath: string): Promise<void>;
  extendProject(skills: string[]): Promise<void>;
}
