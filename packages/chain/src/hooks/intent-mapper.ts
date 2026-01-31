import type { ToolIntent } from '../types/index.js';

/**
 * Tool input structure for common Claude Code tools
 */
export interface ToolInput {
  tool: string;
  input?: Record<string, unknown>;
}

/**
 * File category for path-aware intent classification
 */
export type FileCategory = 'test' | 'impl' | 'docs' | 'config';

/**
 * Default patterns for test files (language-agnostic)
 * Order matters: more specific patterns should come first
 */
export const TEST_FILE_PATTERNS: RegExp[] = [
  // Test file extensions (most common)
  /\.test\.[^/]+$/i,
  /\.spec\.[^/]+$/i,
  /_test\.[^/]+$/i,
  /\.tests\.[^/]+$/i,
  // Test directories
  /(?:^|\/)tests?\//i,
  /(?:^|\/)?__tests__\//i,
  // Python test files
  /(?:^|\/)test_[^/]+$/i,
  // Go test files
  /_test\.go$/i,
  // Rust test files in tests/ directory
  /(?:^|\/)tests\/[^/]+\.rs$/i,
];

/**
 * Default patterns for documentation files
 */
export const DOCS_FILE_PATTERNS: RegExp[] = [
  // Documentation directories
  /(?:^|\/)docs?\//i,
  /(?:^|\/)documentation\//i,
  // Markdown files (but not in test dirs)
  /\.md$/i,
  /\.mdx$/i,
  // Text files
  /\.txt$/i,
  // RST (reStructuredText)
  /\.rst$/i,
  // Common doc files
  /(?:^|\/)README/i,
  /(?:^|\/)CHANGELOG/i,
  /(?:^|\/)LICENSE/i,
  /(?:^|\/)CONTRIBUTING/i,
  /(?:^|\/)AUTHORS/i,
];

/**
 * Default patterns for configuration files
 */
export const CONFIG_FILE_PATTERNS: RegExp[] = [
  // JSON configs
  /\.json$/i,
  // YAML configs
  /\.ya?ml$/i,
  // TOML configs
  /\.toml$/i,
  // INI configs
  /\.ini$/i,
  // Env files
  /\.env/i,
  // RC files
  /\.[^/]+rc$/i,
  /\.config\.[^/]+$/i,
  // Lock files (package-lock.json, pnpm-lock.yaml, yarn.lock, etc.)
  /(?:^|\/)[^/]+-lock\.[^/]+$/i,
  /(?:^|\/)lock\.[^/]+$/i,
  /\.lock$/i,
  // Specific configs
  /(?:^|\/)tsconfig/i,
  /(?:^|\/)package\.json$/i,
  /(?:^|\/)Cargo\.toml$/i,
  /(?:^|\/)pyproject\.toml$/i,
  /(?:^|\/)Makefile$/i,
  /(?:^|\/)Dockerfile$/i,
  /(?:^|\/)docker-compose/i,
];

/**
 * Classify a file path into a category
 *
 * Priority order:
 * 1. Test files (highest - most specific)
 * 2. Config files
 * 3. Docs files
 * 4. Implementation (default)
 */
export function classifyFilePath(filePath: string): FileCategory {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Check test patterns first (most specific)
  for (const pattern of TEST_FILE_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'test';
    }
  }

  // Check config patterns
  for (const pattern of CONFIG_FILE_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'config';
    }
  }

  // Check docs patterns
  for (const pattern of DOCS_FILE_PATTERNS) {
    if (pattern.test(normalized)) {
      return 'docs';
    }
  }

  // Default: implementation
  return 'impl';
}

/**
 * Map tool names to their primary intents (base, non-path-aware)
 *
 * For Write and Edit tools, these are fallbacks when no path is provided.
 * When a path is available, use getPathAwareIntent() instead.
 */
const TOOL_INTENT_MAP: Record<string, ToolIntent[]> = {
  // Write/Edit tools - base intents (path-aware intents computed dynamically)
  Write: ['write'],
  Edit: ['write'],
  NotebookEdit: ['write'],

  // Bash tool needs input inspection
  Bash: [], // Dynamic based on command

  // Read tools have no blocking intents
  Read: [],
  Glob: [],
  Grep: [],

  // Web tools have no blocking intents
  WebFetch: [],
  WebSearch: [],

  // Task tools have no blocking intents
  Task: [],
  TaskCreate: [],
  TaskUpdate: [],
  TaskList: [],
  TaskGet: [],

  // Question tools have no blocking intents
  AskUserQuestion: [],

  // Plan mode tools have no blocking intents
  EnterPlanMode: [],
  ExitPlanMode: [],
};

/**
 * Tools that support path-aware intent classification
 *
 * Note: Edit and NotebookEdit use 'write' as the base intent because
 * they're both file modifications. The distinction between Write and Edit
 * is handled by Claude Code, not by the skill chain. From a capability
 * perspective, they're equivalent operations on the filesystem.
 */
const PATH_AWARE_TOOLS: Record<string, { baseIntent: 'write' | 'edit' }> = {
  Write: { baseIntent: 'write' },
  Edit: { baseIntent: 'write' },
  NotebookEdit: { baseIntent: 'write' },
};

/**
 * Get path-aware intent for a file operation
 *
 * @param baseIntent - 'write' or 'edit'
 * @param filePath - Path to the file being written/edited
 * @returns Path-aware intent (e.g., 'write_test', 'edit_impl')
 */
export function getPathAwareIntent(
  baseIntent: 'write' | 'edit',
  filePath: string
): ToolIntent {
  const category = classifyFilePath(filePath);
  return `${baseIntent}_${category}` as ToolIntent;
}

/**
 * Patterns for detecting intents in Bash commands
 */
const BASH_COMMAND_PATTERNS: Array<{ pattern: RegExp; intent: ToolIntent }> = [
  // Git commit
  { pattern: /\bgit\s+commit\b/, intent: 'commit' },
  { pattern: /\bgit\s+add\b.*&&.*\bgit\s+commit\b/, intent: 'commit' },

  // Git push
  { pattern: /\bgit\s+push\b/, intent: 'push' },

  // Deploy commands
  { pattern: /\bnpm\s+publish\b/, intent: 'deploy' },
  { pattern: /\byarn\s+publish\b/, intent: 'deploy' },
  { pattern: /\bpnpm\s+publish\b/, intent: 'deploy' },
  { pattern: /\bdeploy\b/, intent: 'deploy' },

  // Delete commands
  { pattern: /\brm\s+-rf?\b/, intent: 'delete' },
  { pattern: /\bgit\s+branch\s+-[dD]\b/, intent: 'delete' },
  { pattern: /\bgit\s+push\s+.*--delete\b/, intent: 'delete' },

  // Write-like commands
  { pattern: /\becho\s+.*>\s/, intent: 'write' },
  { pattern: /\bcat\s+.*>\s/, intent: 'write' },
  { pattern: /\btee\s/, intent: 'write' },
  { pattern: /\bmkdir\b/, intent: 'write' },
  { pattern: /\btouch\b/, intent: 'write' },
];

/**
 * Extract intents from a Bash command
 */
export function extractBashIntents(command: string): ToolIntent[] {
  const intents = new Set<ToolIntent>();

  for (const { pattern, intent } of BASH_COMMAND_PATTERNS) {
    if (pattern.test(command)) {
      intents.add(intent);
    }
  }

  return Array.from(intents);
}

/**
 * Extract file path from tool input
 */
function extractFilePath(input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;

  // Common path field names
  const pathFields = ['path', 'file_path', 'filePath', 'file', 'filename'];

  for (const field of pathFields) {
    if (typeof input[field] === 'string' && input[field]) {
      return input[field] as string;
    }
  }

  return undefined;
}

/**
 * Map a tool invocation to its intents
 *
 * For Write and Edit tools with a path, returns path-aware intents
 * (e.g., write_test, edit_impl) in addition to the base intent.
 *
 * The base intent is always included to support rules that want to
 * block all writes regardless of file type.
 */
export function mapToolToIntents(toolInput: ToolInput): ToolIntent[] {
  const { tool, input } = toolInput;

  // For Bash, check the command for specific intents
  if (tool === 'Bash' && input?.command && typeof input.command === 'string') {
    const bashIntents = extractBashIntents(input.command);
    return bashIntents;
  }

  // Check if this is a path-aware tool
  const pathAwareConfig = PATH_AWARE_TOOLS[tool];
  if (pathAwareConfig) {
    const filePath = extractFilePath(input);
    if (filePath) {
      // Return both path-aware intent and base intent
      // This allows rules to target either level of specificity
      const pathAwareIntent = getPathAwareIntent(pathAwareConfig.baseIntent, filePath);
      return [pathAwareIntent, pathAwareConfig.baseIntent as ToolIntent];
    }
    // No path available, fall back to base intent
    return [pathAwareConfig.baseIntent as ToolIntent];
  }

  // Get static intents for other tools
  return TOOL_INTENT_MAP[tool] || [];
}

/**
 * Check if a tool invocation would be blocked by any intent
 */
export function findBlockedIntents(
  toolInput: ToolInput,
  blockedIntents: Record<string, string>
): Array<{ intent: string; reason: string }> {
  const intents = mapToolToIntents(toolInput);
  const blocked: Array<{ intent: string; reason: string }> = [];

  for (const intent of intents) {
    if (blockedIntents[intent]) {
      blocked.push({ intent, reason: blockedIntents[intent] });
    }
  }

  return blocked;
}
