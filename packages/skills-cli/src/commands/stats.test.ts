import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('stats command', () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `stats-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tempDir, { recursive: true });
    await mkdir(join(tempDir, '.claude'), { recursive: true });

    // Mock HOME to use temp dir
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;

    // Reset mocks before each test
    vi.resetAllMocks();
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('statsCommand', () => {

    it('should display usage report', async () => {
      const { statsCommand } = await import('./stats.js');

      // Create a tracker with test data
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      const tracker = await createTracker({ storagePath });

      // Add test data
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await statsCommand({});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('SKILL USAGE REPORT');
      expect(output).toContain('tdd');

      consoleSpy.mockRestore();
    });

    it('should output JSON when --json flag is passed', async () => {
      const { statsCommand } = await import('./stats.js');
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      const tracker = await createTracker({ storagePath });

      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await statsCommand({ json: true });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('"totalSessions"');
      expect(output).toContain('1'); // One session

      consoleSpy.mockRestore();
    });

    it('should filter by date range when --since flag is passed', async () => {
      const { statsCommand } = await import('./stats.js');
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      await createTracker({ storagePath });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // This should work without errors even with empty data
      await statsCommand({ since: '2025-01-10' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should filter by skill name when --skill flag is passed', async () => {
      const { statsCommand } = await import('./stats.js');
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      const tracker = await createTracker({ storagePath });

      // Add data for two skills
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd' } });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'security-analysis' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await statsCommand({ skill: 'tdd', json: true });

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('tdd');
      // security-analysis should be filtered out
      expect(output).not.toContain('security-analysis');

      consoleSpy.mockRestore();
    });

    it('should handle empty usage data gracefully', async () => {
      const { statsCommand } = await import('./stats.js');
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      await createTracker({ storagePath });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await statsCommand({});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('No usage data');

      consoleSpy.mockRestore();
    });

    it('should show summary statistics', async () => {
      const { statsCommand } = await import('./stats.js');
      const { createTracker } = await import('../tracker/tracker.js');
      const storagePath = join(tempDir, '.claude', 'usage.jsonl');
      const tracker = await createTracker({ storagePath });

      // Add data for multiple sessions and skills
      await tracker.track({ type: 'session_start', sessionId: 's1', data: {} });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'tdd', similarity: 0.9 } });
      await tracker.track({ type: 'skill_available', sessionId: 's1', data: { skillName: 'security-analysis', similarity: 0.7 } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'tdd', source: 'auto' } });
      await tracker.track({ type: 'skill_activated', sessionId: 's1', data: { skillName: 'security-analysis', source: 'auto' } });
      await tracker.track({ type: 'session_end', sessionId: 's1', data: {} });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await statsCommand({});

      const output = consoleSpy.mock.calls.map(c => c[0]).join('\n');
      expect(output).toContain('SKILL USAGE REPORT');
      expect(output).toContain('tdd');
      expect(output).toContain('security-analysis');
      expect(output).toContain('Relevant');
      expect(output).toContain('Activated');

      consoleSpy.mockRestore();
    });
  });
});
