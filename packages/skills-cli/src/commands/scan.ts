import { checkbox, confirm } from '@inquirer/prompts';
import { createSkillsLibrary } from '@anthropic/skills-library';
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

interface ScanOptions {
  json?: boolean;
  install?: boolean;
  all?: boolean;
  filter?: string;
  minConfidence?: string;
}

export async function scanCommand(options: ScanOptions = {}): Promise<void> {
  const projectPath = process.cwd();

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
    console.log('  skills scan --install     # Interactive selection');
    console.log('  skills scan --all         # Install all high confidence');
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
    tags: rec.tags
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
 * Display skill recommendations
 */
function displayRecommendations(matchResult: MatchResult, options: ScanOptions): void {
  console.log('Recommended Skills:\n');

  const minConfidence = parseConfidence(options.minConfidence);

  if (matchResult.high.length > 0 && confidenceAtLeast(minConfidence, 'high')) {
    console.log('  HIGH CONFIDENCE');
    for (const rec of matchResult.high) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      displayRecommendation(rec);
    }
    console.log();
  }

  if (matchResult.medium.length > 0 && confidenceAtLeast(minConfidence, 'medium')) {
    console.log('  MEDIUM CONFIDENCE');
    for (const rec of matchResult.medium) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      displayRecommendation(rec);
    }
    console.log();
  }

  if (matchResult.low.length > 0 && confidenceAtLeast(minConfidence, 'low')) {
    console.log('  LOW CONFIDENCE');
    for (const rec of matchResult.low) {
      if (options.filter && !matchesFilter(rec, options.filter)) continue;
      displayRecommendation(rec);
    }
    console.log();
  }
}

function displayRecommendation(rec: SkillRecommendation): void {
  const sourceInfo = rec.sourceName ? ` (${rec.sourceName})` : ' (bundled)';
  console.log(`  + ${rec.name}${sourceInfo}`);
  console.log(`    ${rec.reason}`);
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

  const shouldProceed = await confirm({
    message: `Install ${toInstall.length} skill(s)?`,
    default: true
  });

  if (!shouldProceed) {
    console.log('Installation cancelled.');
    return;
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
  const targetDir = join(process.cwd(), '.claude', 'skills');
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
        // Register curated source if not already registered
        const existingSource = await getSource(rec.sourceName);
        if (!existingSource) {
          const curatedSource = getCuratedSource(rec.sourceName);
          if (curatedSource) {
            console.log(`  Registering source: ${rec.sourceName}`);
            await addSource(curatedSource.source);
            await cloneOrUpdateSource(curatedSource.source);
          }
        }

        // Install skill from source
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
    try {
      await library.extendProject(installedNames);
      console.log('Updated CLAUDE.md with skill references.');
    } catch {
      // May fail if skills weren't found via library
    }
  }
}
