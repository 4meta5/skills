import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getProjectInstallation } from '../config.js';

describe('hook command', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'skills-hook-test-'));
    // Create target project structure
    await mkdir(join(targetDir, '.claude'), { recursive: true });
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  describe('hook add', () => {
    it('should install skill-forced-eval hook to target directory', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      // Verify hook was installed
      const hooksDir = join(targetDir, '.claude', 'hooks');
      const hookPath = join(hooksDir, 'skill-forced-eval.sh');

      const hookStat = await stat(hookPath);
      expect(hookStat.isFile()).toBe(true);

      // Verify hook content includes key elements
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('MANDATORY SKILL ACTIVATION');
      expect(content).toContain('tdd');
    });

    it('should configure hook in settings.local.json', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      // Verify settings were updated
      const settingsPath = join(targetDir, '.claude', 'settings.local.json');
      const settingsContent = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);

      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.UserPromptSubmit).toBeDefined();
      expect(settings.hooks.UserPromptSubmit.length).toBeGreaterThan(0);

      // Check the hook command is configured
      const hookEntry = settings.hooks.UserPromptSubmit[0];
      expect(hookEntry.hooks[0].command).toContain('skill-forced-eval.sh');
    });

    it('should make hook executable', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      const hookPath = join(targetDir, '.claude', 'hooks', 'skill-forced-eval.sh');
      const hookStat = await stat(hookPath);

      // Check if executable (mode includes execute bits)
      const isExecutable = (hookStat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    });
  });

  describe('hook list', () => {
    it('should list installed hooks', async () => {
      const { hookCommand } = await import('./hook.js');

      // First install a hook
      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      // Then list hooks (capture output somehow or return value)
      // For now, just verify no error thrown
      await expect(hookCommand('list', [], { cwd: targetDir })).resolves.not.toThrow();
    });
  });

  describe('hook tracking', () => {
    it('should track hook installation in project installations', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      // Verify hook was tracked in project installations
      const installation = await getProjectInstallation(targetDir);
      expect(installation).toBeDefined();
      expect(installation?.hooks).toContain('skill-forced-eval');
    });

    it('should untrack hook when removed', async () => {
      const { hookCommand } = await import('./hook.js');

      // First add the hook
      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      // Verify it's tracked
      let installation = await getProjectInstallation(targetDir);
      expect(installation?.hooks).toContain('skill-forced-eval');

      // Remove the hook
      await hookCommand('remove', ['skill-forced-eval'], { cwd: targetDir });

      // Verify it's untracked
      installation = await getProjectInstallation(targetDir);
      // Project entry might be removed if empty, or hooks array should not contain it
      expect(installation?.hooks?.includes('skill-forced-eval')).toBeFalsy();
    });
  });
});
