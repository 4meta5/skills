import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { ChainActivator, createRouteDecision } from './index.js';
import { StateManager } from '../session/index.js';
import type { SkillSpec, ProfileSpec, RouteDecision } from '../types/index.js';

describe('ChainActivator', () => {
  let testDir: string;
  let stateManager: StateManager;
  let mockSkills: SkillSpec[];
  let mockProfiles: ProfileSpec[];

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-activator-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    stateManager = new StateManager(testDir);

    mockSkills = [
      {
        name: 'tdd',
        skill_path: '.claude/skills/tdd',
        provides: ['test_written', 'test_green'],
        requires: [],
        conflicts: [],
        risk: 'low',
        cost: 'low',
        artifacts: [],
        tool_policy: {
          deny_until: {
            write_impl: { until: 'test_written', reason: 'Write test first' },
            commit: { until: 'test_green', reason: 'Tests must pass' },
          },
        },
      },
      {
        name: 'doc-maintenance',
        skill_path: '.claude/skills/doc-maintenance',
        provides: ['docs_updated'],
        requires: ['test_green'],
        conflicts: [],
        risk: 'low',
        cost: 'low',
        artifacts: [],
        tool_policy: {},
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
        name: 'new-feature',
        description: 'Feature development workflow',
        match: ['feature', 'implement', 'add'],
        capabilities_required: ['test_written', 'test_green', 'docs_updated'],
        strictness: 'strict',
        priority: 5,
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

  describe('activate', () => {
    it('activates a profile from immediate mode decision', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-001',
        query: 'fix the login bug',
        mode: 'immediate',
        candidates: [{ name: 'bug-fix', score: 0.9, matched_patterns: ['fix', 'bug'] }],
        selected_profile: 'bug-fix',
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(true);
      expect(result.is_new).toBe(true);
      expect(result.profile_id).toBe('bug-fix');
      expect(result.chain).toContain('tdd');
      expect(result.blocked_intents).toHaveProperty('write_impl');
    });

    it('activates from suggestion mode', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-002',
        query: 'implement new search feature',
        mode: 'suggestion',
        candidates: [{ name: 'new-feature', score: 0.75, matched_patterns: ['feature'] }],
        selected_profile: 'new-feature',
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(true);
      expect(result.profile_id).toBe('new-feature');
    });

    it('does not activate in chat mode', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-003',
        query: 'what is the weather',
        mode: 'chat',
        candidates: [],
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(false);
      expect(result.error).toContain('Chat mode');
    });

    it('uses top candidate when no selected_profile', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-004',
        query: 'fix the bug',
        mode: 'immediate',
        candidates: [
          { name: 'bug-fix', score: 0.9, matched_patterns: ['fix', 'bug'] },
          { name: 'new-feature', score: 0.5, matched_patterns: [] },
        ],
        // No selected_profile
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(true);
      expect(result.profile_id).toBe('bug-fix');
    });

    it('matches profile from query when no candidates', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-005',
        query: 'fix the broken login',
        mode: 'immediate',
        candidates: [],
        // No candidates, will fall back to profile matching
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(true);
      expect(result.profile_id).toBe('bug-fix');
    });

    it('returns error when no matching profile found', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-006',
        query: 'hello world',
        mode: 'immediate',
        candidates: [],
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(false);
      expect(result.error).toContain('No matching profile');
    });

    it('returns error for non-existent profile', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-007',
        query: 'do something',
        mode: 'immediate',
        candidates: [],
        selected_profile: 'non-existent',
      };

      const result = await activator.activate(decision);

      expect(result.activated).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('uses provided session_id', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-008',
        session_id: 'my-custom-session',
        query: 'fix the bug',
        mode: 'immediate',
        candidates: [{ name: 'bug-fix', score: 0.9, matched_patterns: [] }],
        selected_profile: 'bug-fix',
      };

      const result = await activator.activate(decision);

      expect(result.session_id).toBe('my-custom-session');
    });

    it('persists session state', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-009',
        query: 'fix the bug',
        mode: 'immediate',
        candidates: [{ name: 'bug-fix', score: 0.9, matched_patterns: [] }],
        selected_profile: 'bug-fix',
      };

      await activator.activate(decision);

      // Verify session was persisted
      const state = await stateManager.loadCurrent();
      expect(state).not.toBeNull();
      expect(state!.profile_id).toBe('bug-fix');
      expect(state!.chain).toContain('tdd');
    });
  });

  describe('idempotency', () => {
    it('returns cached result for same request_id', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const decision: RouteDecision = {
        request_id: 'req-idem-001',
        query: 'fix the bug',
        mode: 'immediate',
        candidates: [{ name: 'bug-fix', score: 0.9, matched_patterns: [] }],
        selected_profile: 'bug-fix',
      };

      const result1 = await activator.activate(decision);
      const result2 = await activator.activate(decision);

      expect(result1.is_new).toBe(true);
      expect(result1.idempotent).toBe(false);

      expect(result2.is_new).toBe(false);
      expect(result2.idempotent).toBe(true);
      expect(result2.session_id).toBe(result1.session_id);
    });

    it('hasRequest returns true for cached request', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      expect(activator.hasRequest('req-check')).toBe(false);

      await activator.activate({
        request_id: 'req-check',
        query: 'fix the bug',
        mode: 'immediate',
        selected_profile: 'bug-fix',
        candidates: [],
      });

      expect(activator.hasRequest('req-check')).toBe(true);
    });

    it('getSessionForRequest returns session_id', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      const result = await activator.activate({
        request_id: 'req-get',
        query: 'fix the bug',
        mode: 'immediate',
        selected_profile: 'bug-fix',
        candidates: [],
      });

      expect(activator.getSessionForRequest('req-get')).toBe(result.session_id);
    });

    it('clearCache removes cached requests', async () => {
      const activator = new ChainActivator(testDir, mockSkills, mockProfiles);

      await activator.activate({
        request_id: 'req-clear',
        query: 'fix the bug',
        mode: 'immediate',
        selected_profile: 'bug-fix',
        candidates: [],
      });

      expect(activator.hasRequest('req-clear')).toBe(true);

      activator.clearCache();

      expect(activator.hasRequest('req-clear')).toBe(false);
    });
  });
});

describe('createRouteDecision', () => {
  it('creates a minimal decision', () => {
    const decision = createRouteDecision('req-001', 'fix bug', 'immediate');

    expect(decision.request_id).toBe('req-001');
    expect(decision.query).toBe('fix bug');
    expect(decision.mode).toBe('immediate');
    expect(decision.candidates).toEqual([]);
    expect(decision.decided_at).toBeDefined();
  });

  it('creates a decision with candidates', () => {
    const decision = createRouteDecision('req-002', 'fix bug', 'immediate', [
      { name: 'bug-fix', score: 0.9, matched_patterns: ['fix', 'bug'] },
    ]);

    expect(decision.candidates).toHaveLength(1);
    expect(decision.candidates[0].name).toBe('bug-fix');
    expect(decision.selected_profile).toBe('bug-fix');
  });

  it('allows explicit selected_profile override', () => {
    const decision = createRouteDecision(
      'req-003',
      'fix bug',
      'immediate',
      [{ name: 'bug-fix', score: 0.9 }],
      { selectedProfile: 'custom-profile' }
    );

    expect(decision.selected_profile).toBe('custom-profile');
  });

  it('includes optional fields', () => {
    const decision = createRouteDecision(
      'req-004',
      'fix bug',
      'immediate',
      [],
      {
        sessionId: 'sess-001',
        routingTimeMs: 42,
      }
    );

    expect(decision.session_id).toBe('sess-001');
    expect(decision.routing_time_ms).toBe(42);
  });
});
