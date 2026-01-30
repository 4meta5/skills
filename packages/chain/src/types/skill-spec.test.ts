import { describe, it, expect } from 'vitest';
import {
  RiskLevel,
  CostLevel,
  ToolIntent,
  EvidenceType,
  ArtifactSpec,
  ToolPolicy,
  SkillSpec,
  SkillsConfig,
} from './skill-spec.js';

describe('SkillSpec schemas', () => {
  describe('RiskLevel', () => {
    it('accepts valid risk levels', () => {
      expect(RiskLevel.parse('low')).toBe('low');
      expect(RiskLevel.parse('medium')).toBe('medium');
      expect(RiskLevel.parse('high')).toBe('high');
      expect(RiskLevel.parse('critical')).toBe('critical');
    });

    it('rejects invalid risk levels', () => {
      expect(() => RiskLevel.parse('unknown')).toThrow();
    });
  });

  describe('CostLevel', () => {
    it('accepts valid cost levels', () => {
      expect(CostLevel.parse('low')).toBe('low');
      expect(CostLevel.parse('medium')).toBe('medium');
      expect(CostLevel.parse('high')).toBe('high');
    });

    it('rejects invalid cost levels', () => {
      expect(() => CostLevel.parse('extreme')).toThrow();
    });
  });

  describe('ToolIntent', () => {
    it('accepts valid intents', () => {
      expect(ToolIntent.parse('write')).toBe('write');
      expect(ToolIntent.parse('commit')).toBe('commit');
      expect(ToolIntent.parse('push')).toBe('push');
      expect(ToolIntent.parse('deploy')).toBe('deploy');
      expect(ToolIntent.parse('delete')).toBe('delete');
    });
  });

  describe('EvidenceType', () => {
    it('accepts valid evidence types', () => {
      expect(EvidenceType.parse('file_exists')).toBe('file_exists');
      expect(EvidenceType.parse('marker_found')).toBe('marker_found');
      expect(EvidenceType.parse('command_success')).toBe('command_success');
      expect(EvidenceType.parse('manual')).toBe('manual');
    });
  });

  describe('ArtifactSpec', () => {
    it('parses valid artifact with file_exists', () => {
      const artifact = ArtifactSpec.parse({
        name: 'test_file',
        type: 'file_exists',
        pattern: '**/*.test.ts',
      });
      expect(artifact.name).toBe('test_file');
      expect(artifact.type).toBe('file_exists');
      expect(artifact.pattern).toBe('**/*.test.ts');
    });

    it('parses valid artifact with marker_found', () => {
      const artifact = ArtifactSpec.parse({
        name: 'task_complete',
        type: 'marker_found',
        file: 'PLAN.md',
        pattern: '\\[x\\].*implement',
      });
      expect(artifact.name).toBe('task_complete');
      expect(artifact.file).toBe('PLAN.md');
    });

    it('parses valid artifact with command_success', () => {
      const artifact = ArtifactSpec.parse({
        name: 'tests_pass',
        type: 'command_success',
        command: 'npm test',
        expected_exit_code: 0,
      });
      expect(artifact.command).toBe('npm test');
      expect(artifact.expected_exit_code).toBe(0);
    });

    it('defaults expected_exit_code to 0', () => {
      const artifact = ArtifactSpec.parse({
        name: 'test',
        type: 'command_success',
        command: 'echo ok',
      });
      expect(artifact.expected_exit_code).toBe(0);
    });
  });

  describe('ToolPolicy', () => {
    it('parses empty policy', () => {
      const policy = ToolPolicy.parse({});
      expect(policy.deny_until).toBeUndefined();
    });

    it('parses policy with deny_until rules', () => {
      const policy = ToolPolicy.parse({
        deny_until: {
          write: { until: 'test_written', reason: 'TDD RED phase' },
          commit: { until: 'test_green', reason: 'TDD GREEN phase' },
        },
      });
      expect(policy.deny_until?.write?.until).toBe('test_written');
      expect(policy.deny_until?.commit?.reason).toBe('TDD GREEN phase');
    });
  });

  describe('SkillSpec', () => {
    it('parses minimal skill spec', () => {
      const skill = SkillSpec.parse({
        name: 'tdd',
        skill_path: 'tdd/SKILL.md',
      });
      expect(skill.name).toBe('tdd');
      expect(skill.provides).toEqual([]);
      expect(skill.requires).toEqual([]);
      expect(skill.conflicts).toEqual([]);
      expect(skill.risk).toBe('medium');
      expect(skill.cost).toBe('medium');
      expect(skill.artifacts).toEqual([]);
    });

    it('parses complete skill spec', () => {
      const skill = SkillSpec.parse({
        name: 'tdd',
        skill_path: 'tdd/SKILL.md',
        description: 'Test-driven development workflow',
        provides: ['test_written', 'test_green', 'test_refactored'],
        requires: [],
        conflicts: ['quick-fix'],
        risk: 'low',
        cost: 'medium',
        artifacts: [
          { name: 'test_file', type: 'file_exists', pattern: '**/*.test.ts' },
        ],
        tool_policy: {
          deny_until: {
            write: { until: 'test_written', reason: 'TDD RED phase' },
          },
        },
      });
      expect(skill.provides).toContain('test_written');
      expect(skill.conflicts).toContain('quick-fix');
      expect(skill.risk).toBe('low');
    });

    it('requires name and skill_path', () => {
      expect(() => SkillSpec.parse({})).toThrow();
      expect(() => SkillSpec.parse({ name: 'tdd' })).toThrow();
    });
  });

  describe('SkillsConfig', () => {
    it('parses valid config', () => {
      const config = SkillsConfig.parse({
        version: '1.0',
        skills: [
          { name: 'tdd', skill_path: 'tdd/SKILL.md' },
          { name: 'docs', skill_path: 'doc-maintenance/SKILL.md' },
        ],
      });
      expect(config.version).toBe('1.0');
      expect(config.skills).toHaveLength(2);
    });

    it('defaults version to 1.0', () => {
      const config = SkillsConfig.parse({
        skills: [],
      });
      expect(config.version).toBe('1.0');
    });
  });
});
