/**
 * Hooks Module
 *
 * Shell hooks for Claude response validation and feedback loops.
 */

export {
  runFeedbackLoop,
  feedbackLoopHook,
  DEFAULT_FEEDBACK_LOOP_OPTIONS,
  type FeedbackLoopOptions,
  type FeedbackLoopResult,
} from './feedback-loop.js';

export {
  loadSkillsForEvaluation,
  generateEvaluationPrompt,
  getCachedSkills,
  clearSkillsCache,
  type DynamicSkillConfig,
  type SkillEvaluation,
} from './dynamic-eval.js';
