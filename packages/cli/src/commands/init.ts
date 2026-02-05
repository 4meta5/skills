import { createSkillsLibrary } from '@4meta5/skills';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import { selectSkills, confirmAction } from '../interactive.js';
import { getDefaults } from '../config.js';
import { updateClaudeMd } from '../claudemd.js';
import { assertTestSafeProjectPath } from '../test/guard.js';

interface InitOptions {
  defaults?: boolean;
  skills?: string[];
}

export async function initCommand(path: string = '.', options: InitOptions = {}): Promise<void> {
  const targetPath = resolve(path);

  // Check if path already exists
  try {
    const stats = await stat(targetPath);
    if (stats.isDirectory()) {
      // Check if .claude directory already exists
      try {
        await stat(join(targetPath, '.claude'));
        console.log(`Warning: ${targetPath}/.claude already exists.`);
        const proceed = await confirmAction('Continue and add skills?');
        if (!proceed) {
          console.log('Aborted.');
          return;
        }
      } catch {
        // .claude doesn't exist, that's fine
      }
    }
  } catch {
    // Path doesn't exist, will be created
  }

  const library = createSkillsLibrary({ cwd: targetPath });
  let skillNames: string[];

  if (options.defaults) {
    skillNames = await getDefaults();
    if (skillNames.length === 0) {
      console.log('No default skills configured. Use "skills defaults set" to configure.');
      console.log('Initializing project without skills...');
      skillNames = [];
    }
  } else if (options.skills && options.skills.length > 0) {
    skillNames = options.skills;
  } else {
    // Interactive mode
    const allSkills = await library.listSkills();
    if (allSkills.length > 0) {
      console.log('Select skills to include in the project:\n');
      skillNames = await selectSkills(allSkills);
    } else {
      console.log('No bundled skills available.');
      skillNames = [];
    }
  }

  // Install selected skills
  if (skillNames.length > 0) {
    assertTestSafeProjectPath(targetPath, 'write project');
    console.log(`\nInitializing project at ${targetPath}...`);

    for (const name of skillNames) {
      try {
        const skill = await library.loadSkill(name);
        await library.installSkill(skill, { location: 'project', cwd: targetPath });
        console.log(`+ ${name}`);
      } catch (error) {
        console.error(`x ${name} - not found`);
      }
    }

    // Update CLAUDE.md with skill references
    await updateClaudeMd(targetPath, 'add', skillNames);
  }

  console.log(`\nProject initialized at ${targetPath}`);

  if (skillNames.length > 0) {
    console.log(`\nInstalled skills:`);
    for (const name of skillNames) {
      console.log(`  - ${name}`);
    }
  }

  console.log('\nNext steps:');
  console.log('  1. Review CLAUDE.md for skill references');
  console.log('  2. Use "skills add" to add more skills');
  console.log('  3. Use "skills list" to see available skills');
}
