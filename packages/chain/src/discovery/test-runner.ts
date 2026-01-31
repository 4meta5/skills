/**
 * Polyglot Test Runner Discovery
 *
 * Detects test frameworks in a project by looking for config files,
 * then returns the appropriate test command and file patterns.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface TestRunner {
  /** Runner identifier (cargo, pytest, vitest, etc.) */
  name: string;
  /** Command to run tests */
  command: string;
  /** Glob patterns for test files */
  testPatterns: string[];
  /** Detection confidence (0-1) */
  confidence: number;
}

export const SUPPORTED_RUNNERS = [
  'cargo',
  'go',
  'pytest',
  'vitest',
  'jest',
  'mocha',
  'npm',
] as const;

export type SupportedRunner = (typeof SUPPORTED_RUNNERS)[number];

interface DetectorConfig {
  name: SupportedRunner;
  /** Files to check for existence */
  configFiles: string[];
  /** Check content of files for patterns */
  contentChecks?: {
    file: string;
    pattern: RegExp;
  }[];
  /** Default command */
  command: string;
  /** Command variant based on content */
  commandVariants?: {
    contentPattern: RegExp;
    file: string;
    command: string;
  }[];
  /** Default test patterns */
  testPatterns: string[];
  /** Base confidence for config file detection */
  confidence: number;
}

const DETECTORS: DetectorConfig[] = [
  // Rust/Cargo
  {
    name: 'cargo',
    configFiles: ['Cargo.toml'],
    command: 'cargo test',
    commandVariants: [
      {
        file: 'Cargo.toml',
        contentPattern: /\[workspace\]/,
        command: 'cargo test --workspace',
      },
    ],
    testPatterns: ['**/tests/*.rs', '**/*_test.rs', '**/src/**/*.rs'],
    confidence: 0.95,
  },

  // Go
  {
    name: 'go',
    configFiles: ['go.mod'],
    command: 'go test ./...',
    testPatterns: ['**/*_test.go'],
    confidence: 0.95,
  },

  // Python/pytest
  {
    name: 'pytest',
    configFiles: ['pytest.ini', 'pyproject.toml', 'setup.cfg', 'tox.ini'],
    contentChecks: [
      { file: 'pyproject.toml', pattern: /\[tool\.pytest/ },
      { file: 'setup.cfg', pattern: /\[tool:pytest\]/ },
      { file: 'tox.ini', pattern: /\[pytest\]/ },
    ],
    command: 'pytest',
    testPatterns: ['**/test_*.py', '**/*_test.py', '**/tests/**/*.py'],
    confidence: 0.9,
  },

  // Vitest (check before Jest - it's more specific)
  {
    name: 'vitest',
    configFiles: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts'],
    contentChecks: [
      { file: 'vite.config.ts', pattern: /test\s*:/ },
      { file: 'vite.config.js', pattern: /test\s*:/ },
      { file: 'vite.config.mts', pattern: /test\s*:/ },
    ],
    command: 'npx vitest run',
    testPatterns: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.test.js',
      '**/*.test.jsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.spec.js',
      '**/*.spec.jsx',
    ],
    confidence: 0.9,
  },

  // Jest
  {
    name: 'jest',
    configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs'],
    contentChecks: [{ file: 'package.json', pattern: /"jest"\s*:/ }],
    command: 'npx jest',
    testPatterns: [
      '**/__tests__/**/*.[jt]s?(x)',
      '**/*.test.[jt]s?(x)',
      '**/*.spec.[jt]s?(x)',
    ],
    confidence: 0.85,
  },

  // Mocha
  {
    name: 'mocha',
    configFiles: ['.mocharc.json', '.mocharc.js', '.mocharc.yaml', '.mocharc.yml'],
    command: 'npx mocha',
    testPatterns: ['test/**/*.js', 'test/**/*.ts'],
    confidence: 0.85,
  },
];

/**
 * Detect the primary test runner for a project
 */
export async function detectTestRunner(
  projectRoot: string
): Promise<TestRunner | null> {
  const runners = await detectAllTestRunners(projectRoot);
  return runners.length > 0 ? runners[0] : null;
}

/**
 * Detect all test runners in a project, sorted by confidence
 */
export async function detectAllTestRunners(
  projectRoot: string
): Promise<TestRunner[]> {
  const detected: TestRunner[] = [];

  for (const detector of DETECTORS) {
    const result = checkDetector(projectRoot, detector);
    if (result) {
      detected.push(result);
    }
  }

  // Check npm fallback if no explicit runners found
  if (detected.length === 0) {
    const npmFallback = checkNpmFallback(projectRoot);
    if (npmFallback) {
      detected.push(npmFallback);
    }
  }

  // Sort by confidence (highest first)
  return detected.sort((a, b) => b.confidence - a.confidence);
}

function checkDetector(
  projectRoot: string,
  detector: DetectorConfig
): TestRunner | null {
  // Check for config files
  for (const configFile of detector.configFiles) {
    const filePath = join(projectRoot, configFile);
    if (existsSync(filePath)) {
      return buildRunner(projectRoot, detector, filePath);
    }
  }

  // Check content patterns
  if (detector.contentChecks) {
    for (const check of detector.contentChecks) {
      const filePath = join(projectRoot, check.file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          if (check.pattern.test(content)) {
            // Slightly lower confidence for content-based detection
            return buildRunner(projectRoot, detector, filePath, -0.05);
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  return null;
}

function buildRunner(
  projectRoot: string,
  detector: DetectorConfig,
  detectedFile: string,
  confidenceAdjust: number = 0
): TestRunner {
  let command = detector.command;

  // Check for command variants
  if (detector.commandVariants) {
    for (const variant of detector.commandVariants) {
      const filePath = join(projectRoot, variant.file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          if (variant.contentPattern.test(content)) {
            command = variant.command;
            break;
          }
        } catch {
          // Ignore read errors
        }
      }
    }
  }

  return {
    name: detector.name,
    command,
    testPatterns: detector.testPatterns,
    confidence: Math.max(0, Math.min(1, detector.confidence + confidenceAdjust)),
  };
}

function checkNpmFallback(projectRoot: string): TestRunner | null {
  const packageJsonPath = join(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const content = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    if (pkg.scripts?.test) {
      return {
        name: 'npm',
        command: 'npm test',
        testPatterns: [
          '**/*.test.js',
          '**/*.test.ts',
          '**/*.spec.js',
          '**/*.spec.ts',
          '**/__tests__/**/*',
        ],
        confidence: 0.5, // Low confidence - just a fallback
      };
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}
