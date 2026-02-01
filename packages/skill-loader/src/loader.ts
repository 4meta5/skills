import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { Skill, LoadOptions } from './types.js';
import { parseFrontmatter } from './parser.js';

/**
 * Discover supporting files in a skill directory (excluding SKILL.md)
 *
 * @param skillPath - Path to the skill directory
 * @returns Array of relative paths to supporting files
 *
 * @example
 * ```typescript
 * const files = await discoverSupportingFiles('/path/to/my-skill');
 * // ['references/guide.md', 'templates/example.ts']
 * ```
 */
export async function discoverSupportingFiles(skillPath: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = fullPath.substring(skillPath.length + 1);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name !== 'SKILL.md') {
        files.push(relativePath);
      }
    }
  }

  try {
    await walk(skillPath);
  } catch {
    // Directory may not have supporting files
  }

  return files;
}

/**
 * Load a skill from a directory path
 *
 * @param skillPath - Path to the skill directory containing SKILL.md
 * @returns Loaded skill with metadata, content, and supporting files
 * @throws Error if SKILL.md is not found or has invalid format
 *
 * @example
 * ```typescript
 * const skill = await loadSkillFromPath('/path/to/my-skill');
 * console.log(skill.metadata.name);
 * console.log(skill.content);
 * console.log(skill.supportingFiles); // ['references/guide.md']
 * ```
 */
export async function loadSkillFromPath(skillPath: string): Promise<Skill> {
  const skillMdPath = join(skillPath, 'SKILL.md');

  try {
    await stat(skillMdPath);
  } catch {
    throw new Error(`SKILL.md not found at: ${skillMdPath}`);
  }

  const content = await readFile(skillMdPath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  const supportingFiles = await discoverSupportingFiles(skillPath);

  return {
    metadata: frontmatter,
    content: body,
    path: skillPath,
    supportingFiles: supportingFiles.length > 0 ? supportingFiles : undefined
  };
}

/**
 * Load all skills from a directory containing skill folders.
 * Recursively searches up to maxDepth levels for nested skill bundles.
 *
 * @param skillsDir - Directory containing skill folders
 * @param options - Loading options
 * @returns Array of loaded skills
 *
 * @example
 * ```typescript
 * // Load all skills from .claude/skills
 * const skills = await loadSkillsFromDirectory('.claude/skills');
 *
 * // Limit search depth
 * const skills = await loadSkillsFromDirectory('skills', { maxDepth: 2 });
 * ```
 */
export async function loadSkillsFromDirectory(
  skillsDir: string,
  options: LoadOptions = {}
): Promise<Skill[]> {
  const { maxDepth = 4 } = options;
  const skills: Skill[] = [];

  async function searchDirectory(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = join(dir, entry.name);

          // Try to load skill from this directory
          try {
            const skill = await loadSkillFromPath(dirPath);
            skills.push(skill);
          } catch {
            // Not a skill directory, continue
          }

          // Recursively search subdirectories for nested skills
          await searchDirectory(dirPath, depth + 1);
        }
      }
    } catch {
      // Directory may not exist or be unreadable
    }
  }

  await searchDirectory(skillsDir, 0);
  return skills;
}

/**
 * Check if a directory contains a valid skill
 *
 * @param dirPath - Path to check
 * @returns True if directory contains a valid SKILL.md
 */
export async function isSkillDirectory(dirPath: string): Promise<boolean> {
  try {
    await loadSkillFromPath(dirPath);
    return true;
  } catch {
    return false;
  }
}
