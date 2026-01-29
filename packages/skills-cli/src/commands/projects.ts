import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import {
  getAllTrackedProjects,
  getProjectsWithSkill,
  getProjectInstallation,
  trackProjectInstallation,
  loadConfig,
  saveConfig
} from '../config.js';

interface ProjectsOptions {
  skill?: string;
  json?: boolean;
  cwd?: string;
}

/**
 * Get all projects that have a specific skill installed (exported for testing)
 */
export async function getProjectsForSkill(skillName: string): Promise<string[]> {
  return getProjectsWithSkill(skillName);
}

/**
 * Projects command handler
 */
export async function projectsCommand(
  subcommand: 'list' | 'add' | 'remove' = 'list',
  args: string[] = [],
  options: ProjectsOptions = {}
): Promise<void> {
  switch (subcommand) {
    case 'list':
      await listProjects(options);
      break;
    case 'add':
      await addProject(args, options);
      break;
    case 'remove':
      await removeProject(args, options);
      break;
    default:
      console.log('Usage: skills projects [list|add|remove]');
      console.log('       skills projects --skill <name>');
      console.log('       skills projects add .');
      console.log('       skills projects remove <path>');
  }
}

/**
 * List all tracked projects
 */
async function listProjects(options: ProjectsOptions): Promise<void> {
  let projects: string[];

  if (options.skill) {
    projects = await getProjectsWithSkill(options.skill);
    console.log(`Projects with "${options.skill}" installed:`);
  } else {
    projects = await getAllTrackedProjects();
    console.log('All tracked projects:');
  }

  if (projects.length === 0) {
    console.log('  (none)');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(projects, null, 2));
    return;
  }

  for (const projectPath of projects) {
    const installation = await getProjectInstallation(projectPath);
    const skillCount = installation?.skills.length || 0;
    const hookCount = installation?.hooks.length || 0;

    console.log(`  ${projectPath}`);
    console.log(`    Skills: ${skillCount}, Hooks: ${hookCount}`);
    if (installation?.skills.length) {
      console.log(`    ${installation.skills.join(', ')}`);
    }
  }
}

/**
 * Add a project to tracking by scanning its skills directory
 */
async function addProject(args: string[], options: ProjectsOptions): Promise<void> {
  const pathArg = args[0] || '.';
  const projectDir = pathArg === '.'
    ? (options.cwd || process.cwd())
    : resolve(options.cwd || process.cwd(), pathArg);

  const skillsDir = join(projectDir, '.claude', 'skills');

  try {
    const skillDirs = await readdir(skillsDir);

    let tracked = 0;
    for (const skillName of skillDirs) {
      const skillPath = join(skillsDir, skillName);
      const skillStat = await stat(skillPath);

      if (skillStat.isDirectory()) {
        // Check if it has a SKILL.md file
        try {
          await stat(join(skillPath, 'SKILL.md'));
          await trackProjectInstallation(projectDir, skillName, 'skill');
          tracked++;
          console.log(`+ ${skillName}`);
        } catch {
          // No SKILL.md, skip
        }
      }
    }

    // Also check for hooks
    const hooksDir = join(projectDir, '.claude', 'hooks');
    try {
      const hookFiles = await readdir(hooksDir);
      for (const hookFile of hookFiles) {
        if (hookFile.endsWith('.sh')) {
          const hookName = hookFile.replace('.sh', '');
          await trackProjectInstallation(projectDir, hookName, 'hook');
          tracked++;
          console.log(`+ ${hookName} (hook)`);
        }
      }
    } catch {
      // No hooks directory
    }

    if (tracked > 0) {
      console.log(`\nTracked ${tracked} item(s) in ${projectDir}`);
    } else {
      console.log('No skills or hooks found to track.');
    }
  } catch {
    console.error(`No .claude/skills directory found in ${projectDir}`);
  }
}

/**
 * Remove a project from tracking
 */
async function removeProject(args: string[], options: ProjectsOptions): Promise<void> {
  if (args.length === 0) {
    console.log('Usage: skills projects remove <project-path>');
    return;
  }

  const projectPath = resolve(args[0]);
  const config = await loadConfig();

  if (config.projectInstallations?.[projectPath]) {
    delete config.projectInstallations[projectPath];
    await saveConfig(config);
    console.log(`Removed ${projectPath} from tracking`);
  } else {
    console.log(`${projectPath} is not tracked`);
  }
}
