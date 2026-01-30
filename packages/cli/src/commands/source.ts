import {
  addSource,
  removeSource,
  getSources,
  getSource,
  getSourcesCacheDir,
  type SkillSource
} from '../config.js';
import {
  cloneOrUpdateSource,
  discoverSkillsInSource,
  parseGitUrl,
  extractSourceName,
  getSourceCachePath,
  checkForUpdates
} from '../git.js';
import { rm } from 'fs/promises';

type SourceSubcommand = 'add' | 'remove' | 'list' | 'info' | 'sync';

interface SourceAddOptions {
  name?: string;
  path?: string;
  ref?: string;
}

export async function sourceCommand(
  subcommand: SourceSubcommand = 'list',
  args: string[] = [],
  options: SourceAddOptions = {}
): Promise<void> {
  switch (subcommand) {
    case 'add':
      await addSourceCommand(args[0], options);
      break;
    case 'remove':
      await removeSourceCommand(args[0]);
      break;
    case 'list':
      await listSourcesCommand();
      break;
    case 'info':
      await sourceInfoCommand(args[0]);
      break;
    case 'sync':
      await syncSourcesCommand(args[0]);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log('Usage: skills source [add|remove|list|info|sync] [args...]');
      process.exit(1);
  }
}

async function addSourceCommand(url: string | undefined, options: SourceAddOptions): Promise<void> {
  if (!url) {
    console.error('Error: URL is required.');
    console.log('Usage: skills source add <url> [--name <name>] [--path <path>] [--ref <ref>]');
    console.log('\nExamples:');
    console.log('  skills source add https://github.com/blader/Claudeception');
    console.log('  skills source add https://github.com/moltbot/moltbot --path skills');
    console.log('  skills source add https://github.com/trailofbits/audit-skills-tob --name tob');
    process.exit(1);
  }

  const parsed = parseGitUrl(url);
  const source: SkillSource = {
    name: options.name || extractSourceName(parsed.url),
    url: parsed.url,
    path: options.path || parsed.path,
    ref: options.ref || parsed.ref,
    type: 'git'
  };

  // Check if source already exists
  const existing = await getSource(source.name);
  if (existing) {
    console.log(`Updating existing source: ${source.name}`);
  } else {
    console.log(`Adding source: ${source.name}`);
  }

  // Clone/update the repository
  console.log(`Fetching from ${source.url}...`);
  try {
    await cloneOrUpdateSource(source);
  } catch (error) {
    console.error(`Error: Failed to fetch repository: ${error}`);
    process.exit(1);
  }

  // Discover skills
  const skills = await discoverSkillsInSource(source);
  console.log(`Found ${skills.length} skill(s) in source.`);

  if (skills.length > 0 && skills.length <= 10) {
    console.log('  ' + skills.join(', '));
  }

  // Save the source
  await addSource(source);
  console.log(`\nSource "${source.name}" added successfully.`);
  console.log(`Use "skills list --remote" to see available skills.`);
}

async function removeSourceCommand(name: string | undefined): Promise<void> {
  if (!name) {
    console.error('Error: Source name is required.');
    console.log('Usage: skills source remove <name>');
    process.exit(1);
  }

  const source = await getSource(name);
  if (!source) {
    console.error(`Error: Source "${name}" not found.`);
    process.exit(1);
  }

  // Remove cached data
  const cachePath = getSourceCachePath(name);
  try {
    await rm(cachePath, { recursive: true, force: true });
    console.log(`Removed cached data for "${name}".`);
  } catch {
    // Cache may not exist
  }

  // Remove from config
  const removed = await removeSource(name);
  if (removed) {
    console.log(`Source "${name}" removed successfully.`);
  } else {
    console.error(`Error: Failed to remove source "${name}".`);
    process.exit(1);
  }
}

async function listSourcesCommand(): Promise<void> {
  const sources = await getSources();

  if (sources.length === 0) {
    console.log('No sources configured.');
    console.log('\nAdd a source with:');
    console.log('  skills source add <url>');
    console.log('\nExamples:');
    console.log('  skills source add https://github.com/blader/Claudeception');
    console.log('  skills source add https://github.com/moltbot/moltbot --path skills');
    console.log('  skills source add https://github.com/trailofbits/audit-skills-tob --name tob');
    return;
  }

  console.log('\nConfigured sources:\n');

  for (const source of sources) {
    console.log(`  ${source.name}`);
    console.log(`    URL: ${source.url}`);
    if (source.path) {
      console.log(`    Path: ${source.path}`);
    }
    if (source.ref) {
      console.log(`    Ref: ${source.ref}`);
    }

    // Show skill count
    const skills = await discoverSkillsInSource(source);
    console.log(`    Skills: ${skills.length}`);
    console.log();
  }

  console.log(`Total: ${sources.length} source(s)`);
  console.log(`\nCache directory: ${getSourcesCacheDir()}`);
}

async function sourceInfoCommand(name: string | undefined): Promise<void> {
  if (!name) {
    console.error('Error: Source name is required.');
    console.log('Usage: skills source info <name>');
    process.exit(1);
  }

  const source = await getSource(name);
  if (!source) {
    console.error(`Error: Source "${name}" not found.`);
    process.exit(1);
  }

  console.log(`\nSource: ${source.name}`);
  console.log('='.repeat(source.name.length + 8));
  console.log(`URL: ${source.url}`);
  if (source.path) {
    console.log(`Path: ${source.path}`);
  }
  if (source.ref) {
    console.log(`Ref: ${source.ref}`);
  }
  console.log(`Cache: ${getSourceCachePath(name)}`);

  // Check for updates
  const updateInfo = await checkForUpdates(source);
  if (updateInfo.currentRef) {
    console.log(`Current commit: ${updateInfo.currentRef}`);
  }
  if (updateInfo.hasUpdates) {
    console.log(`Updates available: ${updateInfo.latestRef}`);
  }

  // List skills
  const skills = await discoverSkillsInSource(source);
  console.log(`\nSkills (${skills.length}):`);
  for (const skill of skills) {
    console.log(`  - ${skill}`);
  }
}

async function syncSourcesCommand(name: string | undefined): Promise<void> {
  const sources = name ? [await getSource(name)].filter(Boolean) : await getSources();

  if (sources.length === 0) {
    if (name) {
      console.error(`Error: Source "${name}" not found.`);
    } else {
      console.log('No sources configured.');
    }
    process.exit(1);
  }

  console.log(`Syncing ${sources.length} source(s)...\n`);

  for (const source of sources) {
    if (!source) continue;

    console.log(`Syncing ${source.name}...`);
    try {
      await cloneOrUpdateSource(source);
      const skills = await discoverSkillsInSource(source);
      console.log(`  Updated: ${skills.length} skill(s) available`);
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  console.log('\nSync complete.');
}
