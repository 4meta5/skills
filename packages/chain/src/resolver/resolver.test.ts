import { describe, it, expect } from 'vitest';
import { resolve, detectConflicts, validateChain } from './resolver.js';
import type { SkillSpec, ProfileSpec } from '../types/index.js';

function createSkill(
  name: string,
  provides: string[] = [],
  requires: string[] = [],
  options: Partial<SkillSpec> = {}
): SkillSpec {
  return {
    name,
    skill_path: `${name}/SKILL.md`,
    provides,
    requires,
    conflicts: [],
    risk: 'medium',
    cost: 'medium',
    artifacts: [],
    ...options,
  };
}

function createProfile(
  name: string,
  capabilities_required: string[],
  options: Partial<ProfileSpec> = {}
): ProfileSpec {
  return {
    name,
    capabilities_required,
    match: [],
    strictness: 'advisory',
    completion_requirements: [],
    priority: 0,
    ...options,
  };
}

describe('resolve', () => {
  it('resolves simple linear chain', () => {
    const skills = [
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b'], ['cap_a']),
      createSkill('c', ['cap_c'], ['cap_b']),
    ];
    const profile = createProfile('test', ['cap_c']);

    const result = resolve(profile, skills);

    expect(result.chain).toEqual(['a', 'b', 'c']);
    expect(result.warnings).toHaveLength(0);
  });

  it('resolves with multiple providers using tie-breaking', () => {
    const skills = [
      createSkill('high-risk', ['cap_a'], [], { risk: 'high', cost: 'low' }),
      createSkill('low-risk', ['cap_a'], [], { risk: 'low', cost: 'low' }),
    ];
    const profile = createProfile('test', ['cap_a']);

    const result = resolve(profile, skills);

    expect(result.chain).toEqual(['low-risk']);
  });

  it('uses cost for tie-breaking when risk is equal', () => {
    const skills = [
      createSkill('high-cost', ['cap_a'], [], { risk: 'low', cost: 'high' }),
      createSkill('low-cost', ['cap_a'], [], { risk: 'low', cost: 'low' }),
    ];
    const profile = createProfile('test', ['cap_a']);

    const result = resolve(profile, skills);

    expect(result.chain).toEqual(['low-cost']);
  });

  it('uses alphabetical for tie-breaking when risk and cost are equal', () => {
    const skills = [
      createSkill('zebra', ['cap_a'], [], { risk: 'low', cost: 'low' }),
      createSkill('alpha', ['cap_a'], [], { risk: 'low', cost: 'low' }),
    ];
    const profile = createProfile('test', ['cap_a']);

    const result = resolve(profile, skills);

    expect(result.chain).toEqual(['alpha']);
  });

  it('satisfies transitive dependencies', () => {
    const skills = [
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b'], ['cap_a']),
      createSkill('c', ['cap_c'], ['cap_b']),
      createSkill('d', ['cap_d'], ['cap_c']),
    ];
    const profile = createProfile('test', ['cap_d']);

    const result = resolve(profile, skills);

    expect(result.chain).toEqual(['a', 'b', 'c', 'd']);
  });

  it('warns when capability cannot be satisfied', () => {
    const skills = [
      createSkill('a', ['cap_a']),
    ];
    const profile = createProfile('test', ['cap_missing']);

    const result = resolve(profile, skills);

    expect(result.warnings).toContain('No skill provides capability "cap_missing"');
  });

  it('detects conflicts and fails fast by default', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['b'] }),
      createSkill('b', ['cap_b']),
    ];
    const profile = createProfile('test', ['cap_a', 'cap_b']);

    expect(() => resolve(profile, skills)).toThrow(/conflict/i);
  });

  it('collects conflicts when failFast is false', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['b'] }),
      createSkill('b', ['cap_b']),
    ];
    const profile = createProfile('test', ['cap_a', 'cap_b']);

    const result = resolve(profile, skills, { failFast: false });

    expect(result.warnings.some(w => w.includes('conflict'))).toBe(true);
  });

  it('collects blocked intents from tool policy', () => {
    const skills = [
      createSkill('tdd', ['test_written', 'test_green'], [], {
        tool_policy: {
          deny_until: {
            write: { until: 'test_written', reason: 'TDD RED phase' },
            commit: { until: 'test_green', reason: 'TDD GREEN phase' },
          },
        },
      }),
    ];
    const profile = createProfile('test', ['test_green']);

    const result = resolve(profile, skills);

    expect(result.blocked_intents.write).toBe('TDD RED phase');
    expect(result.blocked_intents.commit).toBe('TDD GREEN phase');
  });

  it('includes explanations for each skill', () => {
    const skills = [
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b'], ['cap_a']),
    ];
    const profile = createProfile('test', ['cap_b']);

    const result = resolve(profile, skills);

    expect(result.explanations).toHaveLength(2);
    expect(result.explanations[0].skill).toBe('a');
    expect(result.explanations[1].skill).toBe('b');
    expect(result.explanations[1].reason).toContain('cap_b');
  });

  it('skips already satisfied capabilities', () => {
    const skills = [
      createSkill('a', ['cap_a', 'cap_b']),
      createSkill('b', ['cap_b']), // Also provides cap_b, but a provides it too
    ];
    const profile = createProfile('test', ['cap_a', 'cap_b']);

    const result = resolve(profile, skills);

    // Should only select 'a' since it provides both capabilities
    expect(result.chain).toEqual(['a']);
  });

  it('produces deterministic results', () => {
    const skills = [
      createSkill('c', ['cap_c']),
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b']),
    ];
    const profile = createProfile('test', ['cap_a', 'cap_b', 'cap_c']);

    const result1 = resolve(profile, skills);
    const result2 = resolve(profile, skills);

    expect(result1.chain).toEqual(result2.chain);
  });
});

describe('detectConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const skills = [
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b']),
    ];

    const conflicts = detectConflicts(skills);

    expect(conflicts).toHaveLength(0);
  });

  it('detects declared conflicts', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['b'] }),
      createSkill('b', ['cap_b']),
    ];

    const conflicts = detectConflicts(skills);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].skill1).toBe('a');
    expect(conflicts[0].skill2).toBe('b');
  });

  it('detects mutual conflicts', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['b'] }),
      createSkill('b', ['cap_b'], [], { conflicts: ['a'] }),
    ];

    const conflicts = detectConflicts(skills);

    expect(conflicts).toHaveLength(2);
  });

  it('ignores conflicts with non-present skills', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['nonexistent'] }),
    ];

    const conflicts = detectConflicts(skills);

    expect(conflicts).toHaveLength(0);
  });
});

describe('validateChain', () => {
  it('validates correct chain', () => {
    const skills = [
      createSkill('a', ['cap_a']),
      createSkill('b', ['cap_b'], ['cap_a']),
    ];

    const result = validateChain(['a', 'b'], skills);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports missing skills', () => {
    const skills = [
      createSkill('a', ['cap_a']),
    ];

    const result = validateChain(['a', 'missing'], skills);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Skill "missing" not found');
  });

  it('reports conflicts', () => {
    const skills = [
      createSkill('a', ['cap_a'], [], { conflicts: ['b'] }),
      createSkill('b', ['cap_b']),
    ];

    const result = validateChain(['a', 'b'], skills);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('conflict'))).toBe(true);
  });

  it('reports cycles', () => {
    const skills = [
      createSkill('a', ['cap_a'], ['cap_b']),
      createSkill('b', ['cap_b'], ['cap_a']),
    ];

    const result = validateChain(['a', 'b'], skills);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Cycle'))).toBe(true);
  });
});
