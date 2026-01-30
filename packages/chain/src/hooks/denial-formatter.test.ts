import { describe, it, expect } from 'vitest';
import {
  formatIntentDenial,
  formatCompletionDenial,
  formatStatusSummary,
} from './denial-formatter.js';
import type { SessionState, SkillSpec, CompletionRequirement } from '../types/index.js';
import type { EvidenceResult } from '../session/evidence-checker.js';

describe('formatIntentDenial', () => {
  const mockSessionState: SessionState = {
    session_id: 'test-session',
    profile_id: 'bug-fix',
    activated_at: '2024-01-01T00:00:00Z',
    chain: ['tdd', 'doc-maintenance'],
    capabilities_required: ['test_written', 'test_green', 'docs_updated'],
    capabilities_satisfied: [],
    current_skill_index: 0,
    strictness: 'strict',
    blocked_intents: {
      write: 'Tests must be written first (TDD RED phase)',
    },
  };

  const mockSkills: SkillSpec[] = [
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
          write: { until: 'test_written', reason: 'Tests must be written first' },
        },
      },
    },
  ];

  it('formats intent denial with header', () => {
    const result = formatIntentDenial(
      [{ intent: 'write', reason: 'Tests must be written first (TDD RED phase)' }],
      mockSessionState,
      mockSkills
    );

    expect(result).toContain('## CHAIN ENFORCEMENT: BLOCKED');
    expect(result).toContain('**Reason:**');
  });

  it('includes the primary reason', () => {
    const result = formatIntentDenial(
      [{ intent: 'write', reason: 'Tests must be written first (TDD RED phase)' }],
      mockSessionState,
      mockSkills
    );

    expect(result).toContain('Tests must be written first');
  });

  it('includes prerequisites not met section', () => {
    const result = formatIntentDenial(
      [{ intent: 'write', reason: 'Tests must be written first' }],
      mockSessionState,
      mockSkills
    );

    expect(result).toContain('### Prerequisites Not Met:');
    expect(result).toContain('test_written');
  });

  it('includes how to proceed section', () => {
    const result = formatIntentDenial(
      [{ intent: 'write', reason: 'Tests must be written first' }],
      mockSessionState,
      mockSkills
    );

    expect(result).toContain('### How to Proceed:');
  });

  it('suggests next skill when in chain', () => {
    const result = formatIntentDenial(
      [{ intent: 'write', reason: 'Tests must be written first' }],
      mockSessionState,
      mockSkills
    );

    expect(result).toContain('Skill(skill: "tdd")');
  });
});

describe('formatCompletionDenial', () => {
  const mockSessionState: SessionState = {
    session_id: 'test-session',
    profile_id: 'bug-fix',
    activated_at: '2024-01-01T00:00:00Z',
    chain: ['tdd'],
    capabilities_required: ['test_written'],
    capabilities_satisfied: [],
    current_skill_index: 0,
    strictness: 'strict',
    blocked_intents: {},
  };

  it('formats completion denial with header', () => {
    const missing: Array<{ requirement: CompletionRequirement; result: EvidenceResult }> = [
      {
        requirement: {
          name: 'test_file',
          type: 'file_exists',
          pattern: '**/*.test.ts',
          expected_exit_code: 0,
        },
        result: {
          satisfied: false,
          evidence_type: 'file_exists',
          error: 'No files match pattern **/*.test.ts',
        },
      },
    ];

    const result = formatCompletionDenial(missing, mockSessionState);

    expect(result).toContain('## CHAIN ENFORCEMENT: STOP BLOCKED');
  });

  it('includes profile and strictness info', () => {
    const missing: Array<{ requirement: CompletionRequirement; result: EvidenceResult }> = [
      {
        requirement: {
          name: 'test_file',
          type: 'file_exists',
          pattern: '**/*.test.ts',
          expected_exit_code: 0,
        },
        result: { satisfied: false, evidence_type: 'file_exists' },
      },
    ];

    const result = formatCompletionDenial(missing, mockSessionState);

    expect(result).toContain('**Profile:** bug-fix');
    expect(result).toContain('**Strictness:** strict');
  });

  it('lists missing requirements', () => {
    const missing: Array<{ requirement: CompletionRequirement; result: EvidenceResult }> = [
      {
        requirement: {
          name: 'test_file',
          type: 'file_exists',
          description: 'Test file must exist',
          pattern: '**/*.test.ts',
          expected_exit_code: 0,
        },
        result: {
          satisfied: false,
          evidence_type: 'file_exists',
          error: 'No files match pattern',
        },
      },
    ];

    const result = formatCompletionDenial(missing, mockSessionState);

    expect(result).toContain('### Missing Requirements:');
    expect(result).toContain('**test_file**');
    expect(result).toContain('file_exists');
    expect(result).toContain('Test file must exist');
    expect(result).toContain('No files match pattern');
  });

  it('includes how to proceed section', () => {
    const missing: Array<{ requirement: CompletionRequirement; result: EvidenceResult }> = [
      {
        requirement: {
          name: 'test_file',
          type: 'file_exists',
          pattern: '**/*.test.ts',
          expected_exit_code: 0,
        },
        result: { satisfied: false, evidence_type: 'file_exists' },
      },
    ];

    const result = formatCompletionDenial(missing, mockSessionState);

    expect(result).toContain('### How to Proceed:');
    expect(result).toContain('chain clear --force');
  });
});

describe('formatStatusSummary', () => {
  it('formats allowed status', () => {
    const state: SessionState = {
      session_id: 'test',
      profile_id: 'bug-fix',
      activated_at: '2024-01-01T00:00:00Z',
      chain: [],
      capabilities_required: ['a', 'b', 'c', 'd'],
      capabilities_satisfied: [
        {
          capability: 'a',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        },
        {
          capability: 'b',
          satisfied_at: '2024-01-01T00:00:00Z',
          satisfied_by: 'tdd',
          evidence_type: 'file_exists',
        },
      ],
      current_skill_index: 0,
      strictness: 'strict',
      blocked_intents: {},
    };

    const result = formatStatusSummary(state, 'allowed');

    expect(result).toContain('[chain]');
    expect(result).toContain('bug-fix');
    expect(result).toContain('2/4');
    expect(result).toContain('50%');
    expect(result).toContain('allowed');
  });

  it('formats blocked status', () => {
    const state: SessionState = {
      session_id: 'test',
      profile_id: 'new-feature',
      activated_at: '2024-01-01T00:00:00Z',
      chain: [],
      capabilities_required: ['a', 'b'],
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: 'strict',
      blocked_intents: {},
    };

    const result = formatStatusSummary(state, 'blocked');

    expect(result).toContain('[chain]');
    expect(result).toContain('new-feature');
    expect(result).toContain('0/2');
    expect(result).toContain('0%');
    expect(result).toContain('BLOCKED');
  });
});
