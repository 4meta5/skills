import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { hookPreToolUseCommand } from './hook.js';
import { StateManager } from '../../session/index.js';
import * as yaml from 'yaml';

describe('hookPreToolUseCommand', () => {
  let testDir: string;
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;
  let consoleOutput: string[];
  let consoleErrors: string[];

  beforeEach(async () => {
    testDir = join(tmpdir(), `chain-hook-test-${randomUUID()}`);
    await mkdir(testDir, { recursive: true });
    await mkdir(join(testDir, 'chains'), { recursive: true });

    exitCode = undefined;
    consoleOutput = [];
    consoleErrors = [];

    // Mock process.exit
    originalExit = process.exit;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error(`EXIT_${code}`);
    }) as never;

    // Mock console
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args.join(' '));
    });

    // Create minimal skills.yaml
    const skillsYaml = yaml.stringify({
      version: '1.0',
      skills: [
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
      ],
    });
    await writeFile(join(testDir, 'chains', 'skills.yaml'), skillsYaml);

    // Create profiles.yaml
    const profilesYaml = yaml.stringify({
      version: '1.0',
      profiles: [
        {
          name: 'bug-fix',
          description: 'Bug fix workflow',
          match: ['fix', 'bug', 'error'],
          capabilities_required: ['test_written', 'test_green'],
          strictness: 'strict',
          priority: 10,
          completion_requirements: [],
        },
        {
          name: 'permissive',
          description: 'Default',
          match: [],
          capabilities_required: [],
          strictness: 'permissive',
          priority: 0,
          completion_requirements: [],
        },
      ],
    });
    await writeFile(join(testDir, 'chains', 'profiles.yaml'), profilesYaml);
  });

  afterEach(async () => {
    process.exit = originalExit;
    vi.restoreAllMocks();
    await rm(testDir, { recursive: true, force: true });
  });

  it('auto-activates profile when prompt is provided and matches', async () => {
    const stateManager = new StateManager(testDir);

    // Should have no session initially
    let state = await stateManager.loadCurrent();
    expect(state).toBeNull();

    // Run hook with prompt
    await expect(
      hookPreToolUseCommand({
        tool: JSON.stringify({ tool: 'Read' }),
        cwd: testDir,
        prompt: 'fix the login bug',
      })
    ).rejects.toThrow('EXIT_0');

    // Should have auto-activated bug-fix profile
    state = await stateManager.loadCurrent();
    expect(state).not.toBeNull();
    expect(state!.profile_id).toBe('bug-fix');
  });

  it('does not auto-activate when --no-auto is passed', async () => {
    const stateManager = new StateManager(testDir);

    await expect(
      hookPreToolUseCommand({
        tool: JSON.stringify({ tool: 'Read' }),
        cwd: testDir,
        prompt: 'fix the login bug',
        auto: false,
      })
    ).rejects.toThrow('EXIT_0');

    // Should NOT have activated any profile
    const state = await stateManager.loadCurrent();
    expect(state).toBeNull();
  });

  it('includes auto-activation message in output', async () => {
    await expect(
      hookPreToolUseCommand({
        tool: JSON.stringify({ tool: 'Read' }),
        cwd: testDir,
        prompt: 'fix the bug',
      })
    ).rejects.toThrow('EXIT_0');

    const output = consoleOutput.join('\n');
    expect(output).toContain('auto-activated');
    expect(output).toContain('bug-fix');
  });
});
