/**
 * Usage tracker for skill activation metrics
 *
 * Tracks skill-related events and computes activation rates
 * to measure auto-activation effectiveness.
 */

import { readFile, writeFile, appendFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type {
  UsageEvent,
  UsageEventType,
  SkillMetrics,
  AggregatedMetrics,
  TrackerOptions,
} from './types.js';

/**
 * Input for tracking an event (timestamp added automatically)
 */
export interface TrackEventInput {
  type: UsageEventType;
  sessionId: string;
  data: UsageEvent['data'];
}

/**
 * Options for filtering metrics
 */
export interface MetricsFilterOptions {
  startDate?: string;
  endDate?: string;
  skillNames?: string[];
}

/**
 * Tracker instance interface
 */
export interface Tracker {
  track(event: TrackEventInput): Promise<void>;
  getMetrics(options?: MetricsFilterOptions): Promise<AggregatedMetrics>;
  generateReport(options?: MetricsFilterOptions): Promise<string>;
}

/**
 * Create a new tracker instance
 */
export async function createTracker(options: TrackerOptions): Promise<Tracker> {
  const storagePath = options.storagePath || getDefaultStoragePath();
  const maxPromptLength = options.maxPromptLength || 200;

  // Ensure storage directory exists
  await mkdir(dirname(storagePath), { recursive: true });

  // Create empty file if it doesn't exist
  try {
    await readFile(storagePath);
  } catch {
    await writeFile(storagePath, '');
  }

  return {
    async track(event: TrackEventInput): Promise<void> {
      await trackEvent(storagePath, event, maxPromptLength);
    },

    async getMetrics(filterOptions?: MetricsFilterOptions): Promise<AggregatedMetrics> {
      return getMetrics(storagePath, filterOptions);
    },

    async generateReport(filterOptions?: MetricsFilterOptions): Promise<string> {
      return generateReport(storagePath, filterOptions);
    },
  };
}

/**
 * Get default storage path
 */
function getDefaultStoragePath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return `${home}/.claude/usage.jsonl`;
}

/**
 * Track an event (standalone function for hooks)
 */
export async function trackEvent(
  storagePath: string,
  event: TrackEventInput,
  maxPromptLength = 200
): Promise<void> {
  const fullEvent: UsageEvent = {
    type: event.type,
    timestamp: new Date().toISOString(),
    sessionId: event.sessionId,
    data: { ...event.data },
  };

  // Truncate prompt if too long
  if (fullEvent.data.prompt && fullEvent.data.prompt.length > maxPromptLength) {
    fullEvent.data.prompt = fullEvent.data.prompt.slice(0, maxPromptLength) + '...';
  }

  const line = JSON.stringify(fullEvent) + '\n';
  await appendFile(storagePath, line);
}

/**
 * Load events from storage file
 */
export async function loadEvents(storagePath: string): Promise<UsageEvent[]> {
  let content: string;
  try {
    content = await readFile(storagePath, 'utf-8');
  } catch {
    return [];
  }

  if (!content.trim()) {
    return [];
  }

  const events: UsageEvent[] = [];
  const lines = content.trim().split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line) as UsageEvent;
      events.push(event);
    } catch {
      // Skip malformed lines
      continue;
    }
  }

  return events;
}

/**
 * Get metrics from stored events
 */
export async function getMetrics(
  storagePath: string,
  options?: MetricsFilterOptions
): Promise<AggregatedMetrics> {
  const events = await loadEvents(storagePath);

  // Filter by date range if specified
  let filtered = events;
  if (options?.startDate || options?.endDate) {
    filtered = events.filter(e => {
      if (options.startDate && e.timestamp < options.startDate) return false;
      if (options.endDate && e.timestamp > options.endDate) return false;
      return true;
    });
  }

  // Count sessions
  const sessionIds = new Set(filtered.map(e => e.sessionId));
  const totalSessions = sessionIds.size;

  // Count prompts
  const totalPrompts = filtered.filter(e => e.type === 'prompt_submitted').length;

  // Build skill metrics
  const skillData = new Map<string, {
    sessions: Set<string>;
    relevantSessions: Set<string>;
    activatedSessions: Set<string>;
    autoActivatedSessions: Set<string>;
    manualActivatedSessions: Set<string>;
  }>();

  for (const event of filtered) {
    const skillName = event.data.skillName;
    if (!skillName) continue;

    // Filter by skill names if specified
    if (options?.skillNames && !options.skillNames.includes(skillName)) {
      continue;
    }

    if (!skillData.has(skillName)) {
      skillData.set(skillName, {
        sessions: new Set(),
        relevantSessions: new Set(),
        activatedSessions: new Set(),
        autoActivatedSessions: new Set(),
        manualActivatedSessions: new Set(),
      });
    }

    const data = skillData.get(skillName)!;
    data.sessions.add(event.sessionId);

    if (event.type === 'skill_available') {
      data.relevantSessions.add(event.sessionId);
    } else if (event.type === 'skill_activated') {
      data.activatedSessions.add(event.sessionId);
      if (event.data.source === 'auto') {
        data.autoActivatedSessions.add(event.sessionId);
      } else if (event.data.source === 'manual') {
        data.manualActivatedSessions.add(event.sessionId);
      }
    } else if (event.type === 'skill_ignored') {
      // Ignored means it was relevant
      data.relevantSessions.add(event.sessionId);
    }
  }

  const skills: SkillMetrics[] = [];
  for (const [skillName, data] of skillData) {
    const relevantCount = data.relevantSessions.size;
    const activatedCount = data.activatedSessions.size;
    const autoCount = data.autoActivatedSessions.size;
    const manualCount = data.manualActivatedSessions.size;

    skills.push({
      skillName,
      totalSessions: data.sessions.size,
      relevantSessions: relevantCount,
      activatedSessions: activatedCount,
      activationRate: relevantCount > 0 ? activatedCount / relevantCount : 0,
      autoActivationRate: relevantCount > 0 ? autoCount / relevantCount : 0,
      manualActivationRate: relevantCount > 0 ? manualCount / relevantCount : 0,
      reminderCount: manualCount, // Manual activations are reminders
    });
  }

  // Determine date range
  let startDate = options?.startDate || '';
  let endDate = options?.endDate || '';
  if (filtered.length > 0 && !startDate) {
    startDate = filtered[0].timestamp;
  }
  if (filtered.length > 0 && !endDate) {
    endDate = filtered[filtered.length - 1].timestamp;
  }

  return {
    totalSessions,
    totalPrompts,
    skills,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  };
}

/**
 * Generate a markdown report
 */
export async function generateReport(
  storagePath: string,
  options?: MetricsFilterOptions
): Promise<string> {
  const metrics = await getMetrics(storagePath, options);

  if (metrics.totalSessions === 0) {
    return `SKILL USAGE REPORT
═══════════════════════════════════════════════════════════

No usage data recorded yet.

To start tracking, ensure the usage-tracker hook is installed:
  skills hook add usage-tracker
`;
  }

  const lines: string[] = [
    'SKILL USAGE REPORT',
    '═══════════════════════════════════════════════════════════',
    '',
    `Period: ${metrics.dateRange.start.slice(0, 10)} to ${metrics.dateRange.end.slice(0, 10)}`,
    `Total Sessions: ${metrics.totalSessions}`,
    `Total Prompts: ${metrics.totalPrompts}`,
    '',
    'Skill               Relevant  Activated  Rate    Auto    Manual',
    '────────────────────────────────────────────────────────────────',
  ];

  // Sort by activation rate (lowest first to highlight problems)
  const sortedSkills = [...metrics.skills].sort((a, b) => a.activationRate - b.activationRate);

  for (const skill of sortedSkills) {
    const name = skill.skillName.padEnd(20).slice(0, 20);
    const relevant = String(skill.relevantSessions).padStart(8);
    const activated = String(skill.activatedSessions).padStart(10);
    const rate = (skill.activationRate * 100).toFixed(0).padStart(4) + '%';
    const autoRate = (skill.autoActivationRate * 100).toFixed(0).padStart(4) + '%';
    const manualRate = (skill.manualActivationRate * 100).toFixed(0).padStart(6) + '%';

    lines.push(`${name}${relevant}${activated}  ${rate}  ${autoRate}  ${manualRate}`);
  }

  // Add insights
  lines.push('');
  lines.push('INSIGHTS');
  lines.push('────────────────────────────────────────────────────────────────');

  const lowActivation = sortedSkills.filter(s => s.activationRate < 0.5 && s.relevantSessions >= 3);
  if (lowActivation.length > 0) {
    for (const skill of lowActivation) {
      const rate = (skill.activationRate * 100).toFixed(0);
      lines.push(`- ${skill.skillName} has LOW activation rate (${rate}%)`);
      if (skill.manualActivationRate > skill.autoActivationRate) {
        lines.push(`  Users often manually invoke this skill - consider enforcement`);
      }
    }
  }

  const highActivation = sortedSkills.filter(s => s.activationRate >= 0.8);
  if (highActivation.length > 0) {
    lines.push('');
    lines.push('Well-performing skills (>80% activation):');
    for (const skill of highActivation) {
      lines.push(`- ${skill.skillName}`);
    }
  }

  if (lowActivation.length === 0 && highActivation.length === 0) {
    lines.push('Insufficient data for insights. Continue tracking usage.');
  }

  return lines.join('\n');
}
