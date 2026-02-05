#!/usr/bin/env node
import { cac } from 'cac';
import { listCommand } from './commands/list.js';
import { showCommand } from './commands/show.js';
import { addCommand } from './commands/add.js';
import { defaultsCommand } from './commands/defaults.js';
import { initCommand } from './commands/init.js';
import { sourceCommand } from './commands/source.js';
import { updateCommand } from './commands/update.js';
import { scanCommand } from './commands/scan.js';
import { hookCommand } from './commands/hook.js';
import { removeCommand } from './commands/remove.js';
import { syncCommand } from './commands/sync.js';
import { projectsCommand } from './commands/projects.js';
import { statsCommand } from './commands/stats.js';
import { claudemdCommand } from './commands/claudemd.js';
import { embedCommand } from './commands/embed.js';
import { evaluateCommand } from './commands/evaluate.js';
import { validateCommand } from './commands/validate.js';
import { hygieneCommand } from './commands/hygiene.js';

interface ListOptions {
  category?: string;
  json?: boolean;
  remote?: boolean;
  all?: boolean;
  custom?: boolean;
  upstream?: boolean;
  provenance?: boolean;
}

interface AddOptions {
  defaults?: boolean;
  user?: boolean;
  git?: string;
  ref?: string;
  cwd?: string;
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
  review?: boolean;
  yes?: boolean;
}

interface ScanOptions {
  json?: boolean;
  install?: boolean;
  all?: boolean;
  filter?: string;
  minConfidence?: string;
  showAlternatives?: boolean;
  yes?: boolean;
}

interface HookOptions {
  cwd?: string;
}

interface RemoveOptions {
  cwd?: string;
}

interface SyncOptions {
  all?: boolean;
  dryRun?: boolean;
  cwd?: string;
}

interface ProjectsOptions {
  skill?: string;
  json?: boolean;
  cwd?: string;
}

interface StatsOptions {
  json?: boolean;
  since?: string;
  skill?: string;
}

interface ClaudemdOptions {
  cwd?: string;
}

interface EmbedOptions {
  output?: string;
  skillsDir?: string;
  model?: string;
  cwd?: string;
}

interface EvaluateCommandOptions {
  skillsDir?: string;
  json?: boolean;
  cwd?: string;
}

interface ValidateCommandOptions {
  cwd?: string;
  path?: string;
  json?: boolean;
}

interface HygieneCommandOptions {
  cwd?: string;
  dryRun?: boolean;
  confirm?: boolean;
  json?: boolean;
  recursive?: boolean;
}

const cli = cac('skills');

cli
  .command('list', 'List available skills')
  .alias('ls')
  .option('-c, --category <category>', 'Filter by category')
  .option('--json', 'Output as JSON')
  .option('-r, --remote', 'List skills from remote sources')
  .option('-a, --all', 'List both local and remote skills')
  .option('--custom', 'List only custom skills (no git provenance)')
  .option('--upstream', 'List only upstream skills (git provenance)')
  .option('--provenance', 'Show provenance type for each skill')
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
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .action(async (names: string[], options: AddOptions) => {
    await addCommand(names, options);
  });

cli
  .command('remove [...names]', 'Remove skills from current project')
  .alias('rm')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .action(async (names: string[], options: RemoveOptions) => {
    await removeCommand(names, options);
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
  .option('-r, --review', 'Review changes before applying (security review)')
  .option('-y, --yes', 'Auto-confirm even HIGH risk updates (use with --review)')
  .action(async (names: string[], options: UpdateOptions) => {
    await updateCommand(names, options);
  });

cli
  .command('scan', 'Analyze project and recommend skills')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .option('--json', 'Output as JSON')
  .option('-i, --install', 'Interactively select and install skills')
  .option('-a, --all', 'Install all recommended skills')
  .option('-y, --yes', 'Skip confirmation prompts (use with --all)')
  .option('-f, --filter <tag>', 'Filter recommendations by tag (e.g., svelte, cloudflare)')
  .option('-m, --min-confidence <level>', 'Minimum confidence level (high, medium, low)')
  .option('--show-alternatives', 'Show deduplicated alternative skills')
  .action(async (options: ScanOptions) => {
    await scanCommand(options);
  });

cli
  .command('hook [subcommand] [...args]', 'Manage Claude Code hooks')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .action(async (subcommand: string | undefined, args: string[], options: HookOptions) => {
    await hookCommand(
      (subcommand as 'add' | 'list' | 'remove' | 'available') || 'list',
      args,
      options
    );
  });

cli
  .command('sync [...names]', 'Sync skills to all tracked projects')
  .option('-a, --all', 'Sync all skills in all projects')
  .option('-d, --dry-run', 'Show what would be updated without making changes')
  .option('-C, --cwd <path>', 'Source directory for skills (default: current directory)')
  .action(async (names: string[], options: SyncOptions) => {
    await syncCommand(names, options);
  });

cli
  .command('projects [subcommand] [...args]', 'Manage tracked project installations')
  .option('-s, --skill <name>', 'Filter by skill name')
  .option('--json', 'Output as JSON')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .action(async (subcommand: string | undefined, args: string[], options: ProjectsOptions) => {
    await projectsCommand(
      (subcommand as 'list' | 'add' | 'remove' | 'cleanup') || 'list',
      args,
      options
    );
  });

cli
  .command('stats', 'Show skill usage statistics')
  .option('--json', 'Output as JSON')
  .option('-s, --since <date>', 'Filter events since date (ISO format or "7d" for 7 days ago)')
  .option('--skill <name>', 'Filter by skill name')
  .action(async (options: StatsOptions) => {
    await statsCommand(options);
  });

cli
  .command('claudemd [subcommand] [...args]', 'Manage CLAUDE.md skill references')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .action(async (subcommand: string | undefined, args: string[], options: ClaudemdOptions) => {
    await claudemdCommand(subcommand || 'list', args, options);
  });

cli
  .command('embed', 'Generate vector store from installed skills')
  .option('-o, --output <path>', 'Output path for vector_store.json')
  .option('-s, --skills-dir <path>', 'Skills directory to scan')
  .option('-m, --model <name>', 'Embedding model (default: Xenova/all-MiniLM-L6-v2)')
  .option('-C, --cwd <path>', 'Working directory (default: current directory)')
  .action(async (options: EmbedOptions) => {
    await embedCommand(options);
  });

cli
  .command('evaluate', 'Generate dynamic skill evaluation prompt')
  .option('-s, --skills-dir <path>', 'Skills directory to scan')
  .option('--json', 'Output as JSON')
  .option('-C, --cwd <path>', 'Working directory (default: current directory)')
  .action(async (options: EvaluateCommandOptions) => {
    await evaluateCommand(options);
  });

cli
  .command('validate [path]', 'Validate installed skills')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .option('--path <path>', 'Path to a specific skill to validate')
  .option('--json', 'Output as JSON')
  .action(async (path: string | undefined, options: ValidateCommandOptions) => {
    const resolvedPath = options.path ?? path;
    await validateCommand({ ...options, path: resolvedPath });
  });

cli
  .command('hygiene [subcommand]', 'Detect and clean slop (auto-generated test skills)')
  .option('-C, --cwd <path>', 'Target project directory (default: current directory)')
  .option('-d, --dry-run', 'Show what would be deleted without deleting')
  .option('--confirm', 'Actually delete slop (required for clean)')
  .option('--json', 'Output as JSON')
  .option('-r, --recursive', 'Scan package subdirectories')
  .action(async (subcommand: string | undefined, options: HygieneCommandOptions) => {
    await hygieneCommand(
      (subcommand as 'scan' | 'clean') || 'scan',
      options
    );
  });

cli.help();
cli.version('1.0.0');

cli.parse();
