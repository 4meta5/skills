import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { getProjectInstallation, untrackProjectInstallation } from '../config.js';

describe('hook command', () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'skills-hook-test-'));
    // Create target project structure
    await mkdir(join(targetDir, '.claude'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up tracking BEFORE deleting filesystem (prevents ghost entries in config)
    await untrackProjectInstallation(targetDir, 'skill-forced-eval', 'hook');
    await untrackProjectInstallation(targetDir, 'usage-tracker', 'hook');
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

    it('should have NO EXCEPTIONS section in hook content', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['skill-forced-eval'], { cwd: targetDir });

      const hookPath = join(targetDir, '.claude', 'hooks', 'skill-forced-eval.sh');
      const content = await readFile(hookPath, 'utf-8');

      // Hook MUST contain absolute blocking language with no exceptions
      expect(content).toContain('NO EXCEPTIONS');
      expect(content).toContain('BLOCKED');

      // Hook MUST NOT contain exception language that allows weaseling out
      expect(content).not.toContain('Exceptions (Rare)');
      expect(content).not.toContain('Manual intervention is acceptable');
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

  describe('usage-tracker hook', () => {
    it('should install usage-tracker hook', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['usage-tracker'], { cwd: targetDir });

      // Verify hook was installed
      const hookPath = join(targetDir, '.claude', 'hooks', 'usage-tracker.sh');
      const hookStat = await stat(hookPath);
      expect(hookStat.isFile()).toBe(true);

      // Verify hook content includes key elements
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('Usage Tracker');
      expect(content).toContain('SESSION_ID');
    });

    it('should track events via usage-tracker hook', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['usage-tracker'], { cwd: targetDir });

      const hookPath = join(targetDir, '.claude', 'hooks', 'usage-tracker.sh');
      const content = await readFile(hookPath, 'utf-8');

      // Hook should capture session and prompt information
      expect(content).toContain('CLAUDE_SESSION_ID');
      expect(content).toContain('prompt');
    });

    it('should be listed in available hooks', async () => {
      const { hookCommand } = await import('./hook.js');

      // Capture console output
      const originalLog = console.log;
      let output = '';
      console.log = (msg: string) => { output += msg + '\n'; };

      await hookCommand('available', [], { cwd: targetDir });

      console.log = originalLog;

      expect(output).toContain('usage-tracker');
    });

    it('should configure usage-tracker in settings.local.json', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['usage-tracker'], { cwd: targetDir });

      // Verify settings were updated
      const settingsPath = join(targetDir, '.claude', 'settings.local.json');
      const settingsContent = await readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);

      expect(settings.hooks).toBeDefined();
      expect(settings.hooks.UserPromptSubmit).toBeDefined();

      // Check the hook command is configured
      const hookConfigured = settings.hooks.UserPromptSubmit.some(
        (entry: { hooks: Array<{ command: string }> }) =>
          entry.hooks?.some((h: { command: string }) => h.command.includes('usage-tracker.sh'))
      );
      expect(hookConfigured).toBe(true);
    });
  });

  describe('semantic-router hook', () => {
    afterEach(async () => {
      await untrackProjectInstallation(targetDir, 'semantic-router', 'hook');
    });

    it('should install semantic-router hook', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['semantic-router'], { cwd: targetDir });

      // Verify hook was installed
      const hookPath = join(targetDir, '.claude', 'hooks', 'semantic-router.sh');
      const hookStat = await stat(hookPath);
      expect(hookStat.isFile()).toBe(true);

      // Verify hook content includes key elements
      const content = await readFile(hookPath, 'utf-8');
      expect(content).toContain('Semantic Router');
      expect(content).toContain('IMMEDIATE ACTIVATION');
    });

    it('should include Iris architecture thresholds', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['semantic-router'], { cwd: targetDir });

      const hookPath = join(targetDir, '.claude', 'hooks', 'semantic-router.sh');
      const content = await readFile(hookPath, 'utf-8');

      // Verify thresholds are documented
      expect(content).toContain('0.85');
      expect(content).toContain('0.70');
      expect(content).toContain('SUGGESTION MODE');
      expect(content).toContain('CHAT MODE');
    });

    it('should look for vector store in multiple locations', async () => {
      const { hookCommand } = await import('./hook.js');

      await hookCommand('add', ['semantic-router'], { cwd: targetDir });

      const hookPath = join(targetDir, '.claude', 'hooks', 'semantic-router.sh');
      const content = await readFile(hookPath, 'utf-8');

      // Verify it searches multiple paths
      expect(content).toContain('vector_store.json');
      expect(content).toContain('VECTOR_STORE');
    });

    it('should be listed in available hooks', async () => {
      const { hookCommand } = await import('./hook.js');

      // Capture console output
      const originalLog = console.log;
      let output = '';
      console.log = (msg: string) => { output += msg + '\n'; };

      await hookCommand('available', [], { cwd: targetDir });

      console.log = originalLog;

      expect(output).toContain('semantic-router');
    });
  });
});
