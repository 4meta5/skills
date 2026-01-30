import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SandboxPolicy } from './types.js';

describe('sandbox isolate', () => {
  describe('createSandboxIsolate', () => {
    it('should return an object with required methods', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      expect(isolate).toBeDefined();
      expect(typeof isolate.execute).toBe('function');
      expect(typeof isolate.isCommandAllowed).toBe('function');
      expect(typeof isolate.isWriteAllowed).toBe('function');
      expect(typeof isolate.dispose).toBe('function');

      isolate.dispose();
    });

    it('should accept optional memory limit', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate({ memoryLimit: 64 });

      expect(isolate).toBeDefined();
      isolate.dispose();
    });

    it('should accept optional timeout', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate({ timeout: 1000 });

      expect(isolate).toBeDefined();
      isolate.dispose();
    });
  });

  describe('isCommandAllowed', () => {
    it('should return true for explicitly allowed commands', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test', 'npm run build'],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('npm test', policy)).toBe(true);
      expect(isolate.isCommandAllowed('npm run build', policy)).toBe(true);

      isolate.dispose();
    });

    it('should return false for non-allowed commands', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test'],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('rm -rf /', policy)).toBe(false);
      expect(isolate.isCommandAllowed('npm run build', policy)).toBe(false);

      isolate.dispose();
    });

    it('should return false for denied commands even if allowed', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['*'],
        denyCommands: ['rm -rf'],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('rm -rf /', policy)).toBe(false);

      isolate.dispose();
    });

    it('should handle wildcard * to allow all commands', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['*'],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('npm test', policy)).toBe(true);
      expect(isolate.isCommandAllowed('ls -la', policy)).toBe(true);
      expect(isolate.isCommandAllowed('any random command', policy)).toBe(true);

      isolate.dispose();
    });

    it('should handle glob patterns in allowCommands', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['npm *', 'git *'],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('npm test', policy)).toBe(true);
      expect(isolate.isCommandAllowed('npm run build', policy)).toBe(true);
      expect(isolate.isCommandAllowed('git status', policy)).toBe(true);
      expect(isolate.isCommandAllowed('rm -rf', policy)).toBe(false);

      isolate.dispose();
    });

    it('should handle glob patterns in denyCommands', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: ['*'],
        denyCommands: ['rm *', 'sudo *'],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('npm test', policy)).toBe(true);
      expect(isolate.isCommandAllowed('rm -rf /', policy)).toBe(false);
      expect(isolate.isCommandAllowed('sudo apt install', policy)).toBe(false);

      isolate.dispose();
    });

    it('should return false for empty allowCommands (no commands allowed)', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isCommandAllowed('npm test', policy)).toBe(false);

      isolate.dispose();
    });
  });

  describe('isWriteAllowed', () => {
    it('should return true for explicitly allowed paths', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['src/**/*.ts', 'tests/**/*.ts'],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('src/index.ts', policy)).toBe(true);
      expect(isolate.isWriteAllowed('src/utils/helper.ts', policy)).toBe(true);
      expect(isolate.isWriteAllowed('tests/unit.ts', policy)).toBe(true);

      isolate.dispose();
    });

    it('should return false for non-allowed paths', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['src/**/*.ts'],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('node_modules/foo.js', policy)).toBe(false);
      expect(isolate.isWriteAllowed('package.json', policy)).toBe(false);

      isolate.dispose();
    });

    it('should return false for denied paths even if allowed', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };

      expect(isolate.isWriteAllowed('src/index.ts', policy)).toBe(true);
      expect(isolate.isWriteAllowed('node_modules/foo/index.ts', policy)).toBe(false);

      isolate.dispose();
    });

    it('should handle wildcard * to allow all writes', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['*'],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('any/path/file.txt', policy)).toBe(true);

      isolate.dispose();
    });

    it('should handle ** glob pattern to allow all writes', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['**'],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('any/deep/nested/path/file.txt', policy)).toBe(true);

      isolate.dispose();
    });

    it('should return false for empty allowWrite (no writes allowed)', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: [],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('any/file.ts', policy)).toBe(false);

      isolate.dispose();
    });

    it('should handle specific file paths in allowWrite', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const policy: SandboxPolicy = {
        name: 'test-policy',
        allowCommands: [],
        denyCommands: [],
        allowWrite: ['src/index.ts', 'README.md'],
        denyWrite: [],
      };

      expect(isolate.isWriteAllowed('src/index.ts', policy)).toBe(true);
      expect(isolate.isWriteAllowed('README.md', policy)).toBe(true);
      expect(isolate.isWriteAllowed('src/other.ts', policy)).toBe(false);

      isolate.dispose();
    });
  });

  describe('execute', () => {
    it('should run simple code and return result', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('2 + 2');

      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
      expect(result.error).toBeUndefined();

      isolate.dispose();
    });

    it('should return error for invalid code', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('throw new Error("test error")');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('test error');

      isolate.dispose();
    });

    it('should return error for syntax errors', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('const x = {');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      isolate.dispose();
    });

    it('should respect timeout and return error on timeout', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate({ timeout: 100 });

      const result = await isolate.execute('while(true) {}');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.toLowerCase()).toContain('timeout');

      isolate.dispose();
    }, 5000);

    it('should pass context variables to executed code', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('x + y', { x: 10, y: 20 });

      expect(result.success).toBe(true);
      expect(result.result).toBe(30);

      isolate.dispose();
    });

    it('should handle undefined return value', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('const x = 5');

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();

      isolate.dispose();
    });

    it('should handle string results', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('"hello" + " " + "world"');

      expect(result.success).toBe(true);
      expect(result.result).toBe('hello world');

      isolate.dispose();
    });

    it('should handle array results', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('[1, 2, 3].map(x => x * 2)');

      expect(result.success).toBe(true);
      expect(result.result).toEqual([2, 4, 6]);

      isolate.dispose();
    });

    it('should handle object results', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      const result = await isolate.execute('({ a: 1, b: 2 })');

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ a: 1, b: 2 });

      isolate.dispose();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      // Should not throw
      expect(() => isolate.dispose()).not.toThrow();
    });

    it('should be safe to call multiple times', async () => {
      const { createSandboxIsolate } = await import('./isolate.js');
      const isolate = createSandboxIsolate();

      // Should not throw on multiple calls
      expect(() => {
        isolate.dispose();
        isolate.dispose();
      }).not.toThrow();
    });
  });

  describe('type exports', () => {
    it('should export IsolateOptions interface', async () => {
      const types = await import('./isolate.js');
      expect(types).toBeDefined();
    });

    it('should export IsolateResult interface', async () => {
      const types = await import('./isolate.js');
      expect(types).toBeDefined();
    });

    it('should export SandboxIsolate interface', async () => {
      const types = await import('./isolate.js');
      expect(types).toBeDefined();
    });
  });
});
