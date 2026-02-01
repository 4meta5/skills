/**
 * Types for the Workflow Enforcer
 *
 * A pure state machine for workflow enforcement.
 * No external dependencies, no file I/O.
 */

/**
 * Strictness levels for enforcement
 * - strict: Block all denied intents until capabilities satisfied
 * - advisory: Log warnings but allow actions
 * - permissive: No blocking, only tracking
 */
export type Strictness = 'strict' | 'advisory' | 'permissive';

/**
 * Intent classification for actions
 */
export type Intent =
  | 'write'
  | 'write_test'
  | 'write_impl'
  | 'write_docs'
  | 'write_config'
  | 'edit'
  | 'edit_test'
  | 'edit_impl'
  | 'edit_docs'
  | 'edit_config'
  | 'commit'
  | 'push'
  | 'deploy'
  | 'delete'
  | 'read'
  | 'run';

/**
 * Intents that are high-impact (blocked in strict mode)
 */
export const HIGH_IMPACT_INTENTS: Intent[] = [
  'write_impl',
  'commit',
  'push',
  'deploy',
  'delete',
];

/**
 * Intents that are low-impact (allowed in advisory mode)
 */
export const LOW_IMPACT_INTENTS: Intent[] = [
  'write_test',
  'write_docs',
  'write_config',
  'read',
  'run',
];

/**
 * Evidence type for capability satisfaction
 */
export type EvidenceType = 'file_exists' | 'marker_found' | 'command_success' | 'manual';

/**
 * Evidence that a capability has been satisfied
 */
export interface CapabilityEvidence {
  capability: string;
  satisfiedAt: Date;
  satisfiedBy: string;
  evidenceType: EvidenceType;
  evidencePath?: string;
}

/**
 * Phase in a workflow
 */
export interface Phase {
  /** Unique phase identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Capabilities this phase provides when completed */
  provides: string[];
  /** Capabilities required to enter this phase */
  requires: string[];
  /** Intents blocked until this phase is complete */
  blockedIntents: Intent[];
  /** Intents allowed in this phase */
  allowedIntents: Intent[];
}

/**
 * Workflow profile definition
 */
export interface EnforcerProfile {
  /** Unique profile identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Phases in order */
  phases: Record<string, Phase>;
  /** Initial phase name */
  initialPhase: string;
  /** Strictness level */
  strictness: Strictness;
  /** Patterns to match user prompts */
  matchPatterns?: string[];
}

/**
 * Event that triggers state transitions
 */
export interface WorkflowEvent {
  type: 'capability_satisfied' | 'phase_complete' | 'intent_attempted' | 'reset';
  capability?: string;
  phase?: string;
  intent?: Intent;
  evidence?: Partial<CapabilityEvidence>;
}

/**
 * Current state of the enforcer
 */
export interface EnforcerState {
  /** Current profile */
  profileName: string;
  /** Current phase */
  currentPhase: string;
  /** Satisfied capabilities */
  satisfiedCapabilities: CapabilityEvidence[];
  /** Blocked intents with reasons */
  blockedIntents: Map<Intent, string>;
  /** History of transitions */
  history: WorkflowEvent[];
  /** Started at */
  startedAt: Date;
}

/**
 * Result of checking if an intent is allowed
 */
export interface IntentCheckResult {
  allowed: boolean;
  reason: string;
  blockedBy?: string;
  requiredCapability?: string;
}

/**
 * Enforcer interface
 */
export interface Enforcer {
  /**
   * Process an event and update state
   */
  transition(event: WorkflowEvent): EnforcerState;

  /**
   * Check if an intent is allowed
   */
  isAllowed(intent: Intent): IntentCheckResult;

  /**
   * Get current state
   */
  getState(): EnforcerState;

  /**
   * Get current phase
   */
  getCurrentPhase(): Phase;

  /**
   * Get the profile
   */
  getProfile(): EnforcerProfile;

  /**
   * Get blocked reason for an intent
   */
  getBlockedReason(intent: Intent): string | null;

  /**
   * Get unsatisfied capabilities
   */
  getUnsatisfiedCapabilities(): string[];

  /**
   * Check if a capability is satisfied
   */
  isCapabilitySatisfied(capability: string): boolean;

  /**
   * Reset to initial state
   */
  reset(): void;
}
