import { createSkillsLibrary, loadSkillFromPath } from '@anthropic/skills-library';
import type { Skill } from '@anthropic/skills-library';
import { selectSkills } from '../interactive.js';
import { getDefaults, trackInstalledSkill, getSource } from '../config.js';
import {
  parseGitUrl,
  extractSourceName,
  cloneOrUpdateSource,
  copySkillFromSource,
  discoverSkillsInSource,
  getSkillPathInSource,
  getSourceCommit
} from '../git.js';
import { parseSkillRef, loadRemoteSkill } from '../registry.js';
import { join } from 'path';
import { homedir } from 'os';

interface AddOptions {
  defaults?: boolean;
  user?: boolean;
  git?: string;  // Git URL to install from
  ref?: string;  // Git ref (branch/tag/commit)
}

export async function addCommand(names: string[], options: AddOptions = {}): Promise<void> {
  // Handle --git flag for direct URL installation
  if (options.git) {
    await installFromGitUrl(options.git, names, options);
    return;
  }

  const library = createSkillsLibrary();
  const location = options.user ? 'user' : 'project';

  let skillNames: string[];

  if (options.defaults) {
    // Use default skills
    skillNames = await getDefaults();
    if (skillNames.length === 0) {
      console.log('No default skills configured.');
      console.log('Use "skills defaults set <names...>" to configure defaults.');
      return;
    }
    console.log(`Using default skills: ${skillNames.join(', ')}`);
  } else if (names.length === 0) {
    // Interactive mode
    const allSkills = await library.listSkills();
    if (allSkills.length === 0) {
      console.log('No skills available to add.');
      return;
    }
    skillNames = await selectSkills(allSkills);
    if (skillNames.length === 0) {
      console.log('No skills selected.');
      return;
    }
  } else {
    // Named skills - check for source/name format
    skillNames = names;
  }

  // Install each skill
  let installed = 0;
  const installedNames: string[] = [];

  for (const name of skillNames) {
    const { source: sourceName, name: skillName } = parseSkillRef(name);

    try {
      let skill: Skill;
      let sourceTrack = 'bundled';

      if (sourceName) {
        // Load from remote source
        const source = await getSource(sourceName);
        if (!source) {
          console.error(`x ${name} - source "${sourceName}" not found`);
          continue;
        }

        // Ensure source is synced
        await cloneOrUpdateSource(source);

        // Load and install the skill
        skill = await loadRemoteSkill(sourceName, skillName);
        sourceTrack = sourceName;

        // Copy skill to target directory
        const targetDir = location === 'user'
          ? join(homedir(), '.claude', 'skills')
          : join(process.cwd(), '.claude', 'skills');

        await copySkillFromSource(source, skillName, targetDir);

        // Track installation
        const commit = await getSourceCommit(source);
        await trackInstalledSkill({
          name: skillName,
          source: sourceName,
          ref: commit,
          installedAt: new Date().toISOString()
        });
      } else {
        // Try bundled/local first
        skill = await library.loadSkill(skillName);
        await library.installSkill(skill, { location });

        // Track as bundled
        await trackInstalledSkill({
          name: skillName,
          source: 'bundled',
          installedAt: new Date().toISOString()
        });
      }

      console.log(`+ ${skillName}${sourceName ? ` (from ${sourceName})` : ''}`);
      installed++;
      installedNames.push(skillName);
    } catch (error) {
      console.error(`x ${name} - not found`);
    }
  }

  if (installed > 0) {
    const locationDesc = location === 'user' ? '~/.claude/skills' : '.claude/skills';
    console.log(`\nInstalled ${installed} skill(s) to ${locationDesc}`);

    // Update CLAUDE.md if installing to project
    if (location === 'project') {
      try {
        await library.extendProject(installedNames);
        console.log('Updated CLAUDE.md with skill references.');
      } catch (error) {
        // extendProject may fail if we couldn't install all skills
      }
    }
  }
}

/**
 * Install skills directly from a git URL
 */
async function installFromGitUrl(
  url: string,
  skillNames: string[],
  options: AddOptions
): Promise<void> {
  const parsed = parseGitUrl(url);
  const sourceName = extractSourceName(parsed.url);

  // Create a temporary source
  const source = {
    name: `_temp_${sourceName}`,
    url: parsed.url,
    path: parsed.path,
    ref: options.ref || parsed.ref,
    type: 'git' as const
  };

  console.log(`Fetching from ${parsed.url}...`);
  await cloneOrUpdateSource(source);

  // Discover available skills
  const availableSkills = await discoverSkillsInSource(source);

  if (availableSkills.length === 0) {
    console.error('No skills found in repository.');
    return;
  }

  // Determine which skills to install
  let toInstall: string[];

  if (skillNames.length > 0) {
    // Specific skills requested
    toInstall = skillNames.filter(name => {
      if (!availableSkills.includes(name)) {
        console.error(`x ${name} - not found in repository`);
        return false;
      }
      return true;
    });
  } else if (availableSkills.length === 1) {
    // Only one skill, install it
    toInstall = availableSkills;
  } else {
    // Multiple skills available
    console.log(`\nAvailable skills in repository:`);
    for (const skill of availableSkills) {
      console.log(`  - ${skill}`);
    }
    console.log(`\nSpecify skill names to install:`);
    console.log(`  skills add --git ${url} ${availableSkills[0]}`);
    return;
  }

  // Install the skills
  const targetDir = options.user
    ? join(homedir(), '.claude', 'skills')
    : join(process.cwd(), '.claude', 'skills');

  const library = createSkillsLibrary();
  let installed = 0;

  for (const skillName of toInstall) {
    try {
      await copySkillFromSource(source, skillName, targetDir);

      // Track installation with git URL
      await trackInstalledSkill({
        name: skillName,
        source: url,
        ref: await getSourceCommit(source),
        installedAt: new Date().toISOString()
      });

      console.log(`+ ${skillName}`);
      installed++;
    } catch (error) {
      console.error(`x ${skillName}: ${error}`);
    }
  }

  if (installed > 0) {
    const locationDesc = options.user ? '~/.claude/skills' : '.claude/skills';
    console.log(`\nInstalled ${installed} skill(s) to ${locationDesc}`);

    // Update CLAUDE.md if installing to project
    if (!options.user) {
      try {
        await library.extendProject(toInstall);
        console.log('Updated CLAUDE.md with skill references.');
      } catch (error) {
        // extendProject may fail
      }
    }
  }
}
