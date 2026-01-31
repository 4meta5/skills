import { describe, it, expect } from 'vitest';
import { getSkillGuidance, formatGuidanceOutput, type SkillGuidanceResult } from './skill-guidance.js';
import type { SessionState, SkillSpec } from '../types/index.js';

describe('getSkillGuidance', () => {
  const testSkills: SkillSpec[] = [
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
    },
    {
      name: 'doc-maintenance',
      skill_path: '.claude/skills/doc-maintenance',
      provides: ['docs_updated'],
      requires: ['test_green'],
      conflicts: [],
      risk: 'low',
      cost: 'low',
      tier: 'hard',
      artifacts: [],
    },
    {
      name: 'repo-hygiene',
      skill_path: '.claude/skills/repo-hygiene',
      provides: ['repo_clean'],
      requires: ['docs_updated'],
      conflicts: [],
      risk: 'low',
      cost: 'low',
      tier: 'hard',
      artifacts: [],
    },
  ];

  it('returns guidance for first skill when no capabilities satisfied', () => {
    const state: SessionState = {
      session_id: 'test',
      profile_id: 'bug-fix',
      activated_at: '2024-01-01T00:00:00Z',
      chain: ['tdd', 'doc-maintenance', 'repo-hygiene'],
      capabilities_required: ['test_written', 'test_green', 'docs_updated', 'repo_clean'],
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: 'strict',
      blocked_intents: {},
    };

    const result = getSkillGuidance(state, testSkills);

    expect(result.complete).toBe(false);
    expect(result.currentSkill).toBe('tdd');
    expect(result.nextCapability).toBe('test_written');
    expect(result.satisfiedCount).toBe(0);
    expect(result.totalCount).toBe(4);
  });

  it('returns guidance for second skill when first capabilities satisfied', () => {
    const state: SessionState = {
      session_id: 'test',
      profile_id: 'bug-fix',
      activated_at: '2024-01-01T00:00:00Z',
      chain: ['tdd', 'doc-maintenance', 'repo-hygiene'],
      capabilities_required: ['test_written', 'test_green', 'docs_updated', 'repo_clean'],
      capabilities_satisfied: [
        {
          capability: 'test_written',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        },
        {
          capability: 'test_green',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'command_success',
        },
      ],
      current_skill_index: 0,
      strictness: 'strict',
      blocked_intents: {},
    };

    const result = getSkillGuidance(state, testSkills);

    expect(result.complete).toBe(false);
    expect(result.currentSkill).toBe('doc-maintenance');
    expect(result.nextCapability).toBe('docs_updated');
    expect(result.satisfiedCount).toBe(2);
    expect(result.totalCount).toBe(4);
  });

  it('returns complete when all capabilities satisfied', () => {
    const state: SessionState = {
      session_id: 'test',
      profile_id: 'bug-fix',
      activated_at: '2024-01-01T00:00:00Z',
      chain: ['tdd', 'doc-maintenance'],
      capabilities_required: ['test_written', 'test_green'],
      capabilities_satisfied: [
        {
          capability: 'test_written',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        },
        {
          capability: 'test_green',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'command_success',
        },
      ],
      current_skill_index: 0,
      strictness: 'strict',
      blocked_intents: {},
    };

    const result = getSkillGuidance(state, testSkills);

    expect(result.complete).toBe(true);
    expect(result.currentSkill).toBeNull();
    expect(result.nextCapability).toBeNull();
    expect(result.satisfiedCount).toBe(2);
    expect(result.totalCount).toBe(2);
  });
});

describe('formatGuidanceOutput', () => {
  it('formats in-progress status line', () => {
    const guidance: SkillGuidanceResult = {
      complete: false,
      currentSkill: 'tdd',
      nextCapability: 'test_written',
      satisfiedCount: 0,
      totalCount: 4,
      progressPercent: 0,
    };

    const output = formatGuidanceOutput(guidance, 'bug-fix');

    expect(output).toContain('[chain] bug-fix:');
    expect(output).toContain('0/4');
    expect(output).toContain('0%');
    expect(output).toContain('CURRENT: tdd');
    expect(output).toContain('need: test_written');
    expect(output).toContain('Skill(skill: "tdd")');
  });

  it('formats partial progress', () => {
    const guidance: SkillGuidanceResult = {
      complete: false,
      currentSkill: 'doc-maintenance',
      nextCapability: 'docs_updated',
      satisfiedCount: 2,
      totalCount: 4,
      progressPercent: 50,
    };

    const output = formatGuidanceOutput(guidance, 'bug-fix');

    expect(output).toContain('2/4');
    expect(output).toContain('50%');
    expect(output).toContain('CURRENT: doc-maintenance');
    expect(output).toContain('need: docs_updated');
    expect(output).toContain('Skill(skill: "doc-maintenance")');
  });

  it('formats complete status', () => {
    const guidance: SkillGuidanceResult = {
      complete: true,
      currentSkill: null,
      nextCapability: null,
      satisfiedCount: 4,
      totalCount: 4,
      progressPercent: 100,
    };

    const output = formatGuidanceOutput(guidance, 'bug-fix');

    expect(output).toContain('[chain] bug-fix:');
    expect(output).toContain('4/4');
    expect(output).toContain('100%');
    expect(output).toContain('COMPLETE');
    expect(output).not.toContain('Skill(skill:');
  });
});
