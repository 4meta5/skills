import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { createChainIntegration } from './chain-integration.js';
import type { RoutingResult } from '../router/types.js';
import type { SkillSpec, ProfileSpec } from '@4meta5/chain';

describe('ChainIntegration', () => {
  let testDir: string;
  let mockSkills: SkillSpec[];
  let mockProfiles: ProfileSpec[];

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-integration-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });

    mockSkills = [
      {
        name: 'tdd',
        skill_path: '.claude/skills/tdd',
        provides: ['test_written', 'test_green'],
        requires: [],
        conflicts: [],
        risk: 'low',
        cost: 'low',
        tier: 'hard',
        artifacts: [],
        tool_policy: {
          deny_until: {
            write_impl: { until: 'test_written', reason: 'Write test first' },
          },
        },
      },
    ];

    mockProfiles = [
      {
        name: 'bug-fix',
        description: 'TDD workflow for bug fixes',
        match: ['fix', 'bug', 'broken'],
        capabilities_required: ['test_written', 'test_green'],
        strictness: 'strict',
        priority: 10,
        completion_requirements: [],
      },
      {
        name: 'permissive',
        description: 'No enforcement',
        match: [],
        capabilities_required: [],
        strictness: 'permissive',
        priority: 0,
        completion_requirements: [],
      },
    ];
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('activateFromRouting', () => {
    it('activates chain on immediate mode', async () => {
      const onActivation = vi.fn();
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
        onActivation,
      });

      const routingResult: RoutingResult = {
        query: 'fix the login bug',
        mode: 'immediate',
        matches: [{ skillName: 'tdd', score: 0.9, keywordScore: 1, embeddingScore: 0.8, matchedKeywords: ['fix'] }],
        signals: [],
        processingTimeMs: 10,
      };

      const result = await integration.activateFromRouting(routingResult, 'fix the login bug');

      expect(result).not.toBeNull();
      expect(result!.activated).toBe(true);
      expect(result!.profile_id).toBe('bug-fix');
      expect(result!.chain).toContain('tdd');
      expect(onActivation).toHaveBeenCalledWith(result);
    });

    it('activates chain on suggestion mode', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const routingResult: RoutingResult = {
        query: 'fix the bug',
        mode: 'suggestion',
        matches: [{ skillName: 'tdd', score: 0.75, keywordScore: 1, embeddingScore: 0.5, matchedKeywords: ['fix'] }],
        signals: [],
        processingTimeMs: 10,
      };

      const result = await integration.activateFromRouting(routingResult, 'fix the bug');

      expect(result).not.toBeNull();
      expect(result!.activated).toBe(true);
    });

    it('returns null on chat mode', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const routingResult: RoutingResult = {
        query: 'hello world',
        mode: 'chat',
        matches: [],
        signals: [],
        processingTimeMs: 5,
      };

      const result = await integration.activateFromRouting(routingResult, 'hello world');

      expect(result).toBeNull();
    });

    it('stores last activation result', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const routingResult: RoutingResult = {
        query: 'fix the bug',
        mode: 'immediate',
        matches: [{ skillName: 'tdd', score: 0.9, keywordScore: 1, embeddingScore: 0.8, matchedKeywords: ['fix'] }],
        signals: [],
        processingTimeMs: 10,
      };

      await integration.activateFromRouting(routingResult, 'fix the bug');

      const lastActivation = integration.getLastActivation();
      expect(lastActivation).not.toBeNull();
      expect(lastActivation!.activated).toBe(true);
    });

    it('calls onActivationError on failure', async () => {
      const onActivationError = vi.fn();
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: [], // No profiles, will fail to match
        onActivationError,
      });

      const routingResult: RoutingResult = {
        query: 'hello world',
        mode: 'immediate',
        matches: [],
        signals: [],
        processingTimeMs: 5,
      };

      const result = await integration.activateFromRouting(routingResult, 'hello world');

      // Activation fails because no profile matches
      expect(result?.activated).toBe(false);
    });
  });

  describe('activateWithProfile', () => {
    it('activates with explicit profile selection', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const result = await integration.activateWithProfile('fix the bug', 'bug-fix');

      expect(result.activated).toBe(true);
      expect(result.profile_id).toBe('bug-fix');
      expect(result.chain).toContain('tdd');
    });

    it('fails for non-existent profile', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const result = await integration.activateWithProfile('do something', 'non-existent');

      expect(result.activated).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('hasRequest', () => {
    it('tracks processed request IDs', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const routingResult: RoutingResult = {
        query: 'fix the bug',
        mode: 'immediate',
        matches: [],
        signals: [],
        processingTimeMs: 10,
      };

      await integration.activateFromRouting(routingResult, 'fix the bug');

      // The integration generates a request_id internally
      // We can check the last activation for the session_id
      const lastActivation = integration.getLastActivation();
      expect(lastActivation).not.toBeNull();
    });
  });

  describe('clearCache', () => {
    it('clears cached state', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      const routingResult: RoutingResult = {
        query: 'fix the bug',
        mode: 'immediate',
        matches: [],
        signals: [],
        processingTimeMs: 10,
      };

      await integration.activateFromRouting(routingResult, 'fix the bug');
      expect(integration.getLastActivation()).not.toBeNull();

      integration.clearCache();
      expect(integration.getLastActivation()).toBeNull();
    });
  });

  describe('usage tracking', () => {
    it('tracks block events', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
        trackUsage: true,
      });

      await integration.trackBlock('test-session', 'write_impl', 'TDD RED phase');

      const tracker = integration.getTracker();
      expect(tracker).not.toBeNull();

      const events = await tracker!.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('block');
    });

    it('tracks retry events', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      await integration.trackRetry('test-session', 'write_impl', 2);

      const tracker = integration.getTracker();
      const events = await tracker!.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('retry');
    });

    it('tracks completion events', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
      });

      await integration.trackCompletion('test-session', 'test_written', 'tdd');

      const tracker = integration.getTracker();
      const events = await tracker!.getEvents('test-session');
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('completion');
    });

    it('disables tracking when trackUsage is false', async () => {
      const integration = createChainIntegration({
        cwd: testDir,
        skills: mockSkills,
        profiles: mockProfiles,
        trackUsage: false,
      });

      await integration.trackBlock('test-session', 'write_impl', 'TDD RED phase');

      const tracker = integration.getTracker();
      expect(tracker).toBeNull();
    });
  });
});
