import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('command write guards', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('addCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { addCommand } = await import('./add.js');
    await expect(addCommand(['tdd'], { cwd: process.cwd() })).rejects.toThrow('guard');
  });

  it('removeCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { removeCommand } = await import('./remove.js');
    await expect(removeCommand(['tdd'], { cwd: process.cwd() })).rejects.toThrow('guard');
  });

  it('hookCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { hookCommand } = await import('./hook.js');
    await expect(hookCommand('add', ['usage-tracker'], { cwd: process.cwd() })).rejects.toThrow('guard');
  });

  it('scanCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { scanCommand } = await import('./scan.js');
    await expect(scanCommand({ cwd: process.cwd(), all: true, yes: true })).rejects.toThrow('guard');
  });

  it('initCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { initCommand } = await import('./init.js');
    const tempDir = await mkdtemp(join(tmpdir(), 'skills-init-guard-'));
    try {
      await expect(initCommand(tempDir, { skills: ['tdd'] })).rejects.toThrow('guard');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('claudemdCommand calls guard before writing', async () => {
    vi.mock('../test/guard.js', () => ({
      assertTestSafeProjectPath: vi.fn(() => {
        throw new Error('guard');
      })
    }));

    const { claudemdCommand } = await import('./claudemd.js');
    await expect(claudemdCommand('sync', [], { cwd: process.cwd() })).rejects.toThrow('guard');
  });

});
