import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

describe('UsageTracker', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `usage-tracker-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('track', () => {
    it('records activation events', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'activation',
        session_id: 'test-session',
        profile_id: 'tdd',
        timestamp: new Date().toISOString(),
      });

      const events = await tracker.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('activation');
      expect((events[0] as any).profile_id).toBe('tdd');
    });

    it('records block events with intent and reason', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'block',
        session_id: 'test-session',
        intent: 'write_impl',
        reason: 'TDD RED phase',
        timestamp: new Date().toISOString(),
      });

      const events = await tracker.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('block');
      expect((events[0] as any).intent).toBe('write_impl');
      expect((events[0] as any).reason).toBe('TDD RED phase');
    });

    it('records retry events', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'retry',
        session_id: 'test-session',
        intent: 'write_impl',
        attempt: 2,
        timestamp: new Date().toISOString(),
      });

      const events = await tracker.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('retry');
      expect((events[0] as any).attempt).toBe(2);
    });

    it('records completion events', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'completion',
        session_id: 'test-session',
        capability: 'test_written',
        satisfied_by: 'tdd',
        timestamp: new Date().toISOString(),
      });

      const events = await tracker.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('completion');
      expect((events[0] as any).capability).toBe('test_written');
    });

    it('records decision events', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'decision',
        session_id: 'test-session',
        request_id: 'req-123',
        mode: 'immediate',
        selected_profile: 'tdd',
        timestamp: new Date().toISOString(),
      });

      const events = await tracker.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('decision');
      expect((events[0] as any).mode).toBe('immediate');
    });
  });

  describe('getEvents', () => {
    it('returns events for a specific session', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'activation',
        session_id: 'session-1',
        profile_id: 'tdd',
        timestamp: new Date().toISOString(),
      });
      await tracker.track({
        type: 'activation',
        session_id: 'session-2',
        profile_id: 'code-review',
        timestamp: new Date().toISOString(),
      });

      const events1 = await tracker.getEvents('session-1');
      const events2 = await tracker.getEvents('session-2');

      expect(events1).toHaveLength(1);
      expect((events1[0] as any).profile_id).toBe('tdd');
      expect(events2).toHaveLength(1);
      expect((events2[0] as any).profile_id).toBe('code-review');
    });

    it('returns empty array for unknown session', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      const events = await tracker.getEvents('nonexistent');
      expect(events).toEqual([]);
    });

    it('returns events in chronological order', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      const t1 = '2024-01-01T00:00:00Z';
      const t2 = '2024-01-01T00:01:00Z';
      const t3 = '2024-01-01T00:02:00Z';

      await tracker.track({
        type: 'activation',
        session_id: 'test',
        profile_id: 'tdd',
        timestamp: t1,
      });
      await tracker.track({
        type: 'block',
        session_id: 'test',
        intent: 'write',
        reason: 'test',
        timestamp: t2,
      });
      await tracker.track({
        type: 'completion',
        session_id: 'test',
        capability: 'test_written',
        satisfied_by: 'tdd',
        timestamp: t3,
      });

      const events = await tracker.getEvents('test');
      expect(events).toHaveLength(3);
      expect((events[0] as any).timestamp).toBe(t1);
      expect(events[1].timestamp).toBe(t2);
      expect(events[2].timestamp).toBe(t3);
    });
  });

  describe('getStats', () => {
    it('returns summary statistics for a session', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'activation',
        session_id: 'test',
        profile_id: 'tdd',
        timestamp: new Date().toISOString(),
      });
      await tracker.track({
        type: 'block',
        session_id: 'test',
        intent: 'write',
        reason: 'test',
        timestamp: new Date().toISOString(),
      });
      await tracker.track({
        type: 'block',
        session_id: 'test',
        intent: 'write',
        reason: 'test',
        timestamp: new Date().toISOString(),
      });
      await tracker.track({
        type: 'completion',
        session_id: 'test',
        capability: 'test_written',
        satisfied_by: 'tdd',
        timestamp: new Date().toISOString(),
      });

      const stats = await tracker.getStats('test');

      expect(stats.total_events).toBe(4);
      expect(stats.activations).toBe(1);
      expect(stats.blocks).toBe(2);
      expect(stats.completions).toBe(1);
      expect(stats.retries).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists events to JSONL file', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');
      const tracker = new UsageTracker(testDir);

      await tracker.track({
        type: 'activation',
        session_id: 'test',
        profile_id: 'tdd',
        timestamp: '2024-01-01T00:00:00Z',
      });

      // Read the file directly
      const filePath = join(testDir, '.chain-usage.jsonl');
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);
      const event = JSON.parse(lines[0]);
      expect(event.type).toBe('activation');
      expect(event.session_id).toBe('test');
    });

    it('loads events from existing file', async () => {
      const { UsageTracker } = await import('./usage-tracker.js');

      // Create first tracker and add event
      const tracker1 = new UsageTracker(testDir);
      await tracker1.track({
        type: 'activation',
        session_id: 'test',
        profile_id: 'tdd',
        timestamp: new Date().toISOString(),
      });

      // Create second tracker and verify it sees the event
      const tracker2 = new UsageTracker(testDir);
      const events = await tracker2.getEvents('test');

      expect(events).toHaveLength(1);
      expect((events[0] as any).type).toBe('activation');
    });
  });
});
