/**
 * Session state commands for unified session access
 *
 * Provides:
 * - explainSession: Why is a tool blocked?
 * - getSessionState: Full session state for programmatic access
 */

import { StateManager } from '../../session/state-manager.js';
import type { SessionState } from '../../types/index.js';

export interface BlockedIntent {
  intent: string;
  reason: string;
  short_reason: string;
}

export interface SessionExplanation {
  session_id: string;
  profile_id: string;
  status: 'blocked' | 'unblocked' | 'complete';
  current_skill: string | null;
  next_capability: string | null;
  blocked: BlockedIntent[];
  progress: {
    satisfied: number;
    required: number;
    percent: number;
  };
}

/**
 * Extract a short reason from a longer explanation.
 *
 * Strategies:
 * 1. If reason contains parentheses, extract content: "Do X (PHASE Y)" → "PHASE Y"
 * 2. Otherwise, take first ~30 chars up to a natural break
 */
export function extractShortReason(reason: string): string {
  if (!reason) return '';

  // Strategy 1: Extract parenthetical content
  const parenMatch = reason.match(/\(([^)]+)\)/);
  if (parenMatch) {
    return parenMatch[1];
  }

  // Strategy 2: Truncate at natural break (period, comma, or word boundary)
  if (reason.length <= 30) {
    return reason;
  }

  // Find a good break point
  const breakPoints = [
    reason.indexOf('.'),
    reason.indexOf(','),
    reason.indexOf(' before '),
    reason.indexOf(' after '),
    reason.indexOf(' until '),
  ].filter((i) => i > 0 && i < 40);

  if (breakPoints.length > 0) {
    const breakAt = Math.min(...breakPoints);
    return reason.slice(0, breakAt).trim();
  }

  // Fallback: truncate at word boundary
  const truncated = reason.slice(0, 30);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 15 ? truncated.slice(0, lastSpace) : truncated;
}

/**
 * Explain why tools are blocked in a session.
 *
 * Returns structured explanation with:
 * - List of blocked intents with short reasons
 * - Current skill and next capability needed
 * - Progress through the workflow
 */
export async function explainSession(
  sessionId: string,
  cwd: string = process.cwd()
): Promise<SessionExplanation | null> {
  const stateManager = new StateManager(cwd);
  const state = await stateManager.load(sessionId);

  if (!state) {
    return null;
  }

  const blocked: BlockedIntent[] = Object.entries(state.blocked_intents).map(
    ([intent, reason]) => ({
      intent,
      reason,
      short_reason: extractShortReason(reason),
    })
  );

  // Determine current skill and next capability
  const satisfiedCaps = new Set(
    state.capabilities_satisfied.map((c) => c.capability)
  );
  const nextCap = state.capabilities_required.find(
    (cap) => !satisfiedCaps.has(cap)
  );

  // Find which skill is current based on the chain
  // Walk through chain skills and find the first one that has unsatisfied capabilities
  let currentSkill: string | null = null;
  if (nextCap && state.chain.length > 0) {
    // Use current_skill_index if available, otherwise compute from chain
    // The chain is ordered, so find the first skill with work remaining
    // For now, use current_skill_index as the source of truth
    currentSkill = state.chain[state.current_skill_index] ?? state.chain[0];
  }

  const satisfied = state.capabilities_satisfied.length;
  const required = state.capabilities_required.length;
  const percent = required > 0 ? Math.round((satisfied / required) * 100) : 100;

  let status: 'blocked' | 'unblocked' | 'complete';
  if (satisfied >= required) {
    status = 'complete';
  } else if (blocked.length > 0) {
    status = 'blocked';
  } else {
    status = 'unblocked';
  }

  return {
    session_id: state.session_id,
    profile_id: state.profile_id,
    status,
    current_skill: currentSkill,
    next_capability: nextCap ?? null,
    blocked,
    progress: {
      satisfied,
      required,
      percent,
    },
  };
}

/**
 * Get the full session state for programmatic access.
 *
 * Returns the raw SessionState object, or null if not found.
 */
export async function getSessionState(
  sessionId: string,
  cwd: string = process.cwd()
): Promise<SessionState | null> {
  const stateManager = new StateManager(cwd);
  return stateManager.load(sessionId);
}

/**
 * CLI command handler for `chain explain --session <id>`
 */
export async function explainCommand(options: {
  session?: string;
  cwd?: string;
  json?: boolean;
}): Promise<void> {
  const sessionId = options.session || 'default';
  const cwd = options.cwd || process.cwd();

  const explanation = await explainSession(sessionId, cwd);

  if (!explanation) {
    console.error(`Session not found: ${sessionId}`);
    process.exitCode = 1;
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(explanation, null, 2));
    return;
  }

  // Human-readable output
  console.log(`Session: ${explanation.session_id}`);
  console.log(`Profile: ${explanation.profile_id}`);
  console.log(`Status: ${explanation.status.toUpperCase()}`);
  console.log(
    `Progress: ${explanation.progress.satisfied}/${explanation.progress.required} (${explanation.progress.percent}%)`
  );

  if (explanation.current_skill) {
    console.log(`\nCurrent skill: ${explanation.current_skill}`);
  }
  if (explanation.next_capability) {
    console.log(`Next capability needed: ${explanation.next_capability}`);
  }

  if (explanation.blocked.length > 0) {
    console.log('\nBlocked intents:');
    for (const block of explanation.blocked) {
      console.log(`  - ${block.intent}: ${block.short_reason}`);
    }
  }
}

/**
 * CLI command handler for `chain get-state --session <id>`
 */
export async function getStateCommand(options: {
  session?: string;
  cwd?: string;
}): Promise<void> {
  const sessionId = options.session || 'default';
  const cwd = options.cwd || process.cwd();

  const state = await getSessionState(sessionId, cwd);

  if (!state) {
    console.error(`Session not found: ${sessionId}`);
    process.exitCode = 1;
    return;
  }

  // Always JSON output for programmatic use
  console.log(JSON.stringify(state, null, 2));
}
