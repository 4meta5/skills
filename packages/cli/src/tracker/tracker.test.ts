import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { UsageEvent, SkillMetrics } from './types.js';

// Import the module under test - will fail until implemented
import {
  createTracker,
  trackEvent,
  getMetrics,
  generateReport,
  loadEvents,
} from './tracker.js';

describe('Usage Tracker', () => {
  let tempDir: string;
  let storagePath: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `tracker-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    storagePath = join(tempDir, 'usage.jsonl');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createTracker', () => {
    it('should create a tracker with default options', async () => {
      const tracker = await createTracker({ storagePath });
      expect(tracker).toBeDefined();
      expect(tracker.track).toBeInstanceOf(Function);
      expect(tracker.getMetrics).toBeInstanceOf(Function);
    });

    it('should create storage file if it does not exist', async () => {
      await createTracker({ storagePath });
      // File should exist (even if empty)
      const content = await readFile(storagePath, 'utf-8').catch(() => null);
      expect(content).not.toBeNull();
    });
  });

  describe('trackEvent', () => {
    it('should record a skill_available event', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({
        type: 'skill_available',
        sessionId: 'session-123',
        data: {
          skillName: 'tdd',
          similarity: 0.85,
        },
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('skill_available');
      expect(events[0].data.skillName).toBe('tdd');
      expect(events[0].data.similarity).toBe(0.85);
    });

    it('should record a skill_activated event', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({
        type: 'skill_activated',
        sessionId: 'session-123',
        data: {
          skillName: 'tdd',
          source: 'auto',
        },
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('skill_activated');
      expect(events[0].data.source).toBe('auto');
    });

    it('should record a skill_ignored event', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({
        type: 'skill_ignored',
        sessionId: 'session-123',
        data: {
          skillName: 'tdd',
        },
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('skill_ignored');
    });

    it('should append events to existing file', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({
        type: 'skill_available',
        sessionId: 'session-1',
        data: { skillName: 'tdd' },
      });

      await tracker.track({
        type: 'skill_activated',
        sessionId: 'session-1',
        data: { skillName: 'tdd', source: 'auto' },
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(2);
    });

    it('should add timestamp automatically', async () => {
      const tracker = await createTracker({ storagePath });
      const before = new Date().toISOString();

      await tracker.track({
        type: 'skill_available',
        sessionId: 'session-123',
        data: { skillName: 'tdd' },
      });

      const events = await loadEvents(storagePath);
      const after = new Date().toISOString();

      expect(events[0].timestamp).toBeDefined();
      expect(events[0].timestamp >= before).toBe(true);
      expect(events[0].timestamp <= after).toBe(true);
    });

    it('should truncate prompt to maxPromptLength', async () => {
      const tracker = await createTracker({ storagePath, maxPromptLength: 50 });
      const longPrompt = 'a'.repeat(100);

      await tracker.track({
        type: 'prompt_submitted',
        sessionId: 'session-123',
        data: { prompt: longPrompt },
      });

      const events = await loadEvents(storagePath);
      expect(events[0].data.prompt?.length).toBeLessThanOrEqual(53); // 50 + '...'
    });
  });

  describe('loadEvents', () => {
    it('should return empty array for non-existent file', async () => {
      const events = await loadEvents(join(tempDir, 'nonexistent.jsonl'));
      expect(events).toEqual([]);
    });

    it('should return empty array for empty file', async () => {
      const tracker = await createTracker({ storagePath });
      const events = await loadEvents(storagePath);
      expect(events).toEqual([]);
    });

    it('should parse JSONL format correctly', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({
        type: 'session_start',
        sessionId: 'session-1',
        data: {},
      });
      await tracker.track({
        type: 'skill_available',
        sessionId: 'session-1',
        data: { skillName: 'tdd' },
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('session_start');
      expect(events[1].type).toBe('skill_available');
    });

    it('should skip malformed lines gracefully', async () => {
      const tracker = await createTracker({ storagePath });

      // Write valid event
      await tracker.track({
        type: 'session_start',
        sessionId: 'session-1',
        data: {},
      });

      // Manually append invalid JSON
      const { appendFile } = await import('fs/promises');
      await appendFile(storagePath, 'not valid json\n');

      // Write another valid event
      await tracker.track({
        type: 'session_end',
        sessionId: 'session-1',
        data: {},
      });

      const events = await loadEvents(storagePath);
      expect(events).toHaveLength(2); // Should skip the invalid line
    });
  });

  describe('getMetrics', () => {
    it('should return empty metrics when no events', async () => {
      const tracker = await createTracker({ storagePath });
      const metrics = await tracker.getMetrics();

      expect(metrics.totalSessions).toBe(0);
      expect(metrics.totalPrompts).toBe(0);
      expect(metrics.skills).toEqual([]);
    });

    it('should calculate correct activation rate', async () => {
      const tracker = await createTracker({ storagePath });

      // Session 1: tdd available and activated
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      // Session 2: tdd available but ignored
      await tracker.track({ type: 'session_start', sessionId: 's2', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's2', data: { skillName: 'tdd', similarity: 0.8 } });
      await tracker.track({ type: 'skill_ignored', sessionId: 's2', data: { skillName: 'tdd' } });
      await tracker.track({ type: 'session_end', sessionId: 's2', data: {} });

      const metrics = await tracker.getMetrics();
      const tddMetrics = metrics.skills.find(s => s.skillName === 'tdd');

      expect(tddMetrics).toBeDefined();
      expect(tddMetrics!.relevantSessions).toBe(2);
      expect(tddMetrics!.activatedSessions).toBe(1);
      expect(tddMetrics!.activationRate).toBe(0.5); // 1/2
    });

    it('should distinguish auto vs manual activation', async () => {
      const tracker = await createTracker({ storagePath });

      // Session 1: auto activation
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      // Session 2: manual activation
      await tracker.track({ type: 'session_start', sessionId: 's2', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's2', data: { skillName: 'tdd', similarity: 0.8 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's2', data: { skillName: 'tdd', source: 'manual' } });
      await tracker.track({ type: 'session_end', sessionId: 's2', data: {} });

      // Session 3: ignored
      await tracker.track({ type: 'session_start', sessionId: 's3', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's3', data: { skillName: 'tdd', similarity: 0.7 } });
      await tracker.track({ type: 'skill_ignored', sessionId: 's3', data: { skillName: 'tdd' } });
      await tracker.track({ type: 'session_end', sessionId: 's3', data: {} });

      const metrics = await tracker.getMetrics();
      const tddMetrics = metrics.skills.find(s => s.skillName === 'tdd');

      expect(tddMetrics!.relevantSessions).toBe(3);
      expect(tddMetrics!.activatedSessions).toBe(2);
      expect(tddMetrics!.autoActivationRate).toBeCloseTo(1/3); // 1 auto out of 3 relevant
      expect(tddMetrics!.manualActivationRate).toBeCloseTo(1/3); // 1 manual out of 3 relevant
    });

    it('should track multiple skills independently', async () => {
      const tracker = await createTracker({ storagePath });

      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'security-analysis', similarity: 0.7 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'skill_ignored', sessionId: 's1', data: { skillName: 'security-analysis' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const metrics = await tracker.getMetrics();

      expect(metrics.skills).toHaveLength(2);

      const tddMetrics = metrics.skills.find(s => s.skillName === 'tdd');
      const secMetrics = metrics.skills.find(s => s.skillName === 'security-analysis');

      expect(tddMetrics!.activatedSessions).toBe(1);
      expect(secMetrics!.activatedSessions).toBe(0);
    });

    it('should filter by date range', async () => {
      const tracker = await createTracker({ storagePath });

      // Manually create events with specific timestamps
      const oldDate = '2025-01-01T00:00:00.000Z';
      const newDate = '2025-01-15T00:00:00.000Z';

      // We need to test date filtering - this requires the implementation
      // to support filtering by date range
      const metrics = await tracker.getMetrics({
        startDate: '2025-01-10T00:00:00.000Z',
        endDate: '2025-01-20T00:00:00.000Z',
      });

      expect(metrics.dateRange.start).toBe('2025-01-10T00:00:00.000Z');
      expect(metrics.dateRange.end).toBe('2025-01-20T00:00:00.000Z');
    });
  });

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const tracker = await createTracker({ storagePath });

      // Create some test data
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const report = await tracker.generateReport();

      expect(report).toContain('SKILL USAGE REPORT');
      expect(report).toContain('tdd');
      expect(report).toContain('Relevant');
      expect(report).toContain('Activated');
    });

    it('should include insights for low activation rates', async () => {
      const tracker = await createTracker({ storagePath });

      // Create data with low activation rate
      for (let i = 0; i < 10; i++) {
        await tracker.track({ type: 'session_start', sessionId: `s${i}`, data: {} });
        await tracker.track({ type: 'skill_available', sessionId: `s${i}`, data: { skillName: 'tdd', similarity: 0.8 } });
        if (i < 2) {
          // Only 20% activation
          await tracker.track({ type: 'skill_activated', sessionId: `s${i}`, data: { skillName: 'tdd', source: 'auto' } });
        } else {
          await tracker.track({ type: 'skill_ignored', sessionId: `s${i}`, data: { skillName: 'tdd' } });
        }
        await tracker.track({ type: 'session_end', sessionId: `s${i}`, data: {} });
      }

      const report = await tracker.generateReport();

      expect(report).toContain('INSIGHTS');
      expect(report).toContain('LOW'); // Should flag low activation
    });

    it('should handle empty data gracefully', async () => {
      const tracker = await createTracker({ storagePath });
      const report = await tracker.generateReport();

      expect(report).toContain('No usage data');
    });
  });
});
