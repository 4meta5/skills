import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { StateManager, generateSessionId, getStateDir } from './state-manager.js';
import type { SessionState, CapabilityEvidence } from '../types/index.js';

describe('StateManager', () => {
  let testDir: string;
  let manager: StateManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    manager = new StateManager(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  function createTestState(overrides: Partial<SessionState> = {}): SessionState {
    return {
      session_id: generateSessionId(),
      profile_id: 'test-profile',
      activated_at: new Date().toISOString(),
      chain: ['skill-a', 'skill-b'],
      capabilities_required: ['cap_a', 'cap_b'],
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: 'advisory',
      blocked_intents: {},
      ...overrides,
    };
  }

  describe('create', () => {
    it('creates state file in correct location', async () => {
      const state = createTestState();
      await manager.create(state);

      const stateDir = getStateDir(testDir);
      const content = await readFile(join(stateDir, `${state.session_id}.json`), 'utf-8');
      const saved = JSON.parse(content);

      expect(saved.session_id).toBe(state.session_id);
      expect(saved.profile_id).toBe(state.profile_id);
    });

    it('sets current session ID', async () => {
      const state = createTestState();
      await manager.create(state);

      const stateDir = getStateDir(testDir);
      const currentSession = await readFile(join(stateDir, 'current_session'), 'utf-8');

      expect(currentSession.trim()).toBe(state.session_id);
    });
  });

  describe('load', () => {
    it('loads existing state', async () => {
      const state = createTestState();
      await manager.create(state);

      const loaded = await manager.load(state.session_id);

      expect(loaded).not.toBeNull();
      expect(loaded?.session_id).toBe(state.session_id);
      expect(loaded?.chain).toEqual(state.chain);
    });

    it('returns null for non-existent session', async () => {
      const loaded = await manager.load('nonexistent-id');
      expect(loaded).toBeNull();
    });
  });

  describe('loadCurrent', () => {
    it('loads current session', async () => {
      const state = createTestState();
      await manager.create(state);

      const loaded = await manager.loadCurrent();

      expect(loaded).not.toBeNull();
      expect(loaded?.session_id).toBe(state.session_id);
    });

    it('returns null when no current session', async () => {
      const loaded = await manager.loadCurrent();
      expect(loaded).toBeNull();
    });
  });

  describe('save', () => {
    it('updates existing state', async () => {
      const state = createTestState();
      await manager.create(state);

      state.current_skill_index = 1;
      state.capabilities_satisfied.push({
        capability: 'cap_a',
        satisfied_at: new Date().toISOString(),
        satisfied_by: 'skill-a',
        evidence_type: 'manual',
      });

      await manager.save(state);

      const loaded = await manager.load(state.session_id);
      expect(loaded?.current_skill_index).toBe(1);
      expect(loaded?.capabilities_satisfied).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('removes session state file', async () => {
      const state = createTestState();
      await manager.create(state);

      const cleared = await manager.clear(state.session_id);

      expect(cleared).toBe(true);
      expect(await manager.load(state.session_id)).toBeNull();
    });

    it('returns false for non-existent session', async () => {
      const cleared = await manager.clear('nonexistent-id');
      expect(cleared).toBe(false);
    });
  });

  describe('clearCurrent', () => {
    it('clears current session', async () => {
      const state = createTestState();
      await manager.create(state);

      const cleared = await manager.clearCurrent();

      expect(cleared).toBe(true);
      expect(await manager.loadCurrent()).toBeNull();
    });

    it('returns false when no current session', async () => {
      const cleared = await manager.clearCurrent();
      expect(cleared).toBe(false);
    });
  });

  describe('list', () => {
    it('lists all session IDs', async () => {
      const state1 = createTestState();
      const state2 = createTestState();

      await manager.create(state1);
      await manager.create(state2);

      const sessions = await manager.list();

      expect(sessions).toContain(state1.session_id);
      expect(sessions).toContain(state2.session_id);
    });

    it('returns empty array when no sessions', async () => {
      const sessions = await manager.list();
      expect(sessions).toEqual([]);
    });
  });

  describe('satisfyCapability', () => {
    it('adds evidence for capability', async () => {
      const state = createTestState();
      await manager.create(state);

      const evidence: CapabilityEvidence = {
        capability: 'cap_a',
        satisfied_at: new Date().toISOString(),
        satisfied_by: 'skill-a',
        evidence_type: 'file_exists',
        evidence_path: 'test.ts',
      };

      const result = await manager.satisfyCapability(state.session_id, evidence);

      expect(result).toBe(true);

      const loaded = await manager.load(state.session_id);
      expect(loaded?.capabilities_satisfied).toHaveLength(1);
      expect(loaded?.capabilities_satisfied[0].capability).toBe('cap_a');
    });

    it('returns true if already satisfied', async () => {
      const state = createTestState({
        capabilities_satisfied: [{
          capability: 'cap_a',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'skill-a',
          evidence_type: 'manual',
        }],
      });
      await manager.create(state);

      const evidence: CapabilityEvidence = {
        capability: 'cap_a',
        satisfied_at: new Date().toISOString(),
        satisfied_by: 'skill-a',
        evidence_type: 'file_exists',
        evidence_path: 'test.ts',
      };

      const result = await manager.satisfyCapability(state.session_id, evidence);

      expect(result).toBe(true);

      const loaded = await manager.load(state.session_id);
      expect(loaded?.capabilities_satisfied).toHaveLength(1);
    });
  });

  describe('isCapabilitySatisfied', () => {
    it('returns true for satisfied capability', async () => {
      const state = createTestState({
        capabilities_satisfied: [{
          capability: 'cap_a',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'skill-a',
          evidence_type: 'manual',
        }],
      });
      await manager.create(state);

      const result = await manager.isCapabilitySatisfied(state.session_id, 'cap_a');

      expect(result).toBe(true);
    });

    it('returns false for unsatisfied capability', async () => {
      const state = createTestState();
      await manager.create(state);

      const result = await manager.isCapabilitySatisfied(state.session_id, 'cap_a');

      expect(result).toBe(false);
    });
  });

  describe('getUnsatisfiedCapabilities', () => {
    it('returns unsatisfied capabilities', async () => {
      const state = createTestState({
        capabilities_required: ['cap_a', 'cap_b', 'cap_c'],
        capabilities_satisfied: [{
          capability: 'cap_a',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'skill-a',
          evidence_type: 'manual',
        }],
      });
      await manager.create(state);

      const unsatisfied = await manager.getUnsatisfiedCapabilities(state.session_id);

      expect(unsatisfied).toEqual(['cap_b', 'cap_c']);
    });
  });

  describe('getCurrentSkill', () => {
    const testSkills = [
      {
        name: 'skill-a',
        skill_path: '.claude/skills/skill-a',
        provides: ['cap_a'],
        requires: [],
        conflicts: [],
        risk: 'low' as const,
        cost: 'low' as const,
        artifacts: [],
      },
      {
        name: 'skill-b',
        skill_path: '.claude/skills/skill-b',
        provides: ['cap_b'],
        requires: ['cap_a'],
        conflicts: [],
        risk: 'low' as const,
        cost: 'low' as const,
        artifacts: [],
      },
      {
        name: 'skill-c',
        skill_path: '.claude/skills/skill-c',
        provides: ['cap_c'],
        requires: ['cap_b'],
        conflicts: [],
        risk: 'low' as const,
        cost: 'low' as const,
        artifacts: [],
      },
    ];

    it('returns first skill when no capabilities satisfied', async () => {
      const state = createTestState({
        chain: ['skill-a', 'skill-b', 'skill-c'],
        capabilities_required: ['cap_a', 'cap_b', 'cap_c'],
        capabilities_satisfied: [],
      });
      await manager.create(state);

      const result = await manager.getCurrentSkill(state.session_id, testSkills);

      expect(result).not.toBeNull();
      expect(result?.skill.name).toBe('skill-a');
      expect(result?.capability).toBe('cap_a');
    });

    it('returns second skill when first capability satisfied', async () => {
      const state = createTestState({
        chain: ['skill-a', 'skill-b', 'skill-c'],
        capabilities_required: ['cap_a', 'cap_b', 'cap_c'],
        capabilities_satisfied: [{
          capability: 'cap_a',
          satisfied_at: new Date().toISOString(),
          satisfied_by: 'skill-a',
          evidence_type: 'manual',
        }],
      });
      await manager.create(state);

      const result = await manager.getCurrentSkill(state.session_id, testSkills);

      expect(result).not.toBeNull();
      expect(result?.skill.name).toBe('skill-b');
      expect(result?.capability).toBe('cap_b');
    });

    it('returns null when all capabilities satisfied', async () => {
      const state = createTestState({
        chain: ['skill-a', 'skill-b'],
        capabilities_required: ['cap_a', 'cap_b'],
        capabilities_satisfied: [
          {
            capability: 'cap_a',
            satisfied_at: new Date().toISOString(),
            satisfied_by: 'skill-a',
            evidence_type: 'manual',
          },
          {
            capability: 'cap_b',
            satisfied_at: new Date().toISOString(),
            satisfied_by: 'skill-b',
            evidence_type: 'manual',
          },
        ],
      });
      await manager.create(state);

      const result = await manager.getCurrentSkill(state.session_id, testSkills);

      expect(result).toBeNull();
    });

    it('returns null for non-existent session', async () => {
      const result = await manager.getCurrentSkill('nonexistent', testSkills);
      expect(result).toBeNull();
    });
  });
});

describe('generateSessionId', () => {
  it('generates unique IDs', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();

    expect(id1).not.toBe(id2);
  });

  it('generates valid UUID format', () => {
    const id = generateSessionId();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(id)).toBe(true);
  });
});
