import { createSkillsLibrary } from '@anthropic/skills-library';
import {
  getDefaults,
  setDefaults,
  addDefaults,
  removeDefaults,
  getConfigPath
} from '../config.js';
import { selectSkills } from '../interactive.js';

type DefaultsSubcommand = 'list' | 'add' | 'remove' | 'set' | 'clear';

export async function defaultsCommand(
  subcommand: DefaultsSubcommand = 'list',
  names: string[] = []
): Promise<void> {
  switch (subcommand) {
    case 'list':
      await listDefaults();
      break;
    case 'add':
      await addToDefaults(names);
      break;
    case 'remove':
      await removeFromDefaults(names);
      break;
    case 'set':
      await setDefaultSkills(names);
      break;
    case 'clear':
      await clearDefaults();
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log('Usage: skills defaults [list|add|remove|set|clear] [names...]');
      process.exit(1);
  }
}

async function listDefaults(): Promise<void> {
  const defaults = await getDefaults();

  if (defaults.length === 0) {
    console.log('No default skills configured.');
    console.log('\nUse "skills defaults set <names...>" to configure defaults.');
    console.log('Or use "skills defaults add" for interactive selection.');
    return;
  }

  console.log('\nDefault skills:');
  for (const name of defaults) {
    console.log(`  - ${name}`);
  }
  console.log(`\nConfig file: ${getConfigPath()}`);
}

async function addToDefaults(names: string[]): Promise<void> {
  let skillNames = names;

  if (skillNames.length === 0) {
    // Interactive mode
    const library = createSkillsLibrary();
    const allSkills = await library.listSkills();
    const currentDefaults = await getDefaults();
    skillNames = await selectSkills(allSkills, currentDefaults);

    if (skillNames.length === 0) {
      console.log('No skills selected.');
      return;
    }
  }

  await addDefaults(skillNames);
  console.log(`Added to defaults: ${skillNames.join(', ')}`);
}

async function removeFromDefaults(names: string[]): Promise<void> {
  if (names.length === 0) {
    // Interactive: show current defaults for removal
    const currentDefaults = await getDefaults();
    if (currentDefaults.length === 0) {
      console.log('No default skills to remove.');
      return;
    }

    const library = createSkillsLibrary();
    const skills = await library.listSkills();
    const defaultSkills = skills.filter(s => currentDefaults.includes(s.metadata.name));

    if (defaultSkills.length === 0) {
      // Skills not found, just list the names
      console.log('Current defaults:');
      for (const name of currentDefaults) {
        console.log(`  - ${name}`);
      }
      console.log('\nUse "skills defaults remove <names...>" to remove specific skills.');
      return;
    }

    const toRemove = await selectSkills(defaultSkills, currentDefaults);
    if (toRemove.length === 0) {
      console.log('No skills selected for removal.');
      return;
    }
    names = toRemove;
  }

  await removeDefaults(names);
  console.log(`Removed from defaults: ${names.join(', ')}`);
}

async function setDefaultSkills(names: string[]): Promise<void> {
  let skillNames = names;

  if (skillNames.length === 0) {
    // Interactive mode
    const library = createSkillsLibrary();
    const allSkills = await library.listSkills();
    skillNames = await selectSkills(allSkills);

    if (skillNames.length === 0) {
      console.log('No skills selected. Defaults unchanged.');
      return;
    }
  }

  await setDefaults(skillNames);
  console.log(`Default skills set to: ${skillNames.join(', ')}`);
}

async function clearDefaults(): Promise<void> {
  await setDefaults([]);
  console.log('Default skills cleared.');
}
