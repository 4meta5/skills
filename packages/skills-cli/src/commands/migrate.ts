import { readdir, stat, rename, mkdir, readFile, writeFile, cp } from 'fs/promises';
import { join, basename } from 'path';
import { readProvenance, createProvenance, type ProvenanceSource } from '../provenance.js';

/**
 * Skill info for migration planning
 */
export interface SkillMigrationInfo {
  name: string;
  path: string;
  hasProvenance: boolean;
  isUpstream: boolean;
}

/**
 * Rename info for _temp_ prefixed skills
 */
export interface RenameInfo {
  oldName: string;
  newName: string;
  oldPath: string;
  newPath: string;
}

/**
 * Migration plan
 */
export interface MigrationPlan {
  custom: SkillMigrationInfo[];
  upstream: SkillMigrationInfo[];
  needsRename: RenameInfo[];
}

/**
 * Migration statistics
 */
export interface MigrationStats {
  customMoved: number;
  upstreamMoved: number;
  renamed: number;
  errors: string[];
}

/**
 * Migration result
 */
export interface MigrationResult {
  plan: MigrationPlan;
  migrated: boolean;
  alreadyMigrated: boolean;
  stats: MigrationStats;
}

/**
 * Options for migrate command
 */
interface MigrateOptions {
  cwd?: string;
  dryRun?: boolean;
  confirm?: boolean;
  json?: boolean;
}

/**
 * Check if the skills directory is already migrated (has custom/ or upstream/)
 */
async function isAlreadyMigrated(skillsDir: string): Promise<boolean> {
  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    return entries.some(e =>
      e.isDirectory() && (e.name === 'custom' || e.name === 'upstream')
    );
  } catch {
    return false;
  }
}

/**
 * Analyze skills and create a migration plan
 */
export async function analyzeSkillsForMigration(projectDir: string): Promise<MigrationPlan> {
  const skillsDir = join(projectDir, '.claude', 'skills');
  const plan: MigrationPlan = {
    custom: [],
    upstream: [],
    needsRename: []
  };

  let entries;
  try {
    entries = await readdir(skillsDir, { withFileTypes: true });
  } catch {
    return plan;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Skip already-migrated directories
    if (entry.name === 'custom' || entry.name === 'upstream') continue;

    const skillPath = join(skillsDir, entry.name);
    const skillMdPath = join(skillPath, 'SKILL.md');

    // Check if it's a valid skill
    try {
      await stat(skillMdPath);
    } catch {
      continue; // Not a skill directory
    }

    // Check for _temp_ prefix
    if (entry.name.startsWith('_temp_')) {
      const newName = entry.name.replace(/^_temp_/, '');
      plan.needsRename.push({
        oldName: entry.name,
        newName,
        oldPath: skillPath,
        newPath: join(skillsDir, 'custom', newName)
      });
      continue;
    }

    // Check provenance
    const provenance = await readProvenance(skillPath);
    const isUpstream = provenance?.source.type === 'git';

    const info: SkillMigrationInfo = {
      name: entry.name,
      path: skillPath,
      hasProvenance: provenance !== null,
      isUpstream
    };

    if (isUpstream) {
      plan.upstream.push(info);
    } else {
      plan.custom.push(info);
    }
  }

  return plan;
}

/**
 * Update CLAUDE.md skill references after migration
 */
async function updateClaudeMdReferences(
  projectDir: string,
  renames: Array<{ oldRef: string; newRef: string }>
): Promise<void> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');

  let content: string;
  try {
    content = await readFile(claudeMdPath, 'utf-8');
  } catch {
    return; // No CLAUDE.md
  }

  let modified = false;
  for (const { oldRef, newRef } of renames) {
    if (content.includes(oldRef)) {
      content = content.replace(new RegExp(escapeRegex(oldRef), 'g'), newRef);
      modified = true;
    }
  }

  if (modified) {
    await writeFile(claudeMdPath, content, 'utf-8');
  }
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Migrate command - reorganize skills into custom/ and upstream/ directories
 */
export async function migrateCommand(options: MigrateOptions = {}): Promise<MigrationResult> {
  const cwd = options.cwd || process.cwd();
  const skillsDir = join(cwd, '.claude', 'skills');

  const result: MigrationResult = {
    plan: { custom: [], upstream: [], needsRename: [] },
    migrated: false,
    alreadyMigrated: false,
    stats: { customMoved: 0, upstreamMoved: 0, renamed: 0, errors: [] }
  };

  // Check if already migrated
  if (await isAlreadyMigrated(skillsDir)) {
    result.alreadyMigrated = true;
    if (!options.json) {
      console.log('Skills directory already has custom/ or upstream/ structure.');
    }
    return result;
  }

  // Analyze skills
  const plan = await analyzeSkillsForMigration(cwd);
  result.plan = plan;

  const totalToMigrate = plan.custom.length + plan.upstream.length + plan.needsRename.length;

  if (totalToMigrate === 0) {
    if (!options.json) {
      console.log('No skills to migrate.');
    }
    return result;
  }

  // Dry run mode
  if (options.dryRun || !options.confirm) {
    if (!options.json) {
      printMigrationPlan(plan);
      if (!options.confirm) {
        console.log('\nRun with --confirm to apply migration.');
      }
    }
    return result;
  }

  // Create directories
  const customDir = join(skillsDir, 'custom');
  const upstreamDir = join(skillsDir, 'upstream');
  await mkdir(customDir, { recursive: true });
  await mkdir(upstreamDir, { recursive: true });

  const refUpdates: Array<{ oldRef: string; newRef: string }> = [];

  // Move custom skills
  for (const skill of plan.custom) {
    try {
      const targetDir = join(customDir, skill.name);
      await cp(skill.path, targetDir, { recursive: true });

      // Add provenance if missing
      if (!skill.hasProvenance) {
        const source: ProvenanceSource = { type: 'custom' };
        await createProvenance(targetDir, source);
      }

      // Remove old directory
      const { rm } = await import('fs/promises');
      await rm(skill.path, { recursive: true, force: true });

      result.stats.customMoved++;

      // Track reference update
      refUpdates.push({
        oldRef: `@.claude/skills/${skill.name}/SKILL.md`,
        newRef: `@.claude/skills/custom/${skill.name}/SKILL.md`
      });

      if (!options.json) {
        console.log(`+ ${skill.name} → custom/${skill.name}`);
      }
    } catch (error) {
      result.stats.errors.push(`Failed to move ${skill.name}: ${error}`);
    }
  }

  // Move upstream skills
  for (const skill of plan.upstream) {
    try {
      const targetDir = join(upstreamDir, skill.name);
      await cp(skill.path, targetDir, { recursive: true });

      // Remove old directory
      const { rm } = await import('fs/promises');
      await rm(skill.path, { recursive: true, force: true });

      result.stats.upstreamMoved++;

      // Track reference update
      refUpdates.push({
        oldRef: `@.claude/skills/${skill.name}/SKILL.md`,
        newRef: `@.claude/skills/upstream/${skill.name}/SKILL.md`
      });

      if (!options.json) {
        console.log(`+ ${skill.name} → upstream/${skill.name}`);
      }
    } catch (error) {
      result.stats.errors.push(`Failed to move ${skill.name}: ${error}`);
    }
  }

  // Handle _temp_ renames
  for (const rename of plan.needsRename) {
    try {
      await mkdir(join(customDir, rename.newName), { recursive: true });
      await cp(rename.oldPath, join(customDir, rename.newName), { recursive: true });

      // Add provenance
      const source: ProvenanceSource = { type: 'custom' };
      await createProvenance(join(customDir, rename.newName), source);

      // Update SKILL.md name field
      const skillMdPath = join(customDir, rename.newName, 'SKILL.md');
      let skillContent = await readFile(skillMdPath, 'utf-8');
      skillContent = skillContent.replace(
        /^name:\s*_temp_/m,
        'name: '
      );
      await writeFile(skillMdPath, skillContent, 'utf-8');

      // Remove old directory
      const { rm } = await import('fs/promises');
      await rm(rename.oldPath, { recursive: true, force: true });

      result.stats.renamed++;

      // Track reference update
      refUpdates.push({
        oldRef: `@.claude/skills/${rename.oldName}/SKILL.md`,
        newRef: `@.claude/skills/custom/${rename.newName}/SKILL.md`
      });

      if (!options.json) {
        console.log(`+ ${rename.oldName} → custom/${rename.newName} (renamed)`);
      }
    } catch (error) {
      result.stats.errors.push(`Failed to rename ${rename.oldName}: ${error}`);
    }
  }

  // Update CLAUDE.md references
  await updateClaudeMdReferences(cwd, refUpdates);

  result.migrated = true;

  if (!options.json) {
    console.log('');
    console.log(`Migration complete: ${result.stats.customMoved} custom, ${result.stats.upstreamMoved} upstream, ${result.stats.renamed} renamed`);

    if (result.stats.errors.length > 0) {
      console.log('\nErrors:');
      for (const error of result.stats.errors) {
        console.log(`  - ${error}`);
      }
    }
  }

  return result;
}

/**
 * Print migration plan
 */
function printMigrationPlan(plan: MigrationPlan): void {
  console.log('Migration plan:');
  console.log('');

  if (plan.custom.length > 0) {
    console.log(`Custom skills (${plan.custom.length}):`);
    for (const skill of plan.custom) {
      console.log(`  ${skill.name} → custom/${skill.name}`);
    }
    console.log('');
  }

  if (plan.upstream.length > 0) {
    console.log(`Upstream skills (${plan.upstream.length}):`);
    for (const skill of plan.upstream) {
      console.log(`  ${skill.name} → upstream/${skill.name}`);
    }
    console.log('');
  }

  if (plan.needsRename.length > 0) {
    console.log(`Skills to rename (${plan.needsRename.length}):`);
    for (const rename of plan.needsRename) {
      console.log(`  ${rename.oldName} → custom/${rename.newName}`);
    }
    console.log('');
  }
}
