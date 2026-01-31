export { CapabilityGraph, type GraphEdge, type CycleResult } from './graph.js';
export {
  resolve,
  detectConflicts,
  validateChain,
  type SkillExplanation,
  type ConflictError,
  type ResolveOptions,
} from './resolver.js';
export {
  matchProfileToPrompt,
  calculateMatchScore,
  type MatchResult,
} from './profile-matcher.js';
