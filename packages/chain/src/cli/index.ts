#!/usr/bin/env node
import { cac } from 'cac';
import { validateCommand } from './commands/validate.js';
import { resolveCommand } from './commands/resolve.js';
import { explainCommand } from './commands/explain.js';
import { mermaidCommand } from './commands/mermaid.js';
import { activateCommand } from './commands/activate.js';
import { statusCommand } from './commands/status.js';
import { clearCommand } from './commands/clear.js';
import { nextCommand } from './commands/next.js';
import { hookPreToolUseCommand, hookStopCommand } from './commands/hook.js';

const cli = cac('chain');

cli
  .command('validate [dir]', 'Validate skills.yaml and profiles.yaml')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .option('--json', 'Output as JSON')
  .action(validateCommand);

cli
  .command('resolve <profile>', 'Resolve a profile to an ordered skill chain')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .option('--json', 'Output as JSON')
  .action(resolveCommand);

cli
  .command('explain <profile>', 'Explain the resolution of a profile')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .action(explainCommand);

cli
  .command('mermaid <profile>', 'Generate a Mermaid diagram for a profile')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .option('--capabilities', 'Show capability nodes instead of skills')
  .action(mermaidCommand);

cli
  .command('activate <profile>', 'Activate a profile and start a workflow session')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .option('--cwd <path>', 'Working directory for session state')
  .action(activateCommand);

cli
  .command('status', 'Show current session status')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .option('--cwd <path>', 'Working directory for session state')
  .option('--json', 'Output as JSON')
  .action(statusCommand);

cli
  .command('clear', 'Clear the current session')
  .option('--cwd <path>', 'Working directory for session state')
  .option('--force', 'Confirm clearing the session')
  .action(clearCommand);

cli
  .command('next', 'Show the next skill to activate')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--cwd <path>', 'Working directory for session state')
  .option('--json', 'Output as JSON')
  .action(nextCommand);

cli
  .command('hook-pre-tool-use', 'Check if a tool invocation is allowed (PreToolUse hook)')
  .option('--tool <json>', 'Tool invocation as JSON (required)')
  .option('--cwd <path>', 'Working directory for session state')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .action(hookPreToolUseCommand);

cli
  .command('hook-stop', 'Check if workflow can be stopped (Stop hook)')
  .option('--cwd <path>', 'Working directory for session state')
  .option('--skills <path>', 'Path to skills.yaml')
  .option('--profiles <path>', 'Path to profiles.yaml')
  .action(hookStopCommand);

cli.help();
cli.version('1.0.0');

cli.parse();
