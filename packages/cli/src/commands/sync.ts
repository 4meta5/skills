import { cp, mkdir, stat, readFile, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { createSkillsLibrary } from '@4meta5/skills';
import {
  getProjectsWithSkill,
  getAllTrackedProjects,
  getProjectInstallation,
  loadConfig,
  saveConfig,
  trackProjectInstallation
} from '../config.js';
import { isSlop } from './hygiene.js';

interface SyncOptions {
  all?: boolean;
  dryRun?: boolean;
  cwd?: string;
  push?: boolean;  // NEW: install to projects that don't have it
}

/**
 * Update CLAUDE.md in a project to include a skill reference
 */
async function updateClaudeMdWithSkill(projectPath: string, skillName: string): Promise<void> {
  const claudeMdPath = join(projectPath, 'CLAUDE.md');
  const skillRef = `- @.claude/skills/${skillName}/SKILL.md`;

  try {
    let content = await readFile(claudeMdPath, 'utf-8');

    // Skip if skill reference already exists
    if (content.includes(skillRef)) {
      return;
    }

    // Add skills section if not present
    if (!content.includes('## Installed Skills')) {
      content += '\n\n## Installed Skills\n';
    }

    // Add skill reference after the header
    content = content.replace(
      '## Installed Skills\n',
      `## Installed Skills\n${skillRef}\n`
    );

    await writeFile(claudeMdPath, content, 'utf-8');
  } catch {
    // CLAUDE.md doesn't exist, create it
    const content = `# Project\n\n## Installed Skills\n${skillRef}\n`;
    await writeFile(claudeMdPath, content, 'utf-8');
  }
}

/**
 * Sync skills to tracked projects.
 * Without --push: only updates projects that already have the skill installed.
 * With --push: installs the skill to all tracked projects (even those without it).
 */
export async function syncCommand(names: string[], options: SyncOptions = {}): Promise<void> {
  const sourceDir = resolve(options.cwd || process.cwd());

  if (names.length === 0 && !options.all) {
    console.log('Usage: skills sync <skill-names...>');
    console.log('       skills sync --all');
    console.log('       skills sync <skill-names...> --dry-run');
    console.log('       skills sync <skill-names...> --push');
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
  let slopSkipped = 0;

  for (const skillName of skillsToSync) {
    // Check if skill name matches slop patterns
    const slopType = isSlop(skillName);
    if (slopType) {
      console.log(`x ${skillName} - skipped (detected as slop: ${slopType})`);
      slopSkipped++;
      continue;
    }
    // Get the source skill content - prefer local .claude/skills/, fall back to bundled
    let sourceSkillPath = join(sourceDir, '.claude', 'skills', skillName);
    const localSkillMdPath = join(sourceSkillPath, 'SKILL.md');

    let sourceExists = false;
    try {
      await stat(localSkillMdPath);
      sourceExists = true;
    } catch {
      // Try loading from bundled skills
      const library = createSkillsLibrary({ cwd: sourceDir });
      try {
        const skill = await library.loadSkill(skillName);
        // Use the bundled skill path as source if found
        if (skill.path) {
          sourceSkillPath = skill.path;
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

    // Get projects to sync to:
    // - With --push: all tracked projects
    // - Without --push: only projects that already have this skill
    let projects: string[];
    if (options.push) {
      projects = await getAllTrackedProjects();
    } else {
      projects = await getProjectsWithSkill(skillName);
    }

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

      // Check if skill already exists in target project
      let skillExistsInTarget = false;
      try {
        await stat(targetSkillPath);
        skillExistsInTarget = true;
      } catch {
        skillExistsInTarget = false;
      }

      // Without --push, skip projects that don't have the skill directory
      if (!options.push && !skillExistsInTarget) {
        console.log(`  - ${projectPath} (skipped - directory not found)`);
        continue;
      }

      if (options.dryRun) {
        if (skillExistsInTarget) {
          console.log(`  ~ ${projectPath} (would update)`);
        } else {
          console.log(`  ~ ${projectPath} (would install)`);
        }
      } else {
        // Create directory if it doesn't exist (for --push)
        if (!skillExistsInTarget) {
          await mkdir(targetSkillPath, { recursive: true });
        }

        // Copy the entire skill directory
        await cp(sourceSkillPath, targetSkillPath, { recursive: true });

        // Track the skill installation if it's a new install
        if (!skillExistsInTarget) {
          await trackProjectInstallation(projectPath, skillName, 'skill');

          // Update CLAUDE.md in target project
          await updateClaudeMdWithSkill(projectPath, skillName);
        }

        // Update lastUpdated timestamp
        const config = await loadConfig();
        if (config.projectInstallations?.[projectPath]) {
          config.projectInstallations[projectPath].lastUpdated = new Date().toISOString();
          await saveConfig(config);
        }

        if (skillExistsInTarget) {
          console.log(`  + ${projectPath}`);
        } else {
          console.log(`  + ${projectPath} (installed)`);
        }
        totalSynced++;
      }
    }
  }

  if (!options.dryRun && totalSynced > 0) {
    console.log(`\nSynced ${totalSynced} project(s)`);
  }

  if (slopSkipped > 0) {
    console.log(`\nSkipped ${slopSkipped} slop skill(s). Run 'skills hygiene clean --confirm' to remove them.`);
  }
}
