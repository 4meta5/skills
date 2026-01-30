import { mkdir, readFile, writeFile, unlink, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { SessionState, type CapabilityEvidence, type SkillSpec } from '../types/index.js';

/**
 * Result of getCurrentSkill - the skill providing the next unsatisfied capability
 */
export interface CurrentSkillResult {
  skill: SkillSpec;
  capability: string;
}

/**
 * Default directory for session state files
 */
export function getStateDir(cwd: string = process.cwd()): string {
  return join(cwd, '.claude', 'chain_state');
}

/**
 * Get the current session ID from environment or file
 */
export async function getCurrentSessionId(cwd: string = process.cwd()): Promise<string | null> {
  // First check environment variable
  if (process.env.CLAUDE_SESSION_ID) {
    return process.env.CLAUDE_SESSION_ID;
  }

  // Fall back to current_session file
  const stateDir = getStateDir(cwd);
  const currentSessionPath = join(stateDir, 'current_session');

  try {
    const content = await readFile(currentSessionPath, 'utf-8');
    return content.trim();
  } catch {
    return null;
  }
}

/**
 * Set the current session ID
 */
export async function setCurrentSessionId(sessionId: string, cwd: string = process.cwd()): Promise<void> {
  const stateDir = getStateDir(cwd);
  await mkdir(stateDir, { recursive: true });
  const currentSessionPath = join(stateDir, 'current_session');
  await writeFile(currentSessionPath, sessionId, 'utf-8');
}

/**
 * Generate a new session ID
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * StateManager handles persistence of session state
 */
export class StateManager {
  private cwd: string;
  private stateDir: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
    this.stateDir = getStateDir(cwd);
  }

  /**
   * Get path for a session state file
   */
  private getStatePath(sessionId: string): string {
    return join(this.stateDir, `${sessionId}.json`);
  }

  /**
   * Create a new session with the given state
   */
  async create(state: SessionState): Promise<void> {
    await mkdir(this.stateDir, { recursive: true });
    const statePath = this.getStatePath(state.session_id);
    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
    await setCurrentSessionId(state.session_id, this.cwd);
  }

  /**
   * Load session state by ID
   */
  async load(sessionId: string): Promise<SessionState | null> {
    const statePath = this.getStatePath(sessionId);

    try {
      const content = await readFile(statePath, 'utf-8');
      const parsed = JSON.parse(content);
      return SessionState.parse(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Load the current session state
   */
  async loadCurrent(): Promise<SessionState | null> {
    const sessionId = await getCurrentSessionId(this.cwd);
    if (!sessionId) {
      return null;
    }
    return this.load(sessionId);
  }

  /**
   * Save session state
   */
  async save(state: SessionState): Promise<void> {
    await mkdir(this.stateDir, { recursive: true });
    const statePath = this.getStatePath(state.session_id);
    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Clear a session by ID
   */
  async clear(sessionId: string): Promise<boolean> {
    const statePath = this.getStatePath(sessionId);

    try {
      await unlink(statePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear the current session
   */
  async clearCurrent(): Promise<boolean> {
    const sessionId = await getCurrentSessionId(this.cwd);
    if (!sessionId) {
      return false;
    }

    const cleared = await this.clear(sessionId);

    // Also remove current_session file
    try {
      await unlink(join(this.stateDir, 'current_session'));
    } catch {
      // Ignore if doesn't exist
    }

    return cleared;
  }

  /**
   * List all session IDs
   */
  async list(): Promise<string[]> {
    try {
      const files = await readdir(this.stateDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  /**
   * Mark a capability as satisfied
   */
  async satisfyCapability(
    sessionId: string,
    evidence: CapabilityEvidence
  ): Promise<boolean> {
    const state = await this.load(sessionId);
    if (!state) {
      return false;
    }

    // Check if already satisfied
    const existing = state.capabilities_satisfied.find(
      e => e.capability === evidence.capability
    );
    if (existing) {
      return true; // Already satisfied
    }

    // Add evidence
    state.capabilities_satisfied.push(evidence);

    // Update blocked intents based on new capability
    // This is handled by the hook enforcement layer

    await this.save(state);
    return true;
  }

  /**
   * Check if a capability is satisfied
   */
  async isCapabilitySatisfied(sessionId: string, capability: string): Promise<boolean> {
    const state = await this.load(sessionId);
    if (!state) {
      return false;
    }

    return state.capabilities_satisfied.some(e => e.capability === capability);
  }

  /**
   * Get unsatisfied capabilities for a session
   */
  async getUnsatisfiedCapabilities(sessionId: string): Promise<string[]> {
    const state = await this.load(sessionId);
    if (!state) {
      return [];
    }

    const satisfied = new Set(state.capabilities_satisfied.map(e => e.capability));
    return state.capabilities_required.filter(cap => !satisfied.has(cap));
  }

  /**
   * Get the current skill that provides the next unsatisfied capability.
   * Returns null if session doesn't exist or all capabilities are satisfied.
   */
  async getCurrentSkill(
    sessionId: string,
    skills: SkillSpec[]
  ): Promise<CurrentSkillResult | null> {
    const state = await this.load(sessionId);
    if (!state) {
      return null;
    }

    const satisfied = new Set(state.capabilities_satisfied.map(e => e.capability));

    // Find the first unsatisfied capability in required order
    for (const capability of state.capabilities_required) {
      if (!satisfied.has(capability)) {
        // Find the skill in the chain that provides this capability
        for (const skillName of state.chain) {
          const skill = skills.find(s => s.name === skillName);
          if (skill && skill.provides.includes(capability)) {
            return { skill, capability };
          }
        }
      }
    }

    return null;
  }
}
