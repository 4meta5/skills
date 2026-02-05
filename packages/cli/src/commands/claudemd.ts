/**
 * CLAUDE.md management CLI command
 *
 * Provides subcommands for managing skill references in CLAUDE.md:
 * - list: Show current skill references
 * - validate: Check for issues (duplicates, malformed refs)
 * - sync: Reconcile CLAUDE.md with installed skills
 * - add: Add a skill reference
 * - remove: Remove a skill reference
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  parseClaudeMd,
  updateClaudeMd
} from '../claudemd.js';
import { assertTestSafeProjectPath } from '../test/guard.js';

interface ClaudemdOptions {
  cwd?: string;
}

type Subcommand = 'list' | 'validate' | 'sync' | 'add' | 'remove';

/**
 * Main entry point for the claudemd command
 */
export async function claudemdCommand(
  subcommand: string,
  args: string[],
  options: ClaudemdOptions = {}
): Promise<void> {
  const projectDir = options.cwd || process.cwd();

  switch (subcommand as Subcommand) {
    case 'list':
      await listCommand(projectDir);
      break;

    case 'validate':
      await validateCommand(projectDir);
      break;

    case 'sync':
      assertTestSafeProjectPath(projectDir, 'write project');
      await syncCommand(projectDir);
      break;

    case 'add':
      assertTestSafeProjectPath(projectDir, 'write project');
      await addCommand(projectDir, args);
      break;

    case 'remove':
      assertTestSafeProjectPath(projectDir, 'write project');
      await removeCommand(projectDir, args);
      break;

    default:
      showHelp(subcommand);
  }
}

/**
 * List skill references in CLAUDE.md
 */
async function listCommand(projectDir: string): Promise<void> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');

  try {
    const content = await readFile(claudeMdPath, 'utf-8');
    const parsed = parseClaudeMd(content);

    if (parsed.skillReferences.length === 0) {
      console.log('No skills referenced in CLAUDE.md');
      return;
    }

    console.log(`Found ${parsed.skillReferences.length} skill(s) in CLAUDE.md:\n`);
    for (const skill of parsed.skillReferences) {
      console.log(`  - ${skill}`);
    }
  } catch {
    console.log('No CLAUDE.md found in project');
  }
}

/**
 * Validate CLAUDE.md for issues
 */
async function validateCommand(projectDir: string): Promise<void> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');

  try {
    const content = await readFile(claudeMdPath, 'utf-8');
    const parsed = parseClaudeMd(content);

    let hasIssues = false;

    // Report valid skills
    if (parsed.skillReferences.length > 0) {
      console.log(`Valid skill references (${parsed.skillReferences.length}):`);
      for (const skill of parsed.skillReferences) {
        console.log(`  + ${skill}`);
      }
    }

    // Check for duplicates
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const skill of parsed.skillReferences) {
      if (seen.has(skill)) {
        duplicates.push(skill);
      }
      seen.add(skill);
    }

    if (duplicates.length > 0) {
      hasIssues = true;
      console.log(`\nWarning: Duplicate references found:`);
      for (const dup of duplicates) {
        console.log(`  ! ${dup}`);
      }
    }

    // Check for malformed lines
    if (parsed.malformedLines && parsed.malformedLines.length > 0) {
      hasIssues = true;
      console.log(`\nWarning: Malformed lines in Installed Skills section:`);
      for (const line of parsed.malformedLines) {
        console.log(`  ? ${line.trim()}`);
      }
    }

    // Check if section exists
    if (!parsed.hasInstalledSkillsSection && parsed.skillReferences.length === 0) {
      console.log('\nNo "## Installed Skills" section found');
    }

    if (!hasIssues && parsed.skillReferences.length > 0) {
      console.log('\nNo issues found.');
    }
  } catch {
    console.log('No CLAUDE.md found - nothing to validate');
  }
}

/**
 * Sync CLAUDE.md with installed skills on filesystem
 */
async function syncCommand(projectDir: string): Promise<void> {
  const result = await updateClaudeMd(projectDir, 'sync', []);

  if (!result.success) {
    console.error('Failed to sync CLAUDE.md:', result.errors?.join(', '));
    return;
  }

  if (result.added.length === 0 && result.removed.length === 0) {
    console.log('CLAUDE.md is already in sync with installed skills');
    return;
  }

  if (result.added.length > 0) {
    console.log(`Added ${result.added.length} skill(s):`);
    for (const skill of result.added) {
      console.log(`  + ${skill}`);
    }
  }

  if (result.removed.length > 0) {
    console.log(`Removed ${result.removed.length} skill(s):`);
    for (const skill of result.removed) {
      console.log(`  - ${skill}`);
    }
  }

  console.log('\nCLAUDE.md synced successfully');
}

/**
 * Add skill references to CLAUDE.md
 */
async function addCommand(projectDir: string, skills: string[]): Promise<void> {
  if (skills.length === 0) {
    console.log('Usage: skills claudemd add <skill-names...>');
    return;
  }

  const result = await updateClaudeMd(projectDir, 'add', skills);

  if (!result.success) {
    console.error('Failed to add skill references:', result.errors?.join(', '));
    return;
  }

  if (result.added.length > 0) {
    console.log(`Added ${result.added.length} skill reference(s):`);
    for (const skill of result.added) {
      console.log(`  + ${skill}`);
    }
  }

  if (result.unchanged.length > 0) {
    console.log(`Already present (${result.unchanged.length}):`);
    for (const skill of result.unchanged) {
      console.log(`  = ${skill}`);
    }
  }
}

/**
 * Remove skill references from CLAUDE.md
 */
async function removeCommand(projectDir: string, skills: string[]): Promise<void> {
  if (skills.length === 0) {
    console.log('Usage: skills claudemd remove <skill-names...>');
    return;
  }

  const result = await updateClaudeMd(projectDir, 'remove', skills);

  if (!result.success) {
    console.error('Failed to remove skill references:', result.errors?.join(', '));
    return;
  }

  if (result.removed.length > 0) {
    console.log(`Removed ${result.removed.length} skill reference(s):`);
    for (const skill of result.removed) {
      console.log(`  - ${skill}`);
    }
  }

  if (result.unchanged.length > 0) {
    console.log(`Not found (${result.unchanged.length}):`);
    for (const skill of result.unchanged) {
      console.log(`  ? ${skill}`);
    }
  }
}

/**
 * Show help for claudemd command
 */
function showHelp(unknownCommand?: string): void {
  if (unknownCommand) {
    console.log(`Unknown subcommand: ${unknownCommand}\n`);
  }

  console.log(`Usage: skills claudemd <subcommand> [options]

Subcommands:
  list              List skill references in CLAUDE.md
  validate          Check CLAUDE.md for issues (duplicates, malformed refs)
  sync              Reconcile CLAUDE.md with installed skills
  add <names...>    Add skill reference(s) to CLAUDE.md
  remove <names...> Remove skill reference(s) from CLAUDE.md

Options:
  --cwd <path>      Target project directory (default: current directory)

Examples:
  skills claudemd list
  skills claudemd validate
  skills claudemd sync
  skills claudemd add tdd no-workarounds
  skills claudemd remove old-skill
`);
}
