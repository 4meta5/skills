/**
 * Types for skill usage tracking
 */

/**
 * Event types that can be tracked
 */
export type UsageEventType =
  | 'skill_available'    // Skill was installed and relevant to prompt
  | 'skill_activated'    // Skill was invoked (auto or manual)
  | 'skill_ignored'      // Skill was available but not activated
  | 'prompt_submitted'   // User submitted a prompt
  | 'session_start'      // New session started
  | 'session_end';       // Session ended

/**
 * Source of skill activation
 */
export type ActivationSource = 'auto' | 'manual' | 'hook';

/**
 * A single usage event
 */
export interface UsageEvent {
  type: UsageEventType;
  timestamp: string;  // ISO 8601 format
  sessionId: string;
  data: {
    skillName?: string;
    similarity?: number;  // For skill_available events
    source?: ActivationSource;  // For skill_activated events
    prompt?: string;  // For prompt_submitted events (truncated)
  };
}

/**
 * Metrics for a single skill
 */
export interface SkillMetrics {
  skillName: string;
  totalSessions: number;      // Sessions where skill was installed
  relevantSessions: number;   // Sessions where skill matched prompt
  activatedSessions: number;  // Sessions where skill was invoked
  activationRate: number;     // activated / relevant (0-1)
  autoActivationRate: number; // auto-activated / relevant (0-1)
  manualActivationRate: number; // manual / relevant (0-1)
  reminderCount: number;      // Times user manually invoked after ignore
}

/**
 * Aggregated metrics across all skills
 */
export interface AggregatedMetrics {
  totalSessions: number;
  totalPrompts: number;
  skills: SkillMetrics[];
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Options for the tracker
 */
export interface TrackerOptions {
  storagePath?: string;  // Path to usage.jsonl file
  maxPromptLength?: number;  // Max chars to store from prompts (privacy)
}
