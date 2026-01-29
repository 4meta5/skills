import { cp, readdir, stat, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { createSkillsLibrary, loadSkillFromPath } from '@anthropic/skills-library';
import {
  getProjectsWithSkill,
  getAllTrackedProjects,
  getProjectInstallation,
  loadConfig,
  saveConfig
} from '../config.js';

interface SyncOptions {
  all?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

/**
 * Sync skills to all tracked projects that have them installed
 */
export async function syncCommand(names: string[], options: SyncOptions = {}): Promise<void> {
  const sourceDir = resolve(options.cwd || process.cwd());

  if (names.length === 0 && !options.all) {
    console.log('Usage: skills sync <skill-names...>');
    console.log('       skills sync --all');
    console.log('       skills sync <skill-names...> --dry-run');
    return;
  }

  // If --all flag, get all skills from all tracked projects
  let skillsToSync: string[];
  if (options.all) {
    const allProjects = await getAllTrackedProjects();
    const allSkills = new Set<string>();

    for (const projectPath of allProjects) {
      const installation = await getProjectInstallation(projectPath);
      if (installation) {
        installation.skills.forEach(skill => allSkills.add(skill));
      }
    }

    skillsToSync = Array.from(allSkills);
    if (skillsToSync.length === 0) {
      console.log('No skills tracked in any projects.');
      return;
    }
  } else {
    skillsToSync = names;
  }

  console.log(options.dryRun ? 'Dry run mode - no changes will be made\n' : '');

  let totalSynced = 0;

  for (const skillName of skillsToSync) {
    // Get the source skill content
    const sourceSkillPath = join(sourceDir, '.claude', 'skills', skillName);
    const sourceSkillMdPath = join(sourceSkillPath, 'SKILL.md');

    let sourceExists = false;
    try {
      await stat(sourceSkillMdPath);
      sourceExists = true;
    } catch {
      // Try loading from bundled skills
      const library = createSkillsLibrary({ cwd: sourceDir });
      try {
        const skill = await library.loadSkill(skillName);
        // Use the skill path as source if found
        if (skill.path) {
          sourceExists = true;
        }
      } catch {
        // Skill not found in bundled either
      }
    }

    if (!sourceExists) {
      console.error(`x ${skillName} - source not found at ${sourceSkillPath}`);
      continue;
    }

    // Get all projects that have this skill
    const projects = await getProjectsWithSkill(skillName);

    if (projects.length === 0) {
      console.log(`  ${skillName}: no projects to update`);
      continue;
    }

    console.log(`${skillName}:`);

    for (const projectPath of projects) {
      // Skip if this is the source project (avoid copying to itself)
      if (resolve(projectPath) === sourceDir) {
        continue;
      }

      const targetSkillPath = join(projectPath, '.claude', 'skills', skillName);

      // Check if target project still exists and has the skill directory
      try {
        await stat(targetSkillPath);
      } catch {
        console.log(`  - ${projectPath} (skipped - directory not found)`);
        continue;
      }

      if (options.dryRun) {
        console.log(`  ~ ${projectPath} (would update)`);
      } else {
        // Copy the entire skill directory
        await cp(sourceSkillPath, targetSkillPath, { recursive: true });

        // Update lastUpdated timestamp
        const config = await loadConfig();
        if (config.projectInstallations?.[projectPath]) {
          config.projectInstallations[projectPath].lastUpdated = new Date().toISOString();
          await saveConfig(config);
        }

        console.log(`  + ${projectPath}`);
        totalSynced++;
      }
    }
  }

  if (!options.dryRun && totalSynced > 0) {
    console.log(`\nSynced ${totalSynced} project(s)`);
  }
}
