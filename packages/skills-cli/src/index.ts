#!/usr/bin/env node
import { cac } from 'cac';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { addCommand } from './commands/add.js';
import { defaultsCommand } from './commands/defaults.js';
import { initCommand } from './commands/init.js';
import { sourceCommand } from './commands/source.js';
import { updateCommand } from './commands/update.js';

interface ListOptions {
  category?: string;
  json?: boolean;
  remote?: boolean;
  all?: boolean;
}

interface AddOptions {
  defaults?: boolean;
  user?: boolean;
  git?: string;
  ref?: string;
}

interface InitOptions {
  defaults?: boolean;
  skills?: string;
}

interface SourceOptions {
  name?: string;
  path?: string;
  ref?: string;
}

interface UpdateOptions {
  check?: boolean;
  all?: boolean;
}

const cli = cac('skills');

cli
  .command('list', 'List available skills')
  .alias('ls')
  .option('-c, --category <category>', 'Filter by category')
  .option('--json', 'Output as JSON')
  .option('-r, --remote', 'List skills from remote sources')
  .option('-a, --all', 'List both local and remote skills')
  .action(async (options: ListOptions) => {
    await listCommand(options);
  });

cli
  .command('show <name>', 'Show skill details')
  .action(async (name: string) => {
    await showCommand(name);
  });

cli
  .command('add [...names]', 'Add skills to current project')
  .option('-d, --defaults', 'Use default skills')
  .option('-u, --user', 'Install to user directory (~/.claude/skills)')
  .option('-g, --git <url>', 'Install from git URL')
  .option('--ref <ref>', 'Git ref (branch/tag/commit) for --git')
  .action(async (names: string[], options: AddOptions) => {
    await addCommand(names, options);
  });

cli
  .command('defaults [subcommand] [...names]', 'Manage default skills')
  .action(async (subcommand: string | undefined, names: string[]) => {
    await defaultsCommand(
      (subcommand as 'list' | 'add' | 'remove' | 'set' | 'clear') || 'list',
      names
    );
  });

cli
  .command('init [path]', 'Initialize project with skills')
  .option('-d, --defaults', 'Use default skills')
  .option('-s, --skills <skills>', 'Comma-separated skill names')
  .action(async (path: string | undefined, options: InitOptions) => {
    const skills = options.skills ? options.skills.split(',').map((s: string) => s.trim()) : undefined;
    await initCommand(path, { ...options, skills });
  });

cli
  .command('source [subcommand] [...args]', 'Manage skill sources')
  .option('-n, --name <name>', 'Source name (for add)')
  .option('-p, --path <path>', 'Path within repository (for add)')
  .option('--ref <ref>', 'Git ref (branch/tag/commit)')
  .action(async (subcommand: string | undefined, args: string[], options: SourceOptions) => {
    await sourceCommand(
      (subcommand as 'add' | 'remove' | 'list' | 'info' | 'sync') || 'list',
      args,
      options
    );
  });

cli
  .command('update [...names]', 'Update skills from sources')
  .option('-c, --check', 'Check for updates without applying')
  .option('-a, --all', 'Update all installed skills from sources')
  .action(async (names: string[], options: UpdateOptions) => {
    await updateCommand(names, options);
  });

cli.help();
cli.version('1.0.0');

cli.parse();
