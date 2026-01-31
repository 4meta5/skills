/**
 * Usage Tracker for chain sessions
 *
 * Records events to a JSONL file for analytics:
 * - activation: Profile activated
 * - decision: Router decision made
 * - block: Tool blocked by policy
 * - retry: Blocked tool attempted again
 * - completion: Capability satisfied
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface ActivationEvent {
  type: 'activation';
  session_id: string;
  profile_id: string;
  timestamp: string;
}

export interface DecisionEvent {
  type: 'decision';
  session_id: string;
  request_id: string;
  mode: string;
  selected_profile: string;
  timestamp: string;
}

export interface BlockEvent {
  type: 'block';
  session_id: string;
  intent: string;
  reason: string;
  timestamp: string;
}

export interface RetryEvent {
  type: 'retry';
  session_id: string;
  intent: string;
  attempt: number;
  timestamp: string;
}

export interface CompletionEvent {
  type: 'completion';
  session_id: string;
  capability: string;
  satisfied_by: string;
  timestamp: string;
}

export type UsageEvent =
  | ActivationEvent
  | DecisionEvent
  | BlockEvent
  | RetryEvent
  | CompletionEvent;

export interface UsageStats {
  total_events: number;
  activations: number;
  decisions: number;
  blocks: number;
  retries: number;
  completions: number;
}

const USAGE_FILE = '.chain-usage.jsonl';

export class UsageTracker {
  private filePath: string;
  private events: UsageEvent[] = [];
  private loaded = false;

  constructor(cwd: string = process.cwd()) {
    this.filePath = join(cwd, USAGE_FILE);
  }

  /**
   * Load events from the JSONL file
   */
  private async load(): Promise<void> {
    if (this.loaded) return;

    if (existsSync(this.filePath)) {
      try {
        const content = readFileSync(this.filePath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        this.events = lines.map((line) => JSON.parse(line) as UsageEvent);
      } catch {
        // Ignore parse errors, start fresh
        this.events = [];
      }
    }

    this.loaded = true;
  }

  /**
   * Track a usage event
   */
  async track(event: UsageEvent): Promise<void> {
    await this.load();

    this.events.push(event);

    // Append to file
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    appendFileSync(this.filePath, JSON.stringify(event) + '\n');
  }

  /**
   * Get all events for a session
   */
  async getEvents(sessionId: string): Promise<UsageEvent[]> {
    await this.load();

    return this.events
      .filter((e) => e.session_id === sessionId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get summary statistics for a session
   */
  async getStats(sessionId: string): Promise<UsageStats> {
    const events = await this.getEvents(sessionId);

    return {
      total_events: events.length,
      activations: events.filter((e) => e.type === 'activation').length,
      decisions: events.filter((e) => e.type === 'decision').length,
      blocks: events.filter((e) => e.type === 'block').length,
      retries: events.filter((e) => e.type === 'retry').length,
      completions: events.filter((e) => e.type === 'completion').length,
    };
  }

  /**
   * Get all tracked sessions
   */
  async getSessions(): Promise<string[]> {
    await this.load();

    const sessions = new Set(this.events.map((e) => e.session_id));
    return Array.from(sessions);
  }

  /**
   * Clear all events (for testing)
   */
  async clear(): Promise<void> {
    this.events = [];
    this.loaded = true;
    // Don't delete the file, just clear in-memory
  }
}
