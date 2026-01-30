/**
 * Stats command - displays skill usage metrics
 *
 * Usage: skills stats [options]
 */

import { homedir } from 'os';
import { join } from 'path';
import { getMetrics, generateReport } from '../tracker/tracker.js';
import type { MetricsFilterOptions } from '../tracker/tracker.js';

export interface StatsOptions {
  json?: boolean;
  since?: string;
  skill?: string;
}

/**
 * Get default storage path for usage tracking
 */
function getStoragePath(): string {
  return join(homedir(), '.claude', 'usage.jsonl');
}

/**
 * Stats command handler
 */
export async function statsCommand(options: StatsOptions): Promise<void> {
  const storagePath = getStoragePath();

  // Build filter options
  const filterOptions: MetricsFilterOptions = {};

  if (options.since) {
    // Parse --since flag (supports "7d", "30d", ISO dates)
    filterOptions.startDate = parseDate(options.since);
  }

  if (options.skill) {
    filterOptions.skillNames = [options.skill];
  }

  if (options.json) {
    // Output as JSON
    const metrics = await getMetrics(storagePath, filterOptions);
    console.log(JSON.stringify(metrics, null, 2));
    return;
  }

  // Output as formatted report
  const report = await generateReport(storagePath, filterOptions);
  console.log(report);
}

/**
 * Parse date input (supports ISO dates, relative dates like "7d")
 */
function parseDate(input: string): string {
  // Try ISO date first
  if (input.match(/^\d{4}-\d{2}-\d{2}/)) {
    return input;
  }

  // Try relative date (e.g., "7d" = 7 days ago)
  const match = input.match(/^(\d+)d$/);
  if (match) {
    const days = parseInt(match[1], 10);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }

  // Default: treat as ISO date
  return input;
}
