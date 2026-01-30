import { createSkillsLibrary } from '@4meta5/skills';
import {
  getSources,
  getSource,
  getInstalledSkills,
  trackInstalledSkill,
  type SkillSource
} from '../config.js';
import {
  cloneOrUpdateSource,
  checkForUpdates,
  copySkillFromSource,
  getSourceCommit
} from '../git.js';
import { parseSkillRef } from '../registry.js';
import { join } from 'path';
import { homedir } from 'os';

interface UpdateOptions {
  check?: boolean;  // Only check for updates, don't apply
  all?: boolean;    // Update all installed skills from sources
}

export async function updateCommand(
  names: string[] = [],
  options: UpdateOptions = {}
): Promise<void> {
  if (options.check) {
    await checkUpdatesCommand(names);
    return;
  }

  if (names.length === 0 && !options.all) {
    // Update all sources
    await updateAllSources();
    return;
  }

  if (options.all) {
    // Update all installed skills from their sources
    await updateInstalledSkills();
    return;
  }

  // Update specific skills
  await updateSpecificSkills(names);
}

async function checkUpdatesCommand(names: string[]): Promise<void> {
  const sources = await getSources();

  if (sources.length === 0) {
    console.log('No sources configured.');
    return;
  }

  console.log('Checking for updates...\n');

  let hasUpdates = false;

  for (const source of sources) {
    const updateInfo = await checkForUpdates(source);

    if (updateInfo.hasUpdates) {
      hasUpdates = true;
      console.log(`${source.name}:`);
      if (updateInfo.currentRef && updateInfo.latestRef) {
        console.log(`  ${updateInfo.currentRef} -> ${updateInfo.latestRef}`);
      } else {
        console.log(`  Updates available`);
      }
    }
  }

  if (!hasUpdates) {
    console.log('All sources are up to date.');
  } else {
    console.log('\nRun "skills update" to apply updates.');
  }
}

async function updateAllSources(): Promise<void> {
  const sources = await getSources();

  if (sources.length === 0) {
    console.log('No sources configured.');
    console.log('Use "skills source add <url>" to add a source.');
    return;
  }

  console.log(`Updating ${sources.length} source(s)...\n`);

  let updated = 0;
  let errors = 0;

  for (const source of sources) {
    try {
      const updateInfo = await checkForUpdates(source);

      if (updateInfo.hasUpdates) {
        console.log(`Updating ${source.name}...`);
        await cloneOrUpdateSource(source);
        console.log(`  ${updateInfo.currentRef || 'initial'} -> ${updateInfo.latestRef || 'latest'}`);
        updated++;
      } else {
        console.log(`${source.name}: up to date`);
      }
    } catch (error) {
      console.error(`${source.name}: error - ${error}`);
      errors++;
    }
  }

  console.log(`\n${updated} updated, ${sources.length - updated - errors} unchanged, ${errors} errors`);
}

async function updateInstalledSkills(): Promise<void> {
  const installed = await getInstalledSkills();
  const fromSources = installed.filter(s => s.source !== 'bundled' && s.source !== 'local');

  if (fromSources.length === 0) {
    console.log('No skills installed from remote sources.');
    return;
  }

  console.log(`Updating ${fromSources.length} installed skill(s)...\n`);

  const library = createSkillsLibrary();

  for (const skillRef of fromSources) {
    try {
      const source = await getSource(skillRef.source);
      if (!source) {
        console.log(`${skillRef.name}: source "${skillRef.source}" not found, skipping`);
        continue;
      }

      // Update the source first
      await cloneOrUpdateSource(source);

      // Re-install the skill
      const projectSkillsDir = join(process.cwd(), '.claude', 'skills');
      await copySkillFromSource(source, skillRef.name, projectSkillsDir);

      // Update tracking with new commit
      const commit = await getSourceCommit(source);
      await trackInstalledSkill({
        ...skillRef,
        ref: commit,
        installedAt: new Date().toISOString()
      });

      console.log(`+ ${skillRef.name} (from ${skillRef.source})`);
    } catch (error) {
      console.error(`x ${skillRef.name}: ${error}`);
    }
  }
}

async function updateSpecificSkills(names: string[]): Promise<void> {
  const library = createSkillsLibrary();

  for (const name of names) {
    const { source: sourceName, name: skillName } = parseSkillRef(name);

    if (!sourceName) {
      // Try to find in installed skills
      const installed = await getInstalledSkills();
      const installedSkill = installed.find(s => s.name === skillName);

      if (installedSkill && installedSkill.source !== 'bundled' && installedSkill.source !== 'local') {
        // Update from tracked source
        const source = await getSource(installedSkill.source);
        if (source) {
          await updateSkillFromSource(source, skillName);
        } else {
          console.error(`Source "${installedSkill.source}" not found for skill "${skillName}"`);
        }
      } else {
        console.log(`${skillName}: not from a remote source, nothing to update`);
      }
    } else {
      // Update from specified source
      const source = await getSource(sourceName);
      if (!source) {
        console.error(`Source "${sourceName}" not found`);
        continue;
      }
      await updateSkillFromSource(source, skillName);
    }
  }
}

async function updateSkillFromSource(source: SkillSource, skillName: string): Promise<void> {
  try {
    // Update the source
    await cloneOrUpdateSource(source);

    // Copy skill to project
    const projectSkillsDir = join(process.cwd(), '.claude', 'skills');
    await copySkillFromSource(source, skillName, projectSkillsDir);

    // Track the installation
    const commit = await getSourceCommit(source);
    await trackInstalledSkill({
      name: skillName,
      source: source.name,
      ref: commit,
      installedAt: new Date().toISOString()
    });

    console.log(`+ ${skillName} (from ${source.name})`);
  } catch (error) {
    console.error(`x ${skillName}: ${error}`);
  }
}
