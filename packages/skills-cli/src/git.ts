import { simpleGit, type SimpleGit } from 'simple-git';
import { mkdir, rm, stat, readdir, copyFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { getSourcesCacheDir, type SkillSource } from './config.js';

/**
 * Parsed git URL components
 */
export interface ParsedGitUrl {
  url: string;
  ref?: string;
  path?: string;
}

/**
 * Parse a git URL with optional ref and path
 * Formats:
 *   - https://github.com/user/repo
 *   - https://github.com/user/repo#branch
 *   - https://github.com/user/repo#branch:path/to/skill
 *   - git+https://github.com/user/repo#main:path/to/skill
 */
export function parseGitUrl(urlStr: string): ParsedGitUrl {
  // Remove git+ prefix if present
  let url = urlStr.replace(/^git\+/, '');

  let ref: string | undefined;
  let path: string | undefined;

  // Check for ref#path format
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const refAndPath = url.slice(hashIndex + 1);
    url = url.slice(0, hashIndex);

    const colonIndex = refAndPath.indexOf(':');
    if (colonIndex !== -1) {
      ref = refAndPath.slice(0, colonIndex);
      path = refAndPath.slice(colonIndex + 1);
    } else {
      ref = refAndPath;
    }
  }

  return { url, ref, path };
}

/**
 * Extract a source name from a git URL
 */
export function extractSourceName(url: string): string {
  // Remove protocol and git suffix
  const cleanUrl = url
    .replace(/^(https?:\/\/|git@)/, '')
    .replace(/\.git$/, '');

  // Get the last path component (repo name)
  const parts = cleanUrl.split(/[\/:]/).filter(Boolean);
  return parts[parts.length - 1] || 'unknown';
}

/**
 * Get the local cache path for a source
 */
export function getSourceCachePath(sourceName: string): string {
  return join(getSourcesCacheDir(), sourceName);
}

/**
 * Clone or update a git repository
 */
export async function cloneOrUpdateSource(source: SkillSource): Promise<string> {
  const cachePath = getSourceCachePath(source.name);
  const git = simpleGit();

  // Check if already cloned
  try {
    await stat(join(cachePath, '.git'));
    // Repository exists, update it
    const repoGit = simpleGit(cachePath);
    await repoGit.fetch(['--all']);
    const ref = source.ref || 'main';
    try {
      await repoGit.checkout(ref);
      await repoGit.pull('origin', ref);
    } catch {
      // If ref doesn't exist as branch, try as tag
      try {
        await repoGit.checkout(`tags/${ref}`);
      } catch {
        // Fall back to origin/ref
        await repoGit.checkout(`origin/${ref}`);
      }
    }
    return cachePath;
  } catch {
    // Need to clone
    await mkdir(dirname(cachePath), { recursive: true });

    // Remove existing directory if it exists but isn't a git repo
    try {
      await rm(cachePath, { recursive: true, force: true });
    } catch {
      // Directory doesn't exist, that's fine
    }

    await git.clone(source.url, cachePath);

    // Checkout specific ref if provided
    if (source.ref) {
      const repoGit = simpleGit(cachePath);
      try {
        await repoGit.checkout(source.ref);
      } catch {
        // Try as tag
        try {
          await repoGit.checkout(`tags/${source.ref}`);
        } catch {
          // Fall back to origin/ref
          await repoGit.checkout(`origin/${source.ref}`);
        }
      }
    }

    return cachePath;
  }
}

/**
 * Check if a source needs updating
 */
export async function checkForUpdates(source: SkillSource): Promise<{
  hasUpdates: boolean;
  currentRef?: string;
  latestRef?: string;
}> {
  const cachePath = getSourceCachePath(source.name);

  try {
    await stat(join(cachePath, '.git'));
  } catch {
    // Not cloned yet
    return { hasUpdates: true };
  }

  const git = simpleGit(cachePath);
  await git.fetch(['--all']);

  const ref = source.ref || 'main';
  const currentCommit = await git.revparse(['HEAD']);

  let latestCommit: string;
  try {
    latestCommit = await git.revparse([`origin/${ref}`]);
  } catch {
    // Try as tag
    try {
      latestCommit = await git.revparse([`tags/${ref}`]);
    } catch {
      latestCommit = currentCommit;
    }
  }

  return {
    hasUpdates: currentCommit !== latestCommit,
    currentRef: currentCommit.slice(0, 8),
    latestRef: latestCommit.slice(0, 8)
  };
}

/**
 * Get the skills directory within a source
 */
export function getSourceSkillsDir(source: SkillSource): string {
  const cachePath = getSourceCachePath(source.name);
  return source.path ? join(cachePath, source.path) : cachePath;
}

/**
 * Skill discovery result with path information
 */
export interface DiscoveredSkill {
  name: string;
  relativePath: string;  // Path relative to source skills dir
}

/**
 * Find all skills in a source directory
 * Handles multiple patterns:
 * 1. Root-level SKILL.md (e.g., SKILL.md at repo root)
 * 2. Direct subdirectories with SKILL.md (e.g., my-skill/SKILL.md)
 * 3. Nested structures (e.g., plugins/plugin-name/skills/skill-name/SKILL.md)
 */
export async function discoverSkillsInSource(source: SkillSource): Promise<string[]> {
  const discovered = await discoverSkillsWithPaths(source);
  return discovered.map(s => s.name);
}

/**
 * Find all skills with their relative paths
 */
export async function discoverSkillsWithPaths(source: SkillSource): Promise<DiscoveredSkill[]> {
  const skillsDir = getSourceSkillsDir(source);
  const skills: DiscoveredSkill[] = [];

  try {
    // Check for root-level SKILL.md first
    try {
      await stat(join(skillsDir, 'SKILL.md'));
      skills.push({ name: source.name, relativePath: '.' });
    } catch {
      // No root-level SKILL.md
    }

    // Recursively search for SKILL.md files (up to 4 levels deep)
    await searchForSkills(skillsDir, '', skills, 0, 4);
  } catch {
    // Directory doesn't exist or can't be read
  }

  return skills;
}

/**
 * Recursively search for SKILL.md files
 */
async function searchForSkills(
  baseDir: string,
  relativePath: string,
  skills: DiscoveredSkill[],
  depth: number,
  maxDepth: number
): Promise<void> {
  if (depth >= maxDepth) return;

  const currentDir = relativePath ? join(baseDir, relativePath) : baseDir;

  try {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;  // Skip hidden directories

      const entryRelPath = relativePath ? join(relativePath, entry.name) : entry.name;
      const entryFullPath = join(baseDir, entryRelPath);

      // Check if this directory has a SKILL.md
      try {
        await stat(join(entryFullPath, 'SKILL.md'));
        skills.push({ name: entry.name, relativePath: entryRelPath });
        // Don't recurse into skill directories
      } catch {
        // Not a skill directory, recurse into it
        await searchForSkills(baseDir, entryRelPath, skills, depth + 1, maxDepth);
      }
    }
  } catch {
    // Directory can't be read
  }
}

/**
 * Get the path to a specific skill in a source
 * Uses recursive discovery to find skills at any depth
 */
export async function getSkillPathInSource(source: SkillSource, skillName: string): Promise<string> {
  const skillsDir = getSourceSkillsDir(source);
  const discovered = await discoverSkillsWithPaths(source);

  const found = discovered.find(s => s.name === skillName);
  if (!found) {
    throw new Error(`Skill "${skillName}" not found in source "${source.name}"`);
  }

  if (found.relativePath === '.') {
    return skillsDir;
  }

  return join(skillsDir, found.relativePath);
}

/**
 * Copy a skill from source to target directory
 */
export async function copySkillFromSource(
  source: SkillSource,
  skillName: string,
  targetDir: string
): Promise<void> {
  const skillPath = await getSkillPathInSource(source, skillName);
  const targetPath = join(targetDir, skillName);

  await mkdir(targetPath, { recursive: true });

  // Recursively copy all files, excluding .git directory
  async function copyDir(src: string, dest: string): Promise<void> {
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      // Skip .git directory
      if (entry.name === '.git') continue;

      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await mkdir(destPath, { recursive: true });
        await copyDir(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  }

  await copyDir(skillPath, targetPath);
}

/**
 * Get current commit hash for a source
 */
export async function getSourceCommit(source: SkillSource): Promise<string | undefined> {
  const cachePath = getSourceCachePath(source.name);

  try {
    await stat(join(cachePath, '.git'));
    const git = simpleGit(cachePath);
    const hash = await git.revparse(['HEAD']);
    return hash.trim();
  } catch {
    return undefined;
  }
}
