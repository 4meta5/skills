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
  getSourceCommit,
  getSkillPathInSource,
  getSourceCachePath
} from '../git.js';
import { parseSkillRef } from '../registry.js';
import { readProvenance, updateProvenance } from '../provenance.js';
import { join, relative, basename } from 'path';
import { homedir } from 'os';
import { readFile, readdir, stat, mkdir, writeFile } from 'fs/promises';

interface UpdateOptions {
  check?: boolean;  // Only check for updates, don't apply
  all?: boolean;    // Update all installed skills from sources
  review?: boolean; // Review changes before applying (security review)
  yes?: boolean;    // Auto-confirm even HIGH risk updates
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
    await updateInstalledSkills(options);
    return;
  }

  // Update specific skills
  await updateSpecificSkills(names, options);
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

async function updateInstalledSkills(options: UpdateOptions = {}): Promise<void> {
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

      await updateSkillFromSource(source, skillRef.name, options);
    } catch (error) {
      console.error(`x ${skillRef.name}: ${error}`);
    }
  }
}

async function updateSpecificSkills(names: string[], options: UpdateOptions = {}): Promise<void> {
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
          await updateSkillFromSource(source, skillName, options);
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
      await updateSkillFromSource(source, skillName, options);
    }
  }
}

async function updateSkillFromSource(
  source: SkillSource,
  skillName: string,
  options: UpdateOptions = {}
): Promise<void> {
  try {
    // Update the source
    await cloneOrUpdateSource(source);

    const projectSkillsDir = join(process.cwd(), '.claude', 'skills');
    const currentSkillPath = join(projectSkillsDir, 'upstream', skillName);
    const commit = await getSourceCommit(source);

    // If review mode, perform security review
    if (options.review) {
      // Get the new skill path from source
      const newSkillPath = await getSkillPathInSource(source, skillName);

      // Check if skill exists locally
      let skillExists = false;
      try {
        await stat(join(currentSkillPath, 'SKILL.md'));
        skillExists = true;
      } catch {
        // Skill doesn't exist yet, treat as fresh install
      }

      if (skillExists) {
        // Perform review
        const result = await updateWithReview({
          skillName,
          currentPath: currentSkillPath,
          newPath: newSkillPath,
          targetPath: currentSkillPath,
          autoConfirm: options.yes || false,
          storeReport: true,
          newCommit: commit
        });

        // Print review summary
        console.log(`\n${skillName}:`);
        console.log(`  Risk Level: ${result.assessment.level}`);
        console.log(`  Changes: +${result.diff.additions} -${result.diff.deletions} in ${result.diff.filesChanged} files`);

        if (result.assessment.reasons.length > 0) {
          console.log(`  Reasons:`);
          for (const reason of result.assessment.reasons) {
            console.log(`    - ${reason}`);
          }
        }

        if (result.requiresConfirmation) {
          console.log(`\n  ⚠️  HIGH RISK: Use --yes to confirm update`);
          return;
        }

        if (!result.updated) {
          console.log(`  Update skipped.`);
          return;
        }

        // Copy the updated skill
        await copySkillFromSource(source, skillName, join(projectSkillsDir, 'upstream'));
        console.log(`  ✓ Updated (review report saved)`);
      } else {
        // Fresh install with review
        const result = await updateWithReview({
          skillName,
          currentPath: newSkillPath, // Compare to itself for fresh install
          newPath: newSkillPath,
          autoConfirm: true,
          newCommit: commit
        });

        console.log(`\n${skillName}: (fresh install)`);
        console.log(`  Risk Level: ${result.assessment.level}`);

        await copySkillFromSource(source, skillName, join(projectSkillsDir, 'upstream'));
        console.log(`  ✓ Installed`);
      }
    } else {
      // Standard update without review
      await copySkillFromSource(source, skillName, projectSkillsDir);
      console.log(`+ ${skillName} (from ${source.name})`);
    }

    // Track the installation
    await trackInstalledSkill({
      name: skillName,
      source: source.name,
      ref: commit,
      installedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error(`x ${skillName}: ${error}`);
  }
}

// ========================================
// Review-based update types and functions
// ========================================

/**
 * Skill diff information
 */
export interface SkillDiff {
  skillName: string;
  currentCommit?: string;
  newCommit?: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  diff: string;
  newFiles: string[];
  deletedFiles: string[];
  modifiedFiles: string[];
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  triggers: string[];
}

/**
 * Update review result
 */
export interface UpdateReviewResult {
  diff: SkillDiff;
  assessment: RiskAssessment;
  report: string;
  updated: boolean;
  requiresConfirmation?: boolean;
  provenanceUpdated?: boolean;
}

/**
 * Options for updateWithReview
 */
export interface UpdateWithReviewOptions {
  skillName: string;
  currentPath: string;
  newPath: string;
  targetPath?: string;
  autoConfirm?: boolean;
  storeReport?: boolean;
  newCommit?: string;
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string, base: string = ''): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue; // Skip hidden files
      const relativePath = base ? join(base, entry.name) : entry.name;
      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(join(dir, entry.name), relativePath);
        files.push(...subFiles);
      } else {
        files.push(relativePath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files;
}

/**
 * Generate diff between current and new skill versions
 */
export async function generateSkillDiff(
  currentPath: string,
  newPath: string
): Promise<SkillDiff> {
  const skillName = basename(currentPath);

  // Get all files in both directories
  const currentFiles = await getAllFiles(currentPath);
  const newFiles = await getAllFiles(newPath);

  // Find new, deleted, and modified files
  const addedFiles = newFiles.filter(f => !currentFiles.includes(f));
  const deletedFiles = currentFiles.filter(f => !newFiles.includes(f));
  const commonFiles = newFiles.filter(f => currentFiles.includes(f));

  // Check which common files were modified
  const modifiedFiles: string[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;
  let diffContent = '';

  for (const file of commonFiles) {
    try {
      const currentContent = await readFile(join(currentPath, file), 'utf-8');
      const newContent = await readFile(join(newPath, file), 'utf-8');

      if (currentContent !== newContent) {
        modifiedFiles.push(file);

        // Generate simple diff
        const currentLines = currentContent.split('\n');
        const newLines = newContent.split('\n');

        // Count additions/deletions
        const additions = newLines.filter(l => !currentLines.includes(l)).length;
        const deletions = currentLines.filter(l => !newLines.includes(l)).length;
        totalAdditions += additions;
        totalDeletions += deletions;

        // Generate diff output
        diffContent += `--- a/${file}\n+++ b/${file}\n`;
        for (const line of currentLines) {
          if (!newLines.includes(line)) {
            diffContent += `-${line}\n`;
          }
        }
        for (const line of newLines) {
          if (!currentLines.includes(line)) {
            diffContent += `+${line}\n`;
          }
        }
        diffContent += '\n';
      }
    } catch {
      // File read error
    }
  }

  // Count new file additions
  for (const file of addedFiles) {
    try {
      const content = await readFile(join(newPath, file), 'utf-8');
      totalAdditions += content.split('\n').length;
    } catch {
      // File read error
    }
  }

  // Count deleted file deletions
  for (const file of deletedFiles) {
    try {
      const content = await readFile(join(currentPath, file), 'utf-8');
      totalDeletions += content.split('\n').length;
    } catch {
      // File read error
    }
  }

  return {
    skillName,
    filesChanged: modifiedFiles.length + addedFiles.length + deletedFiles.length,
    additions: totalAdditions,
    deletions: totalDeletions,
    diff: diffContent,
    newFiles: addedFiles,
    deletedFiles,
    modifiedFiles
  };
}

/**
 * HIGH risk patterns to detect in diffs
 */
const HIGH_RISK_PATTERNS = [
  // External calls
  { pattern: /curl\s+https?:\/\//i, reason: 'External HTTP calls detected' },
  { pattern: /wget\s+https?:\/\//i, reason: 'External HTTP calls detected' },
  { pattern: /fetch\s*\(/i, reason: 'Fetch API calls detected' },
  // Shell execution
  { pattern: /\|\s*bash/i, reason: 'Piped shell execution detected' },
  { pattern: /eval\s*\(/i, reason: 'Eval execution detected' },
  { pattern: /exec\s*\(/i, reason: 'Exec execution detected' },
  // Permission changes
  { pattern: /allowed-tools\s*:/i, reason: 'Allowed-tools permission changes detected' },
  // Crypto/auth
  { pattern: /api[_-]?key/i, reason: 'API key references detected' },
  { pattern: /secret/i, reason: 'Secret references detected' },
  { pattern: /password/i, reason: 'Password references detected' },
  { pattern: /token/i, reason: 'Token references detected' },
];

/**
 * MEDIUM risk patterns
 */
const MEDIUM_RISK_PATTERNS = [
  { pattern: /import\s+.*from/i, reason: 'New import statements' },
  { pattern: /require\s*\(/i, reason: 'Require statements detected' },
];

/**
 * Assess risk level of a skill diff
 */
export async function assessRiskLevel(diff: SkillDiff): Promise<RiskAssessment> {
  const reasons: string[] = [];
  const triggers: string[] = [];
  let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  // Check for script file changes (HIGH risk)
  const scriptExtensions = ['.sh', '.bash', '.py', '.rb', '.js'];
  const hasScriptChanges = diff.modifiedFiles.some(f =>
    scriptExtensions.some(ext => f.endsWith(ext))
  ) || diff.newFiles.some(f =>
    scriptExtensions.some(ext => f.endsWith(ext))
  );

  if (hasScriptChanges) {
    level = 'HIGH';
    reasons.push('Script file changes detected');
    triggers.push('script');
  }

  // Check diff content for HIGH risk patterns
  for (const { pattern, reason } of HIGH_RISK_PATTERNS) {
    if (pattern.test(diff.diff)) {
      level = 'HIGH';
      if (!reasons.includes(reason)) {
        reasons.push(reason);
      }
      triggers.push(pattern.source);
    }
  }

  // Check for new files (MEDIUM risk unless already HIGH)
  if (diff.newFiles.length > 0 && level !== 'HIGH') {
    level = 'MEDIUM';
    reasons.push('New files added');
    triggers.push('new-files');
  }

  // Check for deleted files (MEDIUM risk unless already HIGH)
  if (diff.deletedFiles.length > 0 && level !== 'HIGH') {
    if (level === 'LOW') {
      level = 'MEDIUM';
    }
    reasons.push('Files deleted');
    triggers.push('deleted-files');
  }

  // Check for MEDIUM risk patterns
  if (level === 'LOW') {
    for (const { pattern, reason } of MEDIUM_RISK_PATTERNS) {
      if (pattern.test(diff.diff)) {
        level = 'MEDIUM';
        if (!reasons.includes(reason)) {
          reasons.push(reason);
        }
        triggers.push(pattern.source);
      }
    }
  }

  // Default LOW risk reason
  if (reasons.length === 0) {
    reasons.push('Documentation/comment changes only');
  }

  return {
    level,
    reasons,
    triggers
  };
}

/**
 * Generate a markdown review report
 */
function generateReviewReport(
  diff: SkillDiff,
  assessment: RiskAssessment
): string {
  const timestamp = new Date().toISOString();
  let report = `# Skill Update Review Report

**Skill**: ${diff.skillName}
**Date**: ${timestamp}
**Risk Level**: ${assessment.level}

## Summary

- Files changed: ${diff.filesChanged}
- Additions: ${diff.additions}
- Deletions: ${diff.deletions}

## Risk Assessment

**Level**: ${assessment.level}

### Reasons
${assessment.reasons.map(r => `- ${r}`).join('\n')}

## Changes

`;

  if (diff.newFiles.length > 0) {
    report += `### New Files\n${diff.newFiles.map(f => `- ${f}`).join('\n')}\n\n`;
  }

  if (diff.deletedFiles.length > 0) {
    report += `### Deleted Files\n${diff.deletedFiles.map(f => `- ${f}`).join('\n')}\n\n`;
  }

  if (diff.modifiedFiles.length > 0) {
    report += `### Modified Files\n${diff.modifiedFiles.map(f => `- ${f}`).join('\n')}\n\n`;
  }

  if (diff.diff) {
    report += `### Diff\n\`\`\`diff\n${diff.diff}\`\`\`\n`;
  }

  return report;
}

/**
 * Update a skill with security review
 */
export async function updateWithReview(
  options: UpdateWithReviewOptions
): Promise<UpdateReviewResult> {
  const { skillName, currentPath, newPath, targetPath, autoConfirm, storeReport, newCommit } = options;

  // Generate diff
  const diff = await generateSkillDiff(currentPath, newPath);
  if (newCommit) {
    diff.newCommit = newCommit;
  }

  // Assess risk
  const assessment = await assessRiskLevel(diff);

  // Generate report
  const report = generateReviewReport(diff, assessment);

  // Determine if confirmation is required
  const requiresConfirmation = assessment.level === 'HIGH' && !autoConfirm;

  if (requiresConfirmation) {
    return {
      diff,
      assessment,
      report,
      updated: false,
      requiresConfirmation: true
    };
  }

  // Store report if requested
  if (storeReport && targetPath) {
    const reportDir = join(targetPath, '.review-reports');
    await mkdir(reportDir, { recursive: true });
    const reportFilename = `update-review-${Date.now()}.md`;
    await writeFile(join(reportDir, reportFilename), report, 'utf-8');
  }

  // Update provenance if it exists
  let provenanceUpdated = false;
  try {
    const provenance = await readProvenance(currentPath);
    if (provenance && newCommit) {
      await updateProvenance(currentPath, {
        source: { commit: newCommit },
        updated: { at: new Date().toISOString() },
        security: {
          lastReview: new Date().toISOString(),
          riskLevel: assessment.level.toLowerCase() as 'low' | 'medium' | 'high',
          reviewedBy: 'auto'
        }
      });
      provenanceUpdated = true;
    }
  } catch {
    // No provenance to update
  }

  return {
    diff,
    assessment,
    report,
    updated: true,
    provenanceUpdated
  };
}
