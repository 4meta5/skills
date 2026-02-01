/**
 * Intent classification utilities
 *
 * Classifies file operations into intents based on file paths and patterns.
 */

import type { Intent } from './types.js';

/**
 * Test file patterns (language-agnostic)
 */
const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.[jt]sx?$/,
  /_spec\.[jt]sx?$/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /.*_test\.go$/,
  /.*_test\.rs$/,
  /\.stories\.[jt]sx?$/,
  /__tests__\//,
  /tests?\//,
  /spec\//,
];

/**
 * Documentation file patterns
 */
const DOCS_PATTERNS = [
  /\.md$/i,
  /\.mdx$/i,
  /\.rst$/i,
  /\.txt$/i,
  /readme/i,
  /changelog/i,
  /license/i,
  /contributing/i,
  /docs?\//i,
  /documentation\//i,
];

/**
 * Configuration file patterns
 */
const CONFIG_PATTERNS = [
  /\.json$/,
  /\.ya?ml$/,
  /\.toml$/,
  /\.ini$/,
  /\.env$/,
  /\.config\.[jt]s$/,
  /\.config\.mjs$/,
  /tsconfig/,
  /eslint/,
  /prettier/,
  /package\.json$/,
  /Cargo\.toml$/,
  /pyproject\.toml$/,
  /go\.mod$/,
];

/**
 * Check if a file path matches any pattern in a list
 */
function matchesAny(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(filePath));
}

/**
 * Classify a file path into a category
 */
export function classifyFile(filePath: string): 'test' | 'docs' | 'config' | 'impl' {
  if (matchesAny(filePath, TEST_PATTERNS)) {
    return 'test';
  }
  if (matchesAny(filePath, DOCS_PATTERNS)) {
    return 'docs';
  }
  if (matchesAny(filePath, CONFIG_PATTERNS)) {
    return 'config';
  }
  return 'impl';
}

/**
 * Classify a write operation based on file path
 */
export function classifyWriteIntent(filePath: string): Intent {
  const category = classifyFile(filePath);
  switch (category) {
    case 'test':
      return 'write_test';
    case 'docs':
      return 'write_docs';
    case 'config':
      return 'write_config';
    default:
      return 'write_impl';
  }
}

/**
 * Classify an edit operation based on file path
 */
export function classifyEditIntent(filePath: string): Intent {
  const category = classifyFile(filePath);
  switch (category) {
    case 'test':
      return 'edit_test';
    case 'docs':
      return 'edit_docs';
    case 'config':
      return 'edit_config';
    default:
      return 'edit_impl';
  }
}

/**
 * Classify a tool call into an intent
 */
export function classifyToolIntent(
  toolName: string,
  args?: Record<string, unknown>
): Intent {
  // Normalize tool name
  const tool = toolName.toLowerCase();

  // Write operations
  if (tool === 'write' || tool === 'create' || tool === 'notebookedit') {
    const filePath = (args?.file_path || args?.path || args?.filename || '') as string;
    return classifyWriteIntent(filePath);
  }

  // Edit operations
  if (tool === 'edit' || tool === 'patch' || tool === 'replace') {
    const filePath = (args?.file_path || args?.path || args?.filename || '') as string;
    return classifyEditIntent(filePath);
  }

  // Read operations
  if (tool === 'read' || tool === 'view' || tool === 'glob' || tool === 'grep') {
    return 'read';
  }

  // Execute operations
  if (tool === 'bash' || tool === 'execute' || tool === 'run' || tool === 'shell') {
    const command = (args?.command || '') as string;

    // Check for specific commands
    if (/git\s+(commit|add\s+--all)/.test(command)) {
      return 'commit';
    }
    if (/git\s+push/.test(command)) {
      return 'push';
    }
    if (/deploy|release|publish/.test(command)) {
      return 'deploy';
    }
    if (/rm\s+-rf|delete|remove/.test(command)) {
      return 'delete';
    }

    return 'run';
  }

  // Git operations
  if (tool === 'git_commit' || tool === 'commit') {
    return 'commit';
  }
  if (tool === 'git_push' || tool === 'push') {
    return 'push';
  }

  // Default to run for unknown tools
  return 'run';
}

/**
 * Get a human-readable description of an intent
 */
export function describeIntent(intent: Intent): string {
  const descriptions: Record<Intent, string> = {
    write: 'Write file',
    write_test: 'Write test file',
    write_impl: 'Write implementation file',
    write_docs: 'Write documentation',
    write_config: 'Write configuration',
    edit: 'Edit file',
    edit_test: 'Edit test file',
    edit_impl: 'Edit implementation file',
    edit_docs: 'Edit documentation',
    edit_config: 'Edit configuration',
    commit: 'Commit changes',
    push: 'Push to remote',
    deploy: 'Deploy application',
    delete: 'Delete files',
    read: 'Read files',
    run: 'Run command',
  };

  return descriptions[intent] || intent;
}
