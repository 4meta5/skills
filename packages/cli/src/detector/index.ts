import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';
import { parse as parseToml } from 'smol-toml';
import type {
  ProjectAnalysis,
  DetectionContext,
  PackageJson,
  CargoToml,
  PyProjectToml
} from './types.js';
import { detectLanguages } from './language.js';
import { detectFrameworks } from './framework.js';
import { detectDeployment } from './deployment.js';
import { detectTesting } from './testing.js';
import { detectDatabases } from './database.js';
import { detectComposites } from './composites.js';

// Re-export types
export * from './types.js';

/**
 * Known config files to look for
 */
const CONFIG_FILES = [
  'package.json',
  'tsconfig.json',
  'Cargo.toml',
  'pyproject.toml',
  'requirements.txt',
  'setup.py',
  'go.mod',
  'wrangler.toml',
  'wrangler.json',
  'cdk.json',
  'sam.yaml',
  'samconfig.toml',
  'template.yaml',
  'vercel.json',
  'netlify.toml',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.js',
  'jest.config.ts',
  'jest.config.mjs',
  'playwright.config.ts',
  'playwright.config.js',
  'cypress.config.ts',
  'cypress.config.js',
  'pytest.ini',
  'drizzle.config.ts',
  'drizzle.config.js',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production'
];

/**
 * Directories to check for config files
 */
const CONFIG_DIRS = [
  'prisma'
];

/**
 * Read and parse package.json if it exists
 */
async function readPackageJson(projectPath: string): Promise<PackageJson | undefined> {
  try {
    const content = await readFile(join(projectPath, 'package.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

/**
 * Read and parse Cargo.toml if it exists
 */
async function readCargoToml(projectPath: string): Promise<CargoToml | undefined> {
  try {
    const content = await readFile(join(projectPath, 'Cargo.toml'), 'utf-8');
    return parseToml(content) as CargoToml;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse wrangler.toml if it exists
 */
async function readWranglerToml(projectPath: string): Promise<Record<string, unknown> | undefined> {
  try {
    const content = await readFile(join(projectPath, 'wrangler.toml'), 'utf-8');
    return parseToml(content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Read and parse pyproject.toml if it exists
 */
async function readPyProjectToml(projectPath: string): Promise<PyProjectToml | undefined> {
  try {
    const content = await readFile(join(projectPath, 'pyproject.toml'), 'utf-8');
    return parseYaml(content);
  } catch {
    return undefined;
  }
}

/**
 * Read environment variables from .env files
 */
async function readEnvVars(projectPath: string): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};
  const envFiles = ['.env', '.env.local', '.env.development'];

  for (const envFile of envFiles) {
    try {
      const content = await readFile(join(projectPath, envFile), 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          envVars[key] = value;
        }
      }
    } catch {
      // File doesn't exist
    }
  }

  return envVars;
}

/**
 * Find config files in the project
 */
async function findConfigFiles(projectPath: string): Promise<string[]> {
  const found: string[] = [];

  // Check root level files
  for (const file of CONFIG_FILES) {
    try {
      await stat(join(projectPath, file));
      found.push(file);
    } catch {
      // File doesn't exist
    }
  }

  // Check config directories
  for (const dir of CONFIG_DIRS) {
    try {
      const dirPath = join(projectPath, dir);
      const entries = await readdir(dirPath);
      for (const entry of entries) {
        if (entry.endsWith('.prisma')) {
          found.push(join(dir, entry));
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  return found;
}

/**
 * Find existing skills in the project
 */
async function findExistingSkills(projectPath: string): Promise<string[]> {
  const skillsDir = join(projectPath, '.claude', 'skills');
  const skills: string[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Check if it has a SKILL.md
        try {
          await stat(join(skillsDir, entry.name, 'SKILL.md'));
          skills.push(entry.name);
        } catch {
          // Not a valid skill directory
        }
      }
    }
  } catch {
    // Skills directory doesn't exist
  }

  return skills;
}

/**
 * Find workspace paths from npm/yarn/pnpm workspace configuration
 */
async function findWorkspaces(projectPath: string): Promise<string[]> {
  const workspaces: string[] = [];

  // Check npm/yarn workspaces in package.json
  const pkg = await readPackageJson(projectPath);
  if (pkg?.workspaces) {
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages || [];

    for (const pattern of patterns) {
      const matches = await expandWorkspaceGlob(projectPath, pattern);
      workspaces.push(...matches);
    }
  }

  // Check pnpm-workspace.yaml
  try {
    const pnpmWorkspaceContent = await readFile(join(projectPath, 'pnpm-workspace.yaml'), 'utf-8');
    const pnpmWorkspace = parseYaml(pnpmWorkspaceContent) as { packages?: string[] };
    if (pnpmWorkspace?.packages) {
      for (const pattern of pnpmWorkspace.packages) {
        const matches = await expandWorkspaceGlob(projectPath, pattern);
        workspaces.push(...matches);
      }
    }
  } catch {
    // pnpm-workspace.yaml doesn't exist
  }

  // Check lerna.json
  try {
    const lernaContent = await readFile(join(projectPath, 'lerna.json'), 'utf-8');
    const lerna = JSON.parse(lernaContent) as { packages?: string[] };
    if (lerna?.packages) {
      for (const pattern of lerna.packages) {
        const matches = await expandWorkspaceGlob(projectPath, pattern);
        workspaces.push(...matches);
      }
    }
  } catch {
    // lerna.json doesn't exist
  }

  // Check common project subdirectories that aren't JS workspaces
  // These often contain separate services (Rust, Go, Python backends)
  const COMMON_PROJECT_SUBDIRS = [
    'backend',
    'api',
    'server',
    'core',
    'services',
    'functions',
    'lambda',
    'workers'
  ];

  for (const subdir of COMMON_PROJECT_SUBDIRS) {
    // Skip if already included in workspaces
    if (workspaces.includes(subdir)) continue;

    const subdirPath = join(projectPath, subdir);
    try {
      const s = await stat(subdirPath);
      if (!s.isDirectory()) continue;

      // Check if this subdirectory has its own project config
      const hasCargoToml = await stat(join(subdirPath, 'Cargo.toml')).then(() => true).catch(() => false);
      const hasGoMod = await stat(join(subdirPath, 'go.mod')).then(() => true).catch(() => false);
      const hasPyProject = await stat(join(subdirPath, 'pyproject.toml')).then(() => true).catch(() => false);
      const hasPackageJson = await stat(join(subdirPath, 'package.json')).then(() => true).catch(() => false);

      if (hasCargoToml || hasGoMod || hasPyProject || hasPackageJson) {
        workspaces.push(subdir);
      }
    } catch {
      // Subdirectory doesn't exist
    }
  }

  // Deduplicate
  return [...new Set(workspaces)];
}

/**
 * Expand glob patterns like "packages/*" to actual directories
 */
async function expandWorkspaceGlob(basePath: string, pattern: string): Promise<string[]> {
  // Handle patterns like "packages/*", "apps/*"
  if (pattern.endsWith('/*')) {
    const dir = pattern.slice(0, -2);
    const fullDir = join(basePath, dir);
    try {
      const entries = await readdir(fullDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => join(dir, e.name));
    } catch {
      return [];
    }
  }

  // Handle "packages/**" pattern (recursive, but we'll just go one level deep for performance)
  if (pattern.endsWith('/**')) {
    const dir = pattern.slice(0, -3);
    const fullDir = join(basePath, dir);
    try {
      const entries = await readdir(fullDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => join(dir, e.name));
    } catch {
      return [];
    }
  }

  // Direct path (no glob)
  try {
    const fullPath = join(basePath, pattern);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      return [pattern];
    }
  } catch {
    // Pattern doesn't match a directory
  }

  return [];
}

/**
 * Analyze a single path and return partial analysis
 */
async function analyzeSinglePath(projectPath: string): Promise<ProjectAnalysis> {
  const [
    packageJson,
    cargoToml,
    pyProjectToml,
    envVars,
    configFiles,
    existingSkills
  ] = await Promise.all([
    readPackageJson(projectPath),
    readCargoToml(projectPath),
    readPyProjectToml(projectPath),
    readEnvVars(projectPath),
    findConfigFiles(projectPath),
    findExistingSkills(projectPath)
  ]);

  const wranglerToml = configFiles.includes('wrangler.toml')
    ? await readWranglerToml(projectPath)
    : undefined;

  const ctx: DetectionContext = {
    projectPath,
    packageJson,
    cargoToml,
    pyProjectToml,
    envVars,
    configFiles,
    wranglerToml
  };

  const [languages, frameworks, deployment, testing, databases] = await Promise.all([
    detectLanguages(ctx),
    detectFrameworks(ctx),
    detectDeployment(ctx),
    detectTesting(ctx),
    detectDatabases(ctx)
  ]);

  const tagSet = new Set<string>();
  for (const tech of [
    ...languages,
    ...frameworks,
    ...deployment,
    ...testing,
    ...databases
  ]) {
    for (const tag of tech.tags) {
      tagSet.add(tag.toLowerCase());
    }
  }

  deployment.push(...detectComposites(ctx, tagSet));

  return {
    languages,
    frameworks,
    deployment,
    testing,
    databases,
    existingSkills,
    projectPath
  };
}

/**
 * Merge multiple analysis results with deduplication
 */
function mergeAnalysisResults(results: ProjectAnalysis[], rootPath: string, workspaces: string[]): ProjectAnalysis {
  const seen = new Set<string>();
  const merged: ProjectAnalysis = {
    languages: [],
    frameworks: [],
    deployment: [],
    testing: [],
    databases: [],
    existingSkills: [],
    projectPath: rootPath,
    workspaces: workspaces.length > 0 ? workspaces : undefined
  };

  function addTech(arr: typeof merged.languages, tech: typeof arr[0]) {
    const key = `${tech.name}-${tech.version || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      arr.push(tech);
    }
  }

  for (const result of results) {
    for (const tech of result.languages) {
      addTech(merged.languages, tech);
    }
    for (const tech of result.frameworks) {
      addTech(merged.frameworks, tech);
    }
    for (const tech of result.deployment) {
      addTech(merged.deployment, tech);
    }
    for (const tech of result.testing) {
      addTech(merged.testing, tech);
    }
    for (const tech of result.databases) {
      addTech(merged.databases, tech);
    }
    for (const skill of result.existingSkills) {
      if (!merged.existingSkills.includes(skill)) {
        merged.existingSkills.push(skill);
      }
    }
  }

  return merged;
}

/**
 * Analyze a project and detect its technology stack
 */
export async function analyzeProject(projectPath: string = process.cwd()): Promise<ProjectAnalysis> {
  // Find workspaces first
  const workspaces = await findWorkspaces(projectPath);

  // Analyze root + all workspaces
  const pathsToAnalyze = [projectPath, ...workspaces.map(w => join(projectPath, w))];

  // Run detection on all paths in parallel and merge results
  const allResults = await Promise.all(pathsToAnalyze.map(analyzeSinglePath));

  return mergeAnalysisResults(allResults, projectPath, workspaces);
}

/**
 * Get all detected technologies as a flat list
 */
export function getAllTechnologies(analysis: ProjectAnalysis): import('./types.js').DetectedTechnology[] {
  return [
    ...analysis.languages,
    ...analysis.frameworks,
    ...analysis.deployment,
    ...analysis.testing,
    ...analysis.databases
  ];
}

/**
 * Get all unique tags from detected technologies
 */
export function getAllTags(analysis: ProjectAnalysis): string[] {
  const tags = new Set<string>();

  for (const tech of getAllTechnologies(analysis)) {
    for (const tag of tech.tags) {
      tags.add(tag);
    }
  }

  return Array.from(tags);
}
