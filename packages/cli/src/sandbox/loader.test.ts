import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseSandboxConfig,
  loadSandboxPolicy,
  getPolicyForPhase
} from './loader.js';
import type { SandboxConfig, TDDPhase } from './types.js';

describe('sandbox loader', () => {
  describe('parseSandboxConfig', () => {
    it('returns undefined when no sandbox field', () => {
      const frontmatter = {
        name: 'test-skill',
        description: 'A test skill'
      };

      const result = parseSandboxConfig(frontmatter);

      expect(result).toBeUndefined();
    });

    it('parses valid sandbox config with all fields', () => {
      const frontmatter = {
        name: 'tdd',
        description: 'TDD workflow',
        sandbox: {
          state: 'BLOCKED',
          profiles: {
            BLOCKED: {
              name: 'blocked-phase',
              allowCommands: ['git status', 'npm test'],
              denyCommands: ['npm run build'],
              allowWrite: ['**/*.test.ts'],
              denyWrite: ['src/**/*.ts']
            },
            RED: {
              name: 'red-phase',
              allowCommands: ['git status', 'npm test'],
              denyCommands: [],
              allowWrite: ['**/*.test.ts'],
              denyWrite: ['src/**/*.ts']
            },
            GREEN: {
              name: 'green-phase',
              allowCommands: ['*'],
              allowWrite: ['**/*'],
              denyCommands: [],
              denyWrite: []
            },
            COMPLETE: {
              name: 'complete-phase',
              allowCommands: ['*'],
              allowWrite: ['**/*'],
              denyCommands: [],
              denyWrite: []
            }
          }
        }
      };

      const result = parseSandboxConfig(frontmatter);

      expect(result).toBeDefined();
      expect(result!.state).toBe('BLOCKED');
      expect(result!.profiles.BLOCKED!.allowCommands).toEqual(['git status', 'npm test']);
      expect(result!.profiles.BLOCKED!.denyCommands).toEqual(['npm run build']);
      expect(result!.profiles.BLOCKED!.allowWrite).toEqual(['**/*.test.ts']);
      expect(result!.profiles.BLOCKED!.denyWrite).toEqual(['src/**/*.ts']);
    });

    it('parses sandbox config and fills defaults for missing fields', () => {
      const frontmatter = {
        name: 'simple-skill',
        description: 'Simple skill',
        sandbox: {
          state: 'RED',
          profiles: {
            RED: {
              allowCommands: ['npm test']
            }
          }
        }
      };

      const result = parseSandboxConfig(frontmatter);

      expect(result).toBeDefined();
      expect(result!.state).toBe('RED');
      expect(result!.profiles.RED!.allowCommands).toEqual(['npm test']);
      // Missing fields should have defaults
      expect(result!.profiles.RED!.name).toBe('RED');
      expect(result!.profiles.RED!.denyCommands).toEqual([]);
      expect(result!.profiles.RED!.allowWrite).toEqual([]);
      expect(result!.profiles.RED!.denyWrite).toEqual([]);
    });

    it('throws on invalid sandbox config - missing state', () => {
      const frontmatter = {
        name: 'bad-skill',
        description: 'Bad skill',
        sandbox: {
          profiles: {
            RED: { allowCommands: ['npm test'] }
          }
        }
      };

      expect(() => parseSandboxConfig(frontmatter)).toThrow('Invalid sandbox config: missing required "state" field');
    });

    it('throws on invalid sandbox config - missing profiles', () => {
      const frontmatter = {
        name: 'bad-skill',
        description: 'Bad skill',
        sandbox: {
          state: 'RED'
        }
      };

      expect(() => parseSandboxConfig(frontmatter)).toThrow('Invalid sandbox config: missing required "profiles" field');
    });

    it('throws on invalid sandbox config - state not in profiles', () => {
      const frontmatter = {
        name: 'bad-skill',
        description: 'Bad skill',
        sandbox: {
          state: 'BLOCKED',
          profiles: {
            RED: { allowCommands: ['npm test'] }
          }
        }
      };

      expect(() => parseSandboxConfig(frontmatter)).toThrow('Invalid sandbox config: state "BLOCKED" not found in profiles');
    });

    it('should throw on invalid TDDPhase value', () => {
      const frontmatter = {
        name: 'bad-phase',
        description: 'Bad phase skill',
        sandbox: {
          state: 'INVALID_PHASE', // Not a valid TDDPhase
          profiles: {
            INVALID_PHASE: { allowCommands: ['npm test'] }
          }
        }
      };

      expect(() => parseSandboxConfig(frontmatter)).toThrow(/invalid.*state|TDD.*phase/i);
    });

    it('should throw on wrong type for sandbox.profiles object', () => {
      const frontmatter = {
        name: 'wrong-profiles-type',
        description: 'Wrong profiles type',
        sandbox: {
          state: 'RED',
          profiles: 'not-an-object' // Should be an object
        }
      };

      expect(() => parseSandboxConfig(frontmatter)).toThrow(/profiles/i);
    });
  });

  describe('getPolicyForPhase', () => {
    const config: SandboxConfig = {
      state: 'BLOCKED',
      profiles: {
        BLOCKED: {
          name: 'blocked-phase',
          allowCommands: ['git status'],
          denyCommands: ['npm run build'],
          allowWrite: ['**/*.test.ts'],
          denyWrite: ['src/**/*.ts']
        },
        RED: {
          name: 'red-phase',
          allowCommands: ['git status', 'npm test'],
          denyCommands: [],
          allowWrite: ['**/*.test.ts'],
          denyWrite: ['src/**/*.ts']
        },
        GREEN: {
          name: 'green-phase',
          allowCommands: ['*'],
          allowWrite: ['**/*'],
          denyCommands: [],
          denyWrite: []
        },
        COMPLETE: {
          name: 'complete-phase',
          allowCommands: ['*'],
          allowWrite: ['**/*'],
          denyCommands: [],
          denyWrite: []
        }
      }
    };

    it('returns correct policy for BLOCKED phase', () => {
      const policy = getPolicyForPhase(config, 'BLOCKED');

      expect(policy.allowCommands).toEqual(['git status']);
      expect(policy.denyCommands).toEqual(['npm run build']);
      expect(policy.allowWrite).toEqual(['**/*.test.ts']);
      expect(policy.denyWrite).toEqual(['src/**/*.ts']);
    });

    it('returns correct policy for RED phase', () => {
      const policy = getPolicyForPhase(config, 'RED');

      expect(policy.allowCommands).toEqual(['git status', 'npm test']);
      expect(policy.denyCommands).toEqual([]);
      expect(policy.allowWrite).toEqual(['**/*.test.ts']);
      expect(policy.denyWrite).toEqual(['src/**/*.ts']);
    });

    it('returns correct policy for GREEN phase', () => {
      const policy = getPolicyForPhase(config, 'GREEN');

      expect(policy.allowCommands).toEqual(['*']);
      expect(policy.allowWrite).toEqual(['**/*']);
    });

    it('returns correct policy for COMPLETE phase', () => {
      const policy = getPolicyForPhase(config, 'COMPLETE');

      expect(policy.allowCommands).toEqual(['*']);
      expect(policy.allowWrite).toEqual(['**/*']);
    });

    it('throws when phase not found in profiles', () => {
      // Use Partial to allow a config without all phases
      const limitedConfig = {
        state: 'RED' as TDDPhase,
        profiles: {
          RED: {
            name: 'red-phase',
            allowCommands: ['npm test'],
            denyCommands: [],
            allowWrite: [],
            denyWrite: []
          }
        }
      } as SandboxConfig;

      expect(() => getPolicyForPhase(limitedConfig, 'GREEN')).toThrow('Phase "GREEN" not found in sandbox profiles');
    });
  });

  describe('loadSandboxPolicy', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `sandbox-loader-test-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    it('loads sandbox config from SKILL.md file', async () => {
      const skillContent = `---
name: tdd
description: TDD workflow
sandbox:
  state: BLOCKED
  profiles:
    BLOCKED:
      name: blocked-phase
      allowCommands:
        - git status
        - npm test
      denyCommands:
        - npm run build
      allowWrite:
        - "**/*.test.ts"
      denyWrite:
        - "src/**/*.ts"
    RED:
      name: red-phase
      allowCommands:
        - git status
        - npm test
      denyCommands: []
      allowWrite:
        - "**/*.test.ts"
      denyWrite:
        - "src/**/*.ts"
---

# TDD Workflow

This is the TDD workflow skill.
`;

      await writeFile(join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

      const result = await loadSandboxPolicy(tempDir);

      expect(result).toBeDefined();
      expect(result!.state).toBe('BLOCKED');
      expect(result!.profiles.BLOCKED!.allowCommands).toEqual(['git status', 'npm test']);
      expect(result!.profiles.BLOCKED!.denyCommands).toEqual(['npm run build']);
    });

    it('returns undefined when SKILL.md has no sandbox section', async () => {
      const skillContent = `---
name: simple-skill
description: A simple skill without sandbox
---

# Simple Skill

No sandbox config here.
`;

      await writeFile(join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

      const result = await loadSandboxPolicy(tempDir);

      expect(result).toBeUndefined();
    });

    it('throws when SKILL.md does not exist', async () => {
      await expect(loadSandboxPolicy(tempDir)).rejects.toThrow('SKILL.md not found');
    });

    it('throws when SKILL.md has invalid frontmatter', async () => {
      const skillContent = `# No Frontmatter

This file has no YAML frontmatter.
`;

      await writeFile(join(tempDir, 'SKILL.md'), skillContent, 'utf-8');

      await expect(loadSandboxPolicy(tempDir)).rejects.toThrow('Invalid SKILL.md format');
    });
  });
});
