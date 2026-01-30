import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveDependencies,
  detectMissingDependencies,
  getDependentsOf,
  type SkillDependency,
  type DependencyGraph,
  type CircularDependencyError
} from './resolver.js';

/**
 * Mock dependency graph for testing
 *
 * Graph structure:
 * - skill-a depends on [skill-b]
 * - skill-b depends on [skill-c]
 * - skill-c depends on [] (no dependencies)
 * - skill-d depends on [skill-a, skill-c] (multiple dependencies)
 * - skill-circular-1 depends on [skill-circular-2]
 * - skill-circular-2 depends on [skill-circular-1] (circular)
 * - skill-self depends on [skill-self] (self-referential)
 */
const mockDependencyGraph: DependencyGraph = {
  'skill-a': ['skill-b'],
  'skill-b': ['skill-c'],
  'skill-c': [],
  'skill-d': ['skill-a', 'skill-c'],
  'skill-circular-1': ['skill-circular-2'],
  'skill-circular-2': ['skill-circular-1'],
  'skill-self': ['skill-self'],
  'tdd': ['no-workarounds'],
  'no-workarounds': []
};

describe('Dependency Resolver', () => {
  describe('resolveDependencies', () => {
    it('returns empty array when skill has no dependencies', () => {
      const result = resolveDependencies('skill-c', [], mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('returns direct dependencies when not installed', () => {
      const result = resolveDependencies('skill-a', [], mockDependencyGraph);
      // skill-a depends on skill-b, which depends on skill-c
      // Should return in install order: skill-c first, then skill-b
      expect(result).toContain('skill-b');
      expect(result).toContain('skill-c');
      // skill-c should come before skill-b (dependency order)
      expect(result.indexOf('skill-c')).toBeLessThan(result.indexOf('skill-b'));
    });

    it('resolves transitive dependencies (A depends on B, B depends on C)', () => {
      const result = resolveDependencies('skill-a', [], mockDependencyGraph);
      // Should return [skill-c, skill-b] in dependency order
      expect(result).toEqual(['skill-c', 'skill-b']);
    });

    it('excludes already installed dependencies', () => {
      const installed = ['skill-c'];
      const result = resolveDependencies('skill-a', installed, mockDependencyGraph);
      // skill-c is installed, so only skill-b should be returned
      expect(result).toEqual(['skill-b']);
    });

    it('returns empty array when all dependencies are installed', () => {
      const installed = ['skill-b', 'skill-c'];
      const result = resolveDependencies('skill-a', installed, mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('handles multiple direct dependencies', () => {
      const result = resolveDependencies('skill-d', [], mockDependencyGraph);
      // skill-d depends on skill-a and skill-c
      // skill-a depends on skill-b, skill-b depends on skill-c
      // Order should be: skill-c, skill-b, skill-a (then skill-d is the one being installed)
      expect(result).toContain('skill-a');
      expect(result).toContain('skill-b');
      expect(result).toContain('skill-c');
      // Dependencies should come before their dependents
      expect(result.indexOf('skill-c')).toBeLessThan(result.indexOf('skill-b'));
      expect(result.indexOf('skill-b')).toBeLessThan(result.indexOf('skill-a'));
    });

    it('returns empty array for unknown skill', () => {
      const result = resolveDependencies('unknown-skill', [], mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('handles real-world example: tdd depends on no-workarounds', () => {
      const result = resolveDependencies('tdd', [], mockDependencyGraph);
      expect(result).toEqual(['no-workarounds']);
    });
  });

  describe('circular dependency detection', () => {
    it('detects and reports circular dependencies', () => {
      expect(() => {
        resolveDependencies('skill-circular-1', [], mockDependencyGraph);
      }).toThrow();
    });

    it('includes cycle path in error message', () => {
      try {
        resolveDependencies('skill-circular-1', [], mockDependencyGraph);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('circular');
        expect(message.toLowerCase()).toContain('skill-circular-1');
        expect(message.toLowerCase()).toContain('skill-circular-2');
      }
    });

    it('detects self-referential dependencies', () => {
      expect(() => {
        resolveDependencies('skill-self', [], mockDependencyGraph);
      }).toThrow();
    });
  });

  describe('detectMissingDependencies', () => {
    it('returns empty array when no dependencies are missing', () => {
      const installed = ['skill-b', 'skill-c'];
      const result = detectMissingDependencies('skill-a', installed, mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('detects missing direct dependencies', () => {
      const installed: string[] = [];
      const result = detectMissingDependencies('skill-a', installed, mockDependencyGraph);
      expect(result).toContain('skill-b');
    });

    it('detects missing transitive dependencies', () => {
      const installed = ['skill-b']; // skill-b is installed but skill-c is not
      const result = detectMissingDependencies('skill-a', installed, mockDependencyGraph);
      // skill-c is a transitive dependency through skill-b
      expect(result).toContain('skill-c');
    });

    it('returns all missing dependencies in correct order', () => {
      const installed: string[] = [];
      const result = detectMissingDependencies('skill-d', installed, mockDependencyGraph);
      // Should return missing deps in install order
      expect(result).toContain('skill-a');
      expect(result).toContain('skill-b');
      expect(result).toContain('skill-c');
    });

    it('returns empty array for skill with no dependencies', () => {
      const result = detectMissingDependencies('skill-c', [], mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('returns empty array for unknown skill', () => {
      const result = detectMissingDependencies('unknown-skill', [], mockDependencyGraph);
      expect(result).toEqual([]);
    });
  });

  describe('getDependentsOf', () => {
    it('returns skills that depend on the given skill', () => {
      const result = getDependentsOf('skill-c', mockDependencyGraph);
      // skill-b and skill-d directly depend on skill-c
      expect(result).toContain('skill-b');
      expect(result).toContain('skill-d');
    });

    it('returns empty array when no skills depend on it', () => {
      const result = getDependentsOf('skill-d', mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('warns on remove if skill is depended upon', () => {
      const dependents = getDependentsOf('skill-b', mockDependencyGraph);
      // skill-a depends on skill-b
      expect(dependents).toContain('skill-a');
    });

    it('returns transitive dependents', () => {
      // skill-c is depended on by skill-b
      // skill-b is depended on by skill-a
      // skill-a is depended on by skill-d
      const result = getDependentsOf('skill-c', mockDependencyGraph);
      // Direct dependents
      expect(result).toContain('skill-b');
      expect(result).toContain('skill-d');
    });

    it('returns empty array for unknown skill', () => {
      const result = getDependentsOf('unknown-skill', mockDependencyGraph);
      expect(result).toEqual([]);
    });

    it('handles circular dependency graph without infinite loop', () => {
      // Should not hang, should return the other skill in the cycle
      const result = getDependentsOf('skill-circular-1', mockDependencyGraph);
      expect(result).toContain('skill-circular-2');
    });
  });
});

describe('SkillDependency type', () => {
  it('correctly represents a skill with dependencies', () => {
    const skill: SkillDependency = {
      skillName: 'tdd',
      dependencies: ['no-workarounds']
    };
    expect(skill.skillName).toBe('tdd');
    expect(skill.dependencies).toContain('no-workarounds');
  });

  it('represents a skill with no dependencies', () => {
    const skill: SkillDependency = {
      skillName: 'standalone-skill',
      dependencies: []
    };
    expect(skill.skillName).toBe('standalone-skill');
    expect(skill.dependencies).toHaveLength(0);
  });
});
