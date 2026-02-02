import { createSkillsLibrary, loadSkillFromPath } from '@4meta5/skills';
import { updateClaudeMd } from '../claudemd.js';
import type { Skill } from '@4meta5/skills';
import { selectSkills } from '../interactive.js';
import { getDefaults, trackInstalledSkill, getSource, getSources, trackProjectInstallation } from '../config.js';
import {
  parseGitUrl,
  extractSourceName,
  cloneOrUpdateSource,
  copySkillFromSource,
  discoverSkillsInSource,
  getSkillPathInSource,
  getSourceCommit
} from '../git.js';
import { parseSkillRef, loadRemoteSkill, resolveSkillRef } from '../registry.js';
import { join } from 'path';
import { homedir } from 'os';
import { isSlop } from './hygiene.js';

interface AddOptions {
  defaults?: boolean;
  user?: boolean;
  git?: string;  // Git URL to install from
  ref?: string;  // Git ref (branch/tag/commit)
  cwd?: string;  // Target project directory (defaults to process.cwd())
}

export async function addCommand(names: string[], options: AddOptions = {}): Promise<void> {
  // Handle --git flag for direct URL installation
  if (options.git) {
    await installFromGitUrl(options.git, names, options);
    return;
  }

  const projectDir = options.cwd || process.cwd();
  // Use sourceDir (cwd) to FIND skills, projectDir to INSTALL them
  const sourceDir = process.cwd();
  const sourceLibrary = createSkillsLibrary({ cwd: sourceDir });
  const targetLibrary = createSkillsLibrary({ cwd: projectDir });
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
    // Interactive mode - list skills from SOURCE directory
    const allSkills = await sourceLibrary.listSkills();
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
  let slopSkipped = 0;
  const installedNames: string[] = [];

  for (const name of skillNames) {
    // Check if skill name matches slop patterns
    const { name: skillNameOnly } = parseSkillRef(name);
    const slopType = isSlop(skillNameOnly);
    if (slopType) {
      console.log(`x ${name} - skipped (detected as slop: ${slopType})`);
      slopSkipped++;
      continue;
    }
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
          : join(projectDir, '.claude', 'skills');

        await copySkillFromSource(source, skillName, targetDir);

        // Track installation
        const commit = await getSourceCommit(source);
        await trackInstalledSkill({
          name: skillName,
          source: sourceName,
          ref: commit,
          installedAt: new Date().toISOString()
        });

        // Track project installation (for project-level only)
        if (location === 'project') {
          await trackProjectInstallation(projectDir, skillName, 'skill');
        }
      } else {
        // Try bundled/local first - load from SOURCE, install to TARGET
        let foundInBundled = false;
        try {
          skill = await sourceLibrary.loadSkill(skillName);
          await targetLibrary.installSkill(skill, { location });
          foundInBundled = true;

          // Track as bundled
          await trackInstalledSkill({
            name: skillName,
            source: 'bundled',
            installedAt: new Date().toISOString()
          });

          // Track project installation (for project-level only)
          if (location === 'project') {
            await trackProjectInstallation(projectDir, skillName, 'skill');
          }
        } catch {
          // Not found in bundled, search registered sources
        }

        if (!foundInBundled) {
          const resolved = await resolveSkillRef(skillName);
          if (resolved) {
            // Found in a registered source
            const source = await getSource(resolved.source);
            if (source) {
              const targetDir = location === 'user'
                ? join(homedir(), '.claude', 'skills')
                : join(projectDir, '.claude', 'skills');

              await copySkillFromSource(source, skillName, targetDir);

              const commit = await getSourceCommit(source);
              await trackInstalledSkill({
                name: skillName,
                source: resolved.source,
                ref: commit,
                installedAt: new Date().toISOString()
              });

              // Track project installation (for project-level only)
              if (location === 'project') {
                await trackProjectInstallation(projectDir, skillName, 'skill');
              }

              console.log(`+ ${skillName} (from ${resolved.source})`);
              installed++;
              installedNames.push(skillName);
              continue;
            }
          }
          throw new Error('not found');
        }
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
      const result = await updateClaudeMd(projectDir, 'add', installedNames);
      if (result.success && result.added.length > 0) {
        console.log('Updated CLAUDE.md with skill references.');
      }
    }
  }

  if (slopSkipped > 0) {
    console.log(`\nSkipped ${slopSkipped} slop skill(s). Run 'skills hygiene clean --confirm' to remove them.`);
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
  const projectDir = options.cwd || process.cwd();
  const targetDir = options.user
    ? join(homedir(), '.claude', 'skills')
    : join(projectDir, '.claude', 'skills');

  const library = createSkillsLibrary({ cwd: projectDir });
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
      const projectDir = options.cwd || process.cwd();
      const result = await updateClaudeMd(projectDir, 'add', toInstall);
      if (result.success && result.added.length > 0) {
        console.log('Updated CLAUDE.md with skill references.');
      }
    }
  }
}
