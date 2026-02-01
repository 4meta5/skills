/**
 * @4meta5/workflow-enforcer
 *
 * State machine for workflow enforcement (TDD, code review, etc.)
 *
 * @example
 * ```typescript
 * import { createEnforcer, TDD_PROFILE } from '@4meta5/workflow-enforcer';
 *
 * const enforcer = createEnforcer(TDD_PROFILE);
 *
 * // Check if an intent is allowed
 * const result = enforcer.isAllowed('write_impl');
 * if (!result.allowed) {
 *   console.log('Blocked:', result.reason);
 *   // "Blocked until failing_test is satisfied"
 * }
 *
 * // Satisfy a capability
 * enforcer.transition({
 *   type: 'capability_satisfied',
 *   capability: 'failing_test',
 *   evidence: { satisfiedBy: 'test_runner', evidenceType: 'command_success' }
 * });
 *
 * // Now write_impl is allowed (in GREEN phase)
 * console.log(enforcer.isAllowed('write_impl')); // { allowed: true, ... }
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  Strictness,
  Intent,
  EvidenceType,
  CapabilityEvidence,
  Phase,
  EnforcerProfile,
  WorkflowEvent,
  EnforcerState,
  IntentCheckResult,
  Enforcer,
} from './types.js';

export { HIGH_IMPACT_INTENTS, LOW_IMPACT_INTENTS } from './types.js';

// Enforcer
export { createEnforcer } from './enforcer.js';

// Pre-built profiles
export {
  TDD_PROFILE,
  CODE_REVIEW_PROFILE,
  DOCS_FIRST_PROFILE,
  NO_WORKAROUNDS_PROFILE,
  BUILTIN_PROFILES,
  getProfile,
  listProfiles,
  matchProfile,
} from './profiles.js';

// Intent classification
export {
  classifyFile,
  classifyWriteIntent,
  classifyEditIntent,
  classifyToolIntent,
  describeIntent,
} from './intent.js';
