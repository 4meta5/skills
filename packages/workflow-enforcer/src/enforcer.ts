/**
 * Workflow Enforcer Implementation
 *
 * A pure state machine for workflow enforcement.
 */

import type {
  Enforcer,
  EnforcerProfile,
  EnforcerState,
  Phase,
  WorkflowEvent,
  Intent,
  IntentCheckResult,
  CapabilityEvidence,
} from './types.js';
import { HIGH_IMPACT_INTENTS } from './types.js';

/**
 * Create initial state for an enforcer
 */
function createInitialState(profile: EnforcerProfile): EnforcerState {
  const initialPhase = profile.phases[profile.initialPhase];
  const blockedIntents = new Map<Intent, string>();

  // Block intents according to initial phase
  if (initialPhase) {
    for (const intent of initialPhase.blockedIntents) {
      blockedIntents.set(intent, `Blocked until ${profile.initialPhase} phase is complete`);
    }
  }

  return {
    profileName: profile.name,
    currentPhase: profile.initialPhase,
    satisfiedCapabilities: [],
    blockedIntents,
    history: [],
    startedAt: new Date(),
  };
}

/**
 * Get all required capabilities from a profile
 */
function getAllRequiredCapabilities(profile: EnforcerProfile): string[] {
  const capabilities = new Set<string>();
  for (const phase of Object.values(profile.phases)) {
    for (const cap of phase.provides) {
      capabilities.add(cap);
    }
  }
  return Array.from(capabilities);
}

/**
 * Find the next phase after a capability is satisfied
 */
function findNextPhase(
  profile: EnforcerProfile,
  currentPhase: string,
  satisfiedCapabilities: Set<string>
): string | null {
  const phaseNames = Object.keys(profile.phases);
  const currentIndex = phaseNames.indexOf(currentPhase);

  // Check if current phase is complete
  const current = profile.phases[currentPhase];
  const allProvided = current.provides.every(cap => satisfiedCapabilities.has(cap));

  if (!allProvided) {
    return null; // Stay in current phase
  }

  // Find next phase whose requirements are met
  for (let i = currentIndex + 1; i < phaseNames.length; i++) {
    const nextPhase = profile.phases[phaseNames[i]];
    const requirementsMet = nextPhase.requires.every(cap => satisfiedCapabilities.has(cap));
    if (requirementsMet) {
      return phaseNames[i];
    }
  }

  return null; // No valid next phase
}

/**
 * Update blocked intents based on current phase
 */
function updateBlockedIntents(
  state: EnforcerState,
  profile: EnforcerProfile
): void {
  const phase = profile.phases[state.currentPhase];
  if (!phase) return;

  state.blockedIntents.clear();

  // Block intents according to current phase
  for (const intent of phase.blockedIntents) {
    // Find what capability would unblock this intent
    const nextPhases = Object.values(profile.phases).filter(p =>
      p.allowedIntents.includes(intent)
    );

    const reason = nextPhases.length > 0
      ? `Blocked until ${nextPhases[0].provides.join(' or ')} is satisfied`
      : `Blocked in ${state.currentPhase} phase`;

    state.blockedIntents.set(intent, reason);
  }
}

/**
 * Create an enforcer instance
 */
export function createEnforcer(profile: EnforcerProfile): Enforcer {
  let state = createInitialState(profile);

  return {
    transition(event: WorkflowEvent): EnforcerState {
      // Record event in history
      state.history.push(event);

      switch (event.type) {
        case 'capability_satisfied': {
          if (!event.capability) break;

          // Check if already satisfied
          const alreadySatisfied = state.satisfiedCapabilities.some(
            e => e.capability === event.capability
          );
          if (alreadySatisfied) break;

          // Add evidence
          const evidence: CapabilityEvidence = {
            capability: event.capability,
            satisfiedAt: new Date(),
            satisfiedBy: event.evidence?.satisfiedBy || 'unknown',
            evidenceType: event.evidence?.evidenceType || 'manual',
            evidencePath: event.evidence?.evidencePath,
          };
          state.satisfiedCapabilities.push(evidence);

          // Check for phase transition
          const satisfiedSet = new Set(state.satisfiedCapabilities.map(e => e.capability));
          const nextPhase = findNextPhase(profile, state.currentPhase, satisfiedSet);

          if (nextPhase) {
            state.currentPhase = nextPhase;
            updateBlockedIntents(state, profile);
          }
          break;
        }

        case 'phase_complete': {
          if (!event.phase) break;

          // Mark all capabilities provided by this phase as satisfied
          const phase = profile.phases[event.phase];
          if (!phase) break;

          for (const cap of phase.provides) {
            const alreadySatisfied = state.satisfiedCapabilities.some(
              e => e.capability === cap
            );
            if (!alreadySatisfied) {
              const evidence: CapabilityEvidence = {
                capability: cap,
                satisfiedAt: new Date(),
                satisfiedBy: event.phase,
                evidenceType: 'manual',
              };
              state.satisfiedCapabilities.push(evidence);
            }
          }

          // Advance phase
          const satisfiedSet = new Set(state.satisfiedCapabilities.map(e => e.capability));
          const nextPhase = findNextPhase(profile, state.currentPhase, satisfiedSet);
          if (nextPhase) {
            state.currentPhase = nextPhase;
            updateBlockedIntents(state, profile);
          }
          break;
        }

        case 'reset': {
          state = createInitialState(profile);
          break;
        }
      }

      return { ...state, blockedIntents: new Map(state.blockedIntents) };
    },

    isAllowed(intent: Intent): IntentCheckResult {
      const phase = profile.phases[state.currentPhase];

      // Always allow read and run in any mode except strict on high-impact
      if (intent === 'read' || intent === 'run') {
        return { allowed: true, reason: 'Read and run are always allowed' };
      }

      // Check if explicitly allowed in current phase
      if (phase?.allowedIntents.includes(intent)) {
        return { allowed: true, reason: `Allowed in ${state.currentPhase} phase` };
      }

      // Check if blocked
      const blockReason = state.blockedIntents.get(intent);
      if (blockReason) {
        // Find required capability
        const requiredCap = this.getUnsatisfiedCapabilities()[0];

        if (profile.strictness === 'strict') {
          return {
            allowed: false,
            reason: blockReason,
            blockedBy: state.currentPhase,
            requiredCapability: requiredCap,
          };
        }

        if (profile.strictness === 'advisory') {
          // Advisory mode: block high-impact, warn on others
          if (HIGH_IMPACT_INTENTS.includes(intent)) {
            return {
              allowed: false,
              reason: `${blockReason} (high-impact intent)`,
              blockedBy: state.currentPhase,
              requiredCapability: requiredCap,
            };
          }
          return {
            allowed: true,
            reason: `Warning: ${blockReason} (allowed in advisory mode)`,
          };
        }

        // Permissive mode: allow everything
        return {
          allowed: true,
          reason: `Info: ${blockReason} (allowed in permissive mode)`,
        };
      }

      // Not explicitly blocked or allowed - default based on strictness
      if (profile.strictness === 'strict') {
        return {
          allowed: false,
          reason: `Intent ${intent} not explicitly allowed in ${state.currentPhase} phase`,
          blockedBy: state.currentPhase,
        };
      }

      return { allowed: true, reason: 'Not blocked' };
    },

    getState(): EnforcerState {
      return { ...state, blockedIntents: new Map(state.blockedIntents) };
    },

    getCurrentPhase(): Phase {
      return profile.phases[state.currentPhase];
    },

    getProfile(): EnforcerProfile {
      return profile;
    },

    getBlockedReason(intent: Intent): string | null {
      return state.blockedIntents.get(intent) || null;
    },

    getUnsatisfiedCapabilities(): string[] {
      const allRequired = getAllRequiredCapabilities(profile);
      const satisfied = new Set(state.satisfiedCapabilities.map(e => e.capability));
      return allRequired.filter(cap => !satisfied.has(cap));
    },

    isCapabilitySatisfied(capability: string): boolean {
      return state.satisfiedCapabilities.some(e => e.capability === capability);
    },

    reset(): void {
      state = createInitialState(profile);
    },
  };
}
