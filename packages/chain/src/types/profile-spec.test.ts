import { describe, it, expect } from 'vitest';
import {
  Strictness,
  CompletionRequirement,
  ProfileSpec,
  ProfilesConfig,
} from './profile-spec.js';

describe('ProfileSpec schemas', () => {
  describe('Strictness', () => {
    it('accepts valid strictness levels', () => {
      expect(Strictness.parse('strict')).toBe('strict');
      expect(Strictness.parse('advisory')).toBe('advisory');
      expect(Strictness.parse('permissive')).toBe('permissive');
    });

    it('rejects invalid strictness levels', () => {
      expect(() => Strictness.parse('relaxed')).toThrow();
    });
  });

  describe('CompletionRequirement', () => {
    it('parses file_exists requirement', () => {
      const req = CompletionRequirement.parse({
        name: 'test_exists',
        type: 'file_exists',
        pattern: '**/*.test.ts',
        description: 'Test file must exist',
      });
      expect(req.name).toBe('test_exists');
      expect(req.type).toBe('file_exists');
      expect(req.pattern).toBe('**/*.test.ts');
    });

    it('parses marker_found requirement', () => {
      const req = CompletionRequirement.parse({
        name: 'task_complete',
        type: 'marker_found',
        file: 'PLAN.md',
        pattern: '\\[x\\]',
      });
      expect(req.file).toBe('PLAN.md');
    });

    it('parses command_success requirement', () => {
      const req = CompletionRequirement.parse({
        name: 'tests_pass',
        type: 'command_success',
        command: 'npm test',
      });
      expect(req.command).toBe('npm test');
      expect(req.expected_exit_code).toBe(0);
    });

    it('requires name and type', () => {
      expect(() => CompletionRequirement.parse({})).toThrow();
      expect(() => CompletionRequirement.parse({ name: 'test' })).toThrow();
    });
  });

  describe('ProfileSpec', () => {
    it('parses minimal profile', () => {
      const profile = ProfileSpec.parse({
        name: 'bug-fix',
        capabilities_required: ['test_written', 'test_green'],
      });
      expect(profile.name).toBe('bug-fix');
      expect(profile.match).toEqual([]);
      expect(profile.strictness).toBe('advisory');
      expect(profile.completion_requirements).toEqual([]);
      expect(profile.priority).toBe(0);
    });

    it('parses complete profile', () => {
      const profile = ProfileSpec.parse({
        name: 'bug-fix',
        description: 'Workflow for fixing bugs with TDD',
        match: ['fix', 'bug', 'broken', 'failing test'],
        capabilities_required: ['test_written', 'test_green', 'docs_updated'],
        strictness: 'strict',
        completion_requirements: [
          { name: 'test_file', type: 'file_exists', pattern: '**/*.test.ts' },
        ],
        priority: 10,
      });
      expect(profile.match).toContain('fix');
      expect(profile.strictness).toBe('strict');
      expect(profile.priority).toBe(10);
    });

    it('requires name and capabilities_required', () => {
      expect(() => ProfileSpec.parse({})).toThrow();
      expect(() => ProfileSpec.parse({ name: 'test' })).toThrow();
    });
  });

  describe('ProfilesConfig', () => {
    it('parses valid config', () => {
      const config = ProfilesConfig.parse({
        version: '1.0',
        profiles: [
          { name: 'bug-fix', capabilities_required: ['test_green'] },
          { name: 'docs-only', capabilities_required: ['docs_updated'] },
        ],
        default_profile: 'docs-only',
      });
      expect(config.profiles).toHaveLength(2);
      expect(config.default_profile).toBe('docs-only');
    });

    it('defaults version to 1.0', () => {
      const config = ProfilesConfig.parse({
        profiles: [],
      });
      expect(config.version).toBe('1.0');
    });

    it('allows omitting default_profile', () => {
      const config = ProfilesConfig.parse({
        profiles: [],
      });
      expect(config.default_profile).toBeUndefined();
    });
  });
});
