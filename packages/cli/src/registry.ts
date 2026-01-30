import { loadSkillFromPath } from '@4meta5/skills';
import type { Skill } from '@4meta5/skills';
import {
  getSources,
  getSource,
  type SkillSource
} from './config.js';
import {
  cloneOrUpdateSource,
  discoverSkillsInSource,
  getSkillPathInSource,
  getSourceSkillsDir,
  parseGitUrl,
  extractSourceName
} from './git.js';

/**
 * A remote skill reference
 */
export interface RemoteSkill {
  name: string;
  source: SkillSource;
  fullName: string;  // source/skill format
}

/**
 * Skill with source information
 */
export interface SkillWithSource extends Skill {
  source: string;
  fullName: string;
}

/**
 * List all skills available from registered sources
 * @param refresh - If true, fetch latest from remote
 */
export async function listRemoteSkills(refresh = false): Promise<RemoteSkill[]> {
  const sources = await getSources();
  const skills: RemoteSkill[] = [];

  for (const source of sources) {
    try {
      if (refresh) {
        await cloneOrUpdateSource(source);
      }

      const skillNames = await discoverSkillsInSource(source);

      for (const name of skillNames) {
        skills.push({
          name,
          source,
          fullName: `${source.name}/${name}`
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not list skills from source "${source.name}": ${error}`);
    }
  }

  return skills;
}

/**
 * Load skill details from a remote source
 */
export async function loadRemoteSkill(
  sourceName: string,
  skillName: string,
  refresh = false
): Promise<SkillWithSource> {
  const source = await getSource(sourceName);
  if (!source) {
    throw new Error(`Source not found: ${sourceName}`);
  }

  if (refresh) {
    await cloneOrUpdateSource(source);
  }

  const skillPath = await getSkillPathInSource(source, skillName);
  const skill = await loadSkillFromPath(skillPath);

  return {
    ...skill,
    source: sourceName,
    fullName: `${sourceName}/${skillName}`
  };
}

/**
 * Parse a skill reference (either "name" or "source/name")
 */
export function parseSkillRef(ref: string): { source?: string; name: string } {
  const parts = ref.split('/');
  if (parts.length === 2) {
    return { source: parts[0], name: parts[1] };
  }
  return { name: ref };
}

/**
 * Resolve a skill reference to a source and skill
 * Searches bundled first, then project/user, then remote sources
 */
export async function resolveSkillRef(
  ref: string
): Promise<{ skill: Skill; source: string } | null> {
  const { source, name } = parseSkillRef(ref);

  // If source is specified, load from that source
  if (source) {
    try {
      const skill = await loadRemoteSkill(source, name);
      return { skill, source };
    } catch {
      return null;
    }
  }

  // Search in all sources
  const sources = await getSources();
  for (const src of sources) {
    try {
      const skill = await loadRemoteSkill(src.name, name);
      return { skill, source: src.name };
    } catch {
      // Not found in this source
    }
  }

  return null;
}

/**
 * Create a SkillSource from a git URL
 */
export function createSourceFromUrl(
  url: string,
  options: { name?: string; path?: string } = {}
): SkillSource {
  const parsed = parseGitUrl(url);

  return {
    name: options.name || extractSourceName(parsed.url),
    url: parsed.url,
    path: options.path || parsed.path,
    ref: parsed.ref,
    type: 'git'
  };
}

/**
 * Load full skill details from all remote sources
 */
export async function loadAllRemoteSkills(refresh = false): Promise<SkillWithSource[]> {
  const remoteRefs = await listRemoteSkills(refresh);
  const skills: SkillWithSource[] = [];

  for (const ref of remoteRefs) {
    try {
      const skill = await loadRemoteSkill(ref.source.name, ref.name);
      skills.push(skill);
    } catch (error) {
      // Skip skills that fail to load
      console.warn(`Warning: Could not load skill "${ref.fullName}": ${error}`);
    }
  }

  return skills;
}
