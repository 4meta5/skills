import { readdir, readFile, rm, stat } from 'fs/promises';
import { join, basename } from 'path';

/**
 * Types of slop that can be detected
 */
export type SlopType =
  | 'test-skill'      // test-skill-* pattern
  | 'timestamped'     // Ends with timestamp
  | 'placeholder-content'  // Contains placeholder text
  | 'temp-prefix';    // _temp_* prefix

/**
 * Actions that can be taken on slop
 */
export type SlopAction = 'delete' | 'review' | 'rename';

/**
 * A detected slop item
 */
export interface SlopItem {
  name: string;
  path: string;
  type: SlopType;
  action: SlopAction;
  reason: string;
}

/**
 * Issues found in CLAUDE.md
 */
export interface ClaudeMdIssues {
  staleReferences: string[];  // Skills referenced but not installed
  duplicateReferences: string[];  // Skills referenced multiple times
}

/**
 * Result of scanning for slop
 */
export interface ScanResult {
  items: SlopItem[];
  claudemdIssues?: ClaudeMdIssues;
  scannedPaths: string[];
}

/**
 * Result of cleaning slop
 */
export interface CleanResult {
  deleted: string[];
  wouldDelete: string[];
  failed: string[];
  skipped: string[];
}

/**
 * Options for scanning
 */
interface ScanOptions {
  recursive?: boolean;
}

/**
 * Options for cleaning
 */
interface CleanOptions {
  dryRun?: boolean;
}

/**
 * Options for hygiene command
 */
interface HygieneOptions {
  cwd?: string;
  dryRun?: boolean;
  confirm?: boolean;
  json?: boolean;
  recursive?: boolean;
}

/**
 * Result of hygiene command
 */
interface HygieneCommandResult {
  type: 'scan' | 'clean';
  scanResult?: ScanResult;
  cleanResult?: CleanResult;
}

/**
 * Slop detection patterns
 */
const SLOP_PATTERNS = {
  // test-skill-* with any suffix
  testSkill: /^test-skill-\d+$/,
  // Ends with 13-digit timestamp (milliseconds since epoch)
  timestamped: /-\d{13}$/,
  // _temp_ prefix
  tempPrefix: /^_temp_/,
};

/**
 * Placeholder content patterns
 */
const PLACEHOLDER_PATTERNS = [
  /^NEW content with improvements!$/m,
  /^# Test Skill\s*$/m,
];

/**
 * Find all .claude/skills directories in a project
 */
async function findSkillsDirectories(
  rootDir: string,
  recursive: boolean = false
): Promise<string[]> {
  const skillsDirs: string[] = [];

  // Always check root
  const rootSkillsDir = join(rootDir, '.claude', 'skills');
  try {
    await stat(rootSkillsDir);
    skillsDirs.push(rootSkillsDir);
  } catch {
    // Doesn't exist
  }

  if (recursive) {
    // Look for packages with their own skills
    const packagesDir = join(rootDir, 'packages');
    try {
      const packages = await readdir(packagesDir, { withFileTypes: true });
      for (const pkg of packages) {
        if (pkg.isDirectory()) {
          const pkgSkillsDir = join(packagesDir, pkg.name, '.claude', 'skills');
          try {
            await stat(pkgSkillsDir);
            skillsDirs.push(pkgSkillsDir);
          } catch {
            // Doesn't exist
          }
        }
      }
    } catch {
      // No packages directory
    }
  }

  return skillsDirs;
}

/**
 * Check if skill content has placeholder patterns
 */
async function hasPlaceholderContent(skillPath: string): Promise<boolean> {
  const skillMdPath = join(skillPath, 'SKILL.md');
  try {
    const content = await readFile(skillMdPath, 'utf-8');
    return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(content));
  } catch {
    return false;
  }
}

/**
 * Scan a project for slop
 */
export async function scanForSlop(
  projectDir: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const items: SlopItem[] = [];
  const scannedPaths: string[] = [];

  // Find all skills directories
  const skillsDirs = await findSkillsDirectories(projectDir, options.recursive);

  for (const skillsDir of skillsDirs) {
    scannedPaths.push(skillsDir);

    let entries;
    try {
      entries = await readdir(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillName = entry.name;
      const skillPath = join(skillsDir, skillName);

      // Check for test-skill-* pattern
      if (SLOP_PATTERNS.testSkill.test(skillName)) {
        items.push({
          name: skillName,
          path: skillPath,
          type: 'test-skill',
          action: 'delete',
          reason: 'Matches test-skill-* pattern (auto-generated test data)'
        });
        continue;
      }

      // Check for timestamped pattern
      if (SLOP_PATTERNS.timestamped.test(skillName)) {
        items.push({
          name: skillName,
          path: skillPath,
          type: 'timestamped',
          action: 'review',
          reason: 'Name ends with timestamp (may be auto-generated)'
        });
        continue;
      }

      // Check for _temp_ prefix
      if (SLOP_PATTERNS.tempPrefix.test(skillName)) {
        items.push({
          name: skillName,
          path: skillPath,
          type: 'temp-prefix',
          action: 'review',
          reason: '_temp_ prefix suggests this needs renaming or cleanup'
        });
        continue;
      }

      // Check for placeholder content
      if (await hasPlaceholderContent(skillPath)) {
        items.push({
          name: skillName,
          path: skillPath,
          type: 'placeholder-content',
          action: 'delete',
          reason: 'Contains placeholder content (e.g., "NEW content with improvements!")'
        });
      }
    }
  }

  // Check CLAUDE.md for stale references
  const claudemdIssues = await checkClaudeMdReferences(projectDir, skillsDirs);

  return {
    items,
    claudemdIssues,
    scannedPaths
  };
}

/**
 * Check CLAUDE.md for references to skills that don't exist
 */
async function checkClaudeMdReferences(
  projectDir: string,
  skillsDirs: string[]
): Promise<ClaudeMdIssues | undefined> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');
  let content: string;
  try {
    content = await readFile(claudeMdPath, 'utf-8');
  } catch {
    return undefined;
  }

  // Find all skill references in CLAUDE.md
  const refPattern = /@?\.claude\/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md/g;
  const references: string[] = [];
  let match;
  while ((match = refPattern.exec(content)) !== null) {
    references.push(match[1]);
  }

  // Get all installed skills
  const installedSkills = new Set<string>();
  for (const skillsDir of skillsDirs) {
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          installedSkills.add(entry.name);
        }
      }
    } catch {
      // Skip
    }
  }

  // Find stale references
  const staleReferences = references.filter(ref => !installedSkills.has(ref));

  // Find duplicates
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const ref of references) {
    if (seen.has(ref)) {
      if (!duplicates.includes(ref)) {
        duplicates.push(ref);
      }
    }
    seen.add(ref);
  }

  if (staleReferences.length === 0 && duplicates.length === 0) {
    return undefined;
  }

  return {
    staleReferences,
    duplicateReferences: duplicates
  };
}

/**
 * Clean slop from a project
 */
export async function cleanSlop(
  projectDir: string,
  items: SlopItem[],
  options: CleanOptions = {}
): Promise<CleanResult> {
  const deleted: string[] = [];
  const wouldDelete: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const item of items) {
    // Only process items marked for deletion
    if (item.action !== 'delete') {
      skipped.push(item.name);
      continue;
    }

    if (options.dryRun) {
      wouldDelete.push(item.name);
      continue;
    }

    try {
      // Check if path exists first
      await stat(item.path);
      await rm(item.path, { recursive: true, force: true });
      deleted.push(item.name);
    } catch (error) {
      failed.push(item.name);
    }
  }

  return {
    deleted,
    wouldDelete,
    failed,
    skipped
  };
}

/**
 * Main hygiene command
 */
export async function hygieneCommand(
  subcommand: 'scan' | 'clean' = 'scan',
  options: HygieneOptions = {}
): Promise<HygieneCommandResult> {
  const cwd = options.cwd || process.cwd();

  // Scan for slop
  const scanResult = await scanForSlop(cwd, { recursive: options.recursive });

  if (subcommand === 'scan') {
    if (!options.json) {
      printScanResults(scanResult);
    }
    return { type: 'scan', scanResult };
  }

  // Clean subcommand
  const itemsToClean = scanResult.items.filter(item => item.action === 'delete');

  if (itemsToClean.length === 0) {
    if (!options.json) {
      console.log('No slop found to clean.');
    }
    return {
      type: 'clean',
      scanResult,
      cleanResult: { deleted: [], wouldDelete: [], failed: [], skipped: [] }
    };
  }

  const cleanResult = await cleanSlop(cwd, itemsToClean, {
    dryRun: !options.confirm
  });

  if (!options.json) {
    printCleanResults(cleanResult, !options.confirm);
  }

  return { type: 'clean', scanResult, cleanResult };
}

/**
 * Print scan results to console
 */
function printScanResults(result: ScanResult): void {
  if (result.items.length === 0 && !result.claudemdIssues) {
    console.log('No slop found.');
    return;
  }

  console.log('Slop detected:');
  console.log('');

  // Group by action
  const toDelete = result.items.filter(i => i.action === 'delete');
  const toReview = result.items.filter(i => i.action === 'review');

  if (toDelete.length > 0) {
    console.log(`Will delete (${toDelete.length}):`);
    for (const item of toDelete) {
      console.log(`  x ${item.name}`);
      console.log(`    ${item.reason}`);
    }
    console.log('');
  }

  if (toReview.length > 0) {
    console.log(`Needs review (${toReview.length}):`);
    for (const item of toReview) {
      console.log(`  ? ${item.name}`);
      console.log(`    ${item.reason}`);
    }
    console.log('');
  }

  if (result.claudemdIssues) {
    if (result.claudemdIssues.staleReferences.length > 0) {
      console.log('CLAUDE.md stale references:');
      for (const ref of result.claudemdIssues.staleReferences) {
        console.log(`  - ${ref}`);
      }
      console.log('');
    }

    if (result.claudemdIssues.duplicateReferences.length > 0) {
      console.log('CLAUDE.md duplicate references:');
      for (const ref of result.claudemdIssues.duplicateReferences) {
        console.log(`  - ${ref}`);
      }
      console.log('');
    }
  }

  console.log('Run `skills hygiene clean --confirm` to delete slop.');
}

/**
 * Print clean results to console
 */
function printCleanResults(result: CleanResult, isDryRun: boolean): void {
  if (isDryRun) {
    if (result.wouldDelete.length > 0) {
      console.log('Would delete:');
      for (const name of result.wouldDelete) {
        console.log(`  - ${name}`);
      }
      console.log('');
      console.log('Run with --confirm to actually delete.');
    }
    return;
  }

  if (result.deleted.length > 0) {
    console.log('Deleted:');
    for (const name of result.deleted) {
      console.log(`  - ${name}`);
    }
  }

  if (result.failed.length > 0) {
    console.log('Failed to delete:');
    for (const name of result.failed) {
      console.log(`  - ${name}`);
    }
  }
}
