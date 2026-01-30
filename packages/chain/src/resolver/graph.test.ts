import { describe, it, expect } from 'vitest';
import { CapabilityGraph } from './graph.js';
import type { SkillSpec } from '../types/index.js';

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

describe('CapabilityGraph', () => {
  describe('construction', () => {
    it('indexes skills by name', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b']),
      ];
      const graph = new CapabilityGraph(skills);

      expect(graph.getSkill('a')).toBeDefined();
      expect(graph.getSkill('b')).toBeDefined();
      expect(graph.getSkill('c')).toBeUndefined();
    });

    it('indexes capability providers', () => {
      const skills = [
        createSkill('a', ['cap_a', 'cap_shared']),
        createSkill('b', ['cap_b', 'cap_shared']),
      ];
      const graph = new CapabilityGraph(skills);

      expect(graph.getProviders('cap_a').map(s => s.name)).toEqual(['a']);
      expect(graph.getProviders('cap_shared').map(s => s.name)).toEqual(['a', 'b']);
      expect(graph.getProviders('cap_c')).toEqual([]);
    });

    it('builds edges from requirements', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']), // b requires cap_a from a
      ];
      const graph = new CapabilityGraph(skills);
      const edges = graph.getEdges();

      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({
        from: 'a',
        to: 'b',
        capability: 'cap_a',
      });
    });
  });

  describe('getDependents', () => {
    it('returns skills that depend on a skill', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c'], ['cap_a']),
      ];
      const graph = new CapabilityGraph(skills);

      const dependents = graph.getDependents('a');
      expect(dependents).toContain('b');
      expect(dependents).toContain('c');
    });

    it('returns empty array for skills with no dependents', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
      ];
      const graph = new CapabilityGraph(skills);

      expect(graph.getDependents('b')).toEqual([]);
    });
  });

  describe('getDependencies', () => {
    it('returns skills that a skill depends on', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b']),
        createSkill('c', ['cap_c'], ['cap_a', 'cap_b']),
      ];
      const graph = new CapabilityGraph(skills);

      const deps = graph.getDependencies('c');
      expect(deps).toContain('a');
      expect(deps).toContain('b');
    });

    it('returns empty array for skills with no dependencies', () => {
      const skills = [
        createSkill('a', ['cap_a']),
      ];
      const graph = new CapabilityGraph(skills);

      expect(graph.getDependencies('a')).toEqual([]);
    });
  });

  describe('detectCycles', () => {
    it('detects no cycle in acyclic graph', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c'], ['cap_b']),
      ];
      const graph = new CapabilityGraph(skills);

      const result = graph.detectCycles();
      expect(result.hasCycle).toBe(false);
      expect(result.cycle).toEqual([]);
    });

    it('detects simple cycle', () => {
      const skills = [
        createSkill('a', ['cap_a'], ['cap_b']),
        createSkill('b', ['cap_b'], ['cap_a']),
      ];
      const graph = new CapabilityGraph(skills);

      const result = graph.detectCycles();
      expect(result.hasCycle).toBe(true);
      expect(result.cycle.length).toBeGreaterThan(0);
    });

    it('detects cycle in larger graph', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c'], ['cap_b']),
        createSkill('d', ['cap_a'], ['cap_c']), // d provides cap_a but requires cap_c
      ];
      // Cycle: a -> b -> c -> d -> a (through cap_a)
      const graph = new CapabilityGraph(skills);

      const result = graph.detectCycles();
      expect(result.hasCycle).toBe(true);
    });
  });

  describe('topologicalSort', () => {
    it('returns skills in dependency order', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c'], ['cap_b']),
      ];
      const graph = new CapabilityGraph(skills);

      const sorted = graph.topologicalSort();
      expect(sorted).not.toBeNull();
      expect(sorted).toEqual(['a', 'b', 'c']);
    });

    it('returns null for cyclic graph', () => {
      const skills = [
        createSkill('a', ['cap_a'], ['cap_b']),
        createSkill('b', ['cap_b'], ['cap_a']),
      ];
      const graph = new CapabilityGraph(skills);

      const sorted = graph.topologicalSort();
      expect(sorted).toBeNull();
    });

    it('uses tie-breaking for independent skills', () => {
      const skills = [
        createSkill('b', ['cap_b'], [], { risk: 'medium', cost: 'low' }),
        createSkill('a', ['cap_a'], [], { risk: 'low', cost: 'low' }),
        createSkill('c', ['cap_c'], [], { risk: 'low', cost: 'medium' }),
      ];
      const graph = new CapabilityGraph(skills);

      const sorted = graph.topologicalSort();
      expect(sorted).not.toBeNull();
      // a (low risk, low cost) should come before c (low risk, medium cost)
      // which should come before b (medium risk, low cost)
      expect(sorted).toEqual(['a', 'c', 'b']);
    });

    it('uses alphabetical tie-breaking when risk and cost are equal', () => {
      const skills = [
        createSkill('zebra', ['cap_z'], [], { risk: 'low', cost: 'low' }),
        createSkill('alpha', ['cap_a'], [], { risk: 'low', cost: 'low' }),
        createSkill('beta', ['cap_b'], [], { risk: 'low', cost: 'low' }),
      ];
      const graph = new CapabilityGraph(skills);

      const sorted = graph.topologicalSort();
      expect(sorted).not.toBeNull();
      expect(sorted).toEqual(['alpha', 'beta', 'zebra']);
    });
  });

  describe('getSubgraph', () => {
    it('returns subgraph with only needed skills', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c']), // Not needed
        createSkill('d', ['cap_d'], ['cap_b']),
      ];
      const graph = new CapabilityGraph(skills);

      const subgraph = graph.getSubgraph(['cap_d']);
      const subSkills = subgraph.getSkills().map(s => s.name);

      expect(subSkills).toContain('a');
      expect(subSkills).toContain('b');
      expect(subSkills).toContain('d');
      expect(subSkills).not.toContain('c');
    });

    it('includes transitive dependencies', () => {
      const skills = [
        createSkill('a', ['cap_a']),
        createSkill('b', ['cap_b'], ['cap_a']),
        createSkill('c', ['cap_c'], ['cap_b']),
        createSkill('d', ['cap_d'], ['cap_c']),
      ];
      const graph = new CapabilityGraph(skills);

      const subgraph = graph.getSubgraph(['cap_d']);
      const subSkills = subgraph.getSkills().map(s => s.name);

      expect(subSkills).toHaveLength(4);
      expect(subSkills).toContain('a');
      expect(subSkills).toContain('b');
      expect(subSkills).toContain('c');
      expect(subSkills).toContain('d');
    });
  });
});
