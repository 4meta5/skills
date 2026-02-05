import { checkbox, confirm } from '@inquirer/prompts';
import { createSkillsLibrary } from '@4meta5/skills';
import { analyzeProject, getAllTechnologies, type ProjectAnalysis } from '../detector/index.js';
import type { Confidence, DetectedTechnology } from '../detector/types.js';
import {
  matchSkills,
  getAllRecommendations,
  filterByConfidence,
  filterByTag,
  type SkillRecommendation,
  type MatchResult
} from '../matcher.js';
import { getCuratedSource, type CuratedSource } from '../curated-sources.js';
import { addSource, getSource, trackInstalledSkill } from '../config.js';
import {
  cloneOrUpdateSource,
  copySkillFromSource,
  getSourceCommit
} from '../git.js';
import { join } from 'path';
import { homedir } from 'os';
import { updateClaudeMd } from '../claudemd.js';
import { assertTestSafeProjectPath } from '../test/guard.js';

interface ScanOptions {
  json?: boolean;
  install?: boolean;
  all?: boolean;
  filter?: string;
  minConfidence?: string;
  showAlternatives?: boolean;  // Show deduplicated alternatives
  yes?: boolean;  // Skip confirmation prompts
  cwd?: string;   // Target project directory
}

export async function scanCommand(options: ScanOptions = {}): Promise<void> {
  const projectPath = options.cwd || process.cwd();
  if (options.install || options.all) {
    assertTestSafeProjectPath(projectPath, 'write project');
  }

  console.log('Analyzing project...\n');

  // Analyze the project
  const analysis = await analyzeProject(projectPath);

  // Match skills
  const matchResult = await matchSkills(analysis);

  // Output as JSON if requested
  if (options.json) {
    outputJson(analysis, matchResult);
    return;
  }

  // Display detected stack
  displayStack(analysis);

  // Get recommendations based on filters
  let recommendations = getFilteredRecommendations(matchResult, options);

  if (recommendations.length === 0) {
    console.log('No skill recommendations for detected stack.');
    if (analysis.existingSkills.length > 0) {
      console.log(`\nExisting skills: ${analysis.existingSkills.join(', ')}`);
    }
    return;
  }

  // Display recommendations
  displayRecommendations(matchResult, options);

  // Install mode
  if (options.install) {
    await interactiveInstall(recommendations, analysis, options);
  } else if (options.all) {
    await installAll(recommendations, analysis, options);
  } else {
    // Show install hint
    console.log('\nTo install recommended skills:');
    console.log('  skills scan --install           # Interactive selection');
    console.log('  skills scan --all               # Install all high confidence');
    console.log('  skills scan --show-alternatives # See deduplicated alternatives');
  }
}

/**
 * Output analysis and recommendations as JSON
 */
function outputJson(analysis: ProjectAnalysis, matchResult: MatchResult): void {
  const output = {
    detected: {
      languages: analysis.languages.map(formatTech),
      frameworks: analysis.frameworks.map(formatTech),
      deployment: analysis.deployment.map(formatTech),
      testing: analysis.testing.map(formatTech),
      databases: analysis.databases.map(formatTech)
    },
    existingSkills: analysis.existingSkills,
    workspaces: analysis.workspaces,
    recommendations: {
      high: matchResult.high.map(formatRecommendation),
      medium: matchResult.medium.map(formatRecommendation),
      low: matchResult.low.map(formatRecommendation)
    }
  };

  console.log(JSON.stringify(output, null, 2));
}

function formatTech(tech: DetectedTechnology) {
  return {
    name: tech.name,
    confidence: tech.confidence,
    version: tech.version,
    evidence: tech.evidence
  };
}

function formatRecommendation(rec: SkillRecommendation) {
  return {
    name: rec.name,
    confidence: rec.confidence,
    reason: rec.reason,
    source: rec.source,
    sourceName: rec.sourceName,
    tags: rec.tags,
    category: rec.category,
    alternatives: rec.alternatives
  };
}

/**
 * Display the detected technology stack
 */
function displayStack(analysis: ProjectAnalysis): void {
  console.log('Detected Stack:');

  if (analysis.languages.length > 0) {
    const langs = analysis.languages
      .map(l => `${l.name}${l.version ? ` ${l.version}` : ''} (${l.confidence})`)
      .join(', ');
    console.log(`  Languages:     ${langs}`);
  }

  if (analysis.frameworks.length > 0) {
    const frameworks = analysis.frameworks
      .map(f => `${f.name}${f.version ? ` ${f.version}` : ''} (${f.confidence})`)
      .join(', ');
    console.log(`  Frameworks:    ${frameworks}`);
  }

  if (analysis.deployment.length > 0) {
    const deployment = analysis.deployment
      .map(d => `${d.name} (${d.confidence})`)
      .join(', ');
    console.log(`  Deployment:    ${deployment}`);
  }

  if (analysis.testing.length > 0) {
    const testing = analysis.testing
      .map(t => `${t.name} (${t.confidence})`)
      .join(', ');
    console.log(`  Testing:       ${testing}`);
  }

  if (analysis.databases.length > 0) {
    const databases = analysis.databases
      .map(d => `${d.name} (${d.confidence})`)
      .join(', ');
    console.log(`  Databases:     ${databases}`);
  }

  if (analysis.existingSkills.length > 0) {
    console.log(`  Existing:      ${analysis.existingSkills.join(', ')}`);
  }

  if (analysis.workspaces && analysis.workspaces.length > 0) {
    console.log(`  Workspaces:    ${analysis.workspaces.length} scanned (${analysis.workspaces.join(', ')})`);
  }

  console.log();
}

/**
 * Group recommendations by category
 */
function groupByCategory(recommendations: SkillRecommendation[]): Map<string, SkillRecommendation[]> {
  const groups = new Map<string, SkillRecommendation[]>();

  for (const rec of recommendations) {
    const category = rec.category?.toUpperCase() || 'OTHER';
    const existing = groups.get(category) || [];
    existing.push(rec);
    groups.set(category, existing);
  }

  return groups;
}

/**
 * Display skill recommendations grouped by category
 */
function displayRecommendations(matchResult: MatchResult, options: ScanOptions): void {
  console.log('Recommended Skills:\n');

  const minConfidence = parseConfidence(options.minConfidence);

  // Collect all recommendations that pass filter
  const allRecs: SkillRecommendation[] = [];

  if (matchResult.high.length > 0 && confidenceAtLeast(minConfidence, 'high')) {
    for (const rec of matchResult.high) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      allRecs.push(rec);
    }
  }

  if (matchResult.medium.length > 0 && confidenceAtLeast(minConfidence, 'medium')) {
    for (const rec of matchResult.medium) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      allRecs.push(rec);
    }
  }

  if (matchResult.low.length > 0 && confidenceAtLeast(minConfidence, 'low')) {
    for (const rec of matchResult.low) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      allRecs.push(rec);
    }
  }

  // Group by category
  const byCategory = groupByCategory(allRecs);

  // Display by category
  for (const [category, recs] of byCategory) {
    const altCount = recs.reduce((sum, r) => sum + (r.alternatives?.length || 0), 0);
    const altText = altCount > 0 ? ` (${recs.length + altCount} skills available)` : '';

    console.log(`  ${category}${altText}`);
    for (const rec of recs) {
      displayRecommendation(rec, options);
    }
    console.log();
  }
}

function displayRecommendation(rec: SkillRecommendation, options: ScanOptions): void {
  const sourceInfo = rec.sourceName ? ` (${rec.sourceName})` : ' (bundled)';
  const confidenceMarker = rec.confidence === 'high' ? '' : ` [${rec.confidence}]`;
  console.log(`  + ${rec.name}${sourceInfo}${confidenceMarker}`);
  console.log(`    ${rec.reason}`);

  // Show alternatives if requested
  if (options.showAlternatives && rec.alternatives && rec.alternatives.length > 0) {
    const altList = rec.alternatives.map(a => `${a.name} (${a.source})`).join(', ');
    console.log(`    Alternatives: ${altList}`);
  } else if (rec.alternatives && rec.alternatives.length > 0) {
    console.log(`    ${rec.alternatives.length} alternative(s) available`);
  }
}

/**
 * Get filtered recommendations based on options
 */
function getFilteredRecommendations(
  matchResult: MatchResult,
  options: ScanOptions
): SkillRecommendation[] {
  const minConfidence = parseConfidence(options.minConfidence);
  let recommendations = filterByConfidence(matchResult, minConfidence);

  if (options.filter) {
    recommendations = filterByTag(recommendations, options.filter);
  }

  return recommendations;
}

function parseConfidence(value?: string): Confidence {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'low'; // Default: show all
}

function confidenceAtLeast(min: Confidence, current: Confidence): boolean {
  const levels: Confidence[] = ['high', 'medium', 'low'];
  return levels.indexOf(current) <= levels.indexOf(min);
}

function matchesFilter(rec: SkillRecommendation, filter: string): boolean {
  const normalizedFilter = filter.toLowerCase();
  return rec.tags.some(t => t.toLowerCase().includes(normalizedFilter)) ||
         rec.name.toLowerCase().includes(normalizedFilter);
}

/**
 * Interactive skill installation
 */
async function interactiveInstall(
  recommendations: SkillRecommendation[],
  analysis: ProjectAnalysis,
  options: ScanOptions
): Promise<void> {
  const choices = recommendations.map(rec => ({
    name: `${rec.name} - ${rec.reason}`,
    value: rec,
    checked: rec.confidence === 'high'
  }));

  const selected = await checkbox({
    message: 'Select skills to install:',
    choices,
    pageSize: 15
  });

  if (selected.length === 0) {
    console.log('No skills selected.');
    return;
  }

  await installSkills(selected, analysis);
}

/**
 * Install all filtered recommendations
 */
async function installAll(
  recommendations: SkillRecommendation[],
  analysis: ProjectAnalysis,
  options: ScanOptions
): Promise<void> {
  // Default to high confidence only when --all is used
  const minConfidence = parseConfidence(options.minConfidence || 'high');
  const toInstall = recommendations.filter(r =>
    confidenceAtLeast(minConfidence, r.confidence)
  );

  if (toInstall.length === 0) {
    console.log('No skills to install at specified confidence level.');
    return;
  }

  console.log(`\nInstalling ${toInstall.length} skill(s)...`);

  // Skip confirmation if --yes flag is provided
  if (!options.yes) {
    const shouldProceed = await confirm({
      message: `Install ${toInstall.length} skill(s)?`,
      default: true
    });

    if (!shouldProceed) {
      console.log('Installation cancelled.');
      return;
    }
  }

  await installSkills(toInstall, analysis);
}

/**
 * Install a list of skills
 */
async function installSkills(
  skills: SkillRecommendation[],
  analysis: ProjectAnalysis
): Promise<void> {
  const targetDir = join(analysis.projectPath, '.claude', 'skills');
  const library = createSkillsLibrary({ cwd: analysis.projectPath });
  let installed = 0;
  const installedNames: string[] = [];

  for (const rec of skills) {
    try {
      if (rec.source === 'bundled') {
        // Install from bundled
        const skill = rec.skill || await library.loadSkill(rec.name);
        await library.installSkill(skill, { location: 'project' });

        await trackInstalledSkill({
          name: rec.name,
          source: 'bundled',
          installedAt: new Date().toISOString()
        });
      } else if (rec.source === 'curated' && rec.sourceName) {
        // Get curated source config (always has correct path, etc.)
        const curatedSource = getCuratedSource(rec.sourceName);
        if (!curatedSource) {
          throw new Error(`Unknown curated source: ${rec.sourceName}`);
        }

        // Register or update source from curated config
        // This ensures the source has the correct path even if previously registered wrong
        const existingSource = await getSource(rec.sourceName);
        const needsUpdate = !existingSource ||
          existingSource.path !== curatedSource.source.path ||
          existingSource.url !== curatedSource.source.url;

        if (needsUpdate) {
          console.log(`  ${existingSource ? 'Updating' : 'Registering'} source: ${rec.sourceName}`);
          await addSource(curatedSource.source);
        }

        // Clone or update the repository
        await cloneOrUpdateSource(curatedSource.source);

        // Install skill from source using the curated config
        await copySkillFromSource(curatedSource.source, rec.name, targetDir);
        const commit = await getSourceCommit(curatedSource.source);

        await trackInstalledSkill({
          name: rec.name,
          source: rec.sourceName,
          ref: commit,
          installedAt: new Date().toISOString()
        });
      } else if (rec.source === 'registered' && rec.sourceName) {
        // Install from registered source
        const source = await getSource(rec.sourceName);
        if (source) {
          await copySkillFromSource(source, rec.name, targetDir);
          const commit = await getSourceCommit(source);

          await trackInstalledSkill({
            name: rec.name,
            source: rec.sourceName,
            ref: commit,
            installedAt: new Date().toISOString()
          });
        }
      }

      console.log(`  + ${rec.name}`);
      installed++;
      installedNames.push(rec.name);
    } catch (error) {
      console.error(`  x ${rec.name}: ${error}`);
    }
  }

  if (installed > 0) {
    console.log(`\nInstalled ${installed} skill(s) to .claude/skills`);

    // Update CLAUDE.md
    const result = await updateClaudeMd(analysis.projectPath, 'add', installedNames);
    if (result.success && result.added.length > 0) {
      console.log('Updated CLAUDE.md with skill references.');
    }
  }
}
