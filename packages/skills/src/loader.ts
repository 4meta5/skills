import { parse as parseYaml } from 'yaml';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import type { Skill, SkillMetadata, ParsedFrontmatter } from './types.js';

/**
 * Parse YAML frontmatter from SKILL.md content
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
 * Discover supporting files in a skill directory (excluding SKILL.md)
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
 */
export async function loadSkillsFromDirectory(
  skillsDir: string,
  maxDepth: number = 4
): Promise<Skill[]> {
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
