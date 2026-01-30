import type { ToolIntent } from '../types/index.js';

/**
 * Tool input structure for common Claude Code tools
 */
export interface ToolInput {
  tool: string;
  input?: Record<string, unknown>;
}

/**
 * Map tool names to their primary intents
 */
const TOOL_INTENT_MAP: Record<string, ToolIntent[]> = {
  // Write tools
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
 * Map a tool invocation to its intents
 */
export function mapToolToIntents(toolInput: ToolInput): ToolIntent[] {
  const { tool, input } = toolInput;

  // Get static intents for the tool
  const staticIntents = TOOL_INTENT_MAP[tool] || [];

  // For Bash, also check the command
  if (tool === 'Bash' && input?.command && typeof input.command === 'string') {
    const bashIntents = extractBashIntents(input.command);
    return [...new Set([...staticIntents, ...bashIntents])];
  }

  return staticIntents;
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
