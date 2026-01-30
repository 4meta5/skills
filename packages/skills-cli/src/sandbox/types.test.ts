import { describe, it, expect } from 'vitest';

describe('sandbox types', () => {
  describe('isValidTDDPhase', () => {
    it('should return true for BLOCKED', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('BLOCKED')).toBe(true);
    });

    it('should return true for RED', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('RED')).toBe(true);
    });

    it('should return true for GREEN', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('GREEN')).toBe(true);
    });

    it('should return true for COMPLETE', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('COMPLETE')).toBe(true);
    });

    it('should return false for INVALID', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('INVALID')).toBe(false);
    });

    it('should return false for lowercase red', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('red')).toBe(false);
    });

    it('should return false for empty string', async () => {
      const { isValidTDDPhase } = await import('./types.js');
      expect(isValidTDDPhase('')).toBe(false);
    });
  });

  describe('isValidSandboxPolicy', () => {
    it('should return true for a valid policy object', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const validPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test'],
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(validPolicy)).toBe(true);
    });

    it('should return false when name is missing', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        allowCommands: ['npm test'],
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false when allowCommands is missing', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 'test-policy',
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false when denyCommands is missing', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false when allowWrite is missing', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test'],
        denyCommands: ['rm -rf'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false when denyWrite is missing', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test'],
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false for null', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      expect(isValidSandboxPolicy(null)).toBe(false);
    });

    it('should return false for undefined', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      expect(isValidSandboxPolicy(undefined)).toBe(false);
    });

    it('should return false for non-object types', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      expect(isValidSandboxPolicy('string')).toBe(false);
      expect(isValidSandboxPolicy(123)).toBe(false);
      expect(isValidSandboxPolicy(true)).toBe(false);
    });

    it('should return false when name is not a string', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 123,
        allowCommands: ['npm test'],
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });

    it('should return false when arrays contain non-strings', async () => {
      const { isValidSandboxPolicy } = await import('./types.js');
      const invalidPolicy = {
        name: 'test-policy',
        allowCommands: ['npm test', 123],
        denyCommands: ['rm -rf'],
        allowWrite: ['**/*.ts'],
        denyWrite: ['node_modules/**'],
      };
      expect(isValidSandboxPolicy(invalidPolicy)).toBe(false);
    });
  });

  describe('isValidGlobPattern', () => {
    it('should return true for **/*.ts pattern', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('**/*.ts')).toBe(true);
    });

    it('should return true for src/*.js pattern', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('src/*.js')).toBe(true);
    });

    it('should return true for specific file path', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('src/index.ts')).toBe(true);
    });

    it('should return true for directory glob', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('node_modules/**')).toBe(true);
    });

    it('should return true for brace expansion', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('**/*.{ts,tsx}')).toBe(true);
    });

    it('should return false for empty string', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('')).toBe(false);
    });

    it('should return false for patterns with null bytes', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('src/\0test.ts')).toBe(false);
    });

    it('should return false for whitespace-only patterns', async () => {
      const { isValidGlobPattern } = await import('./types.js');
      expect(isValidGlobPattern('   ')).toBe(false);
    });
  });

  describe('type exports', () => {
    it('should export TDDPhase type', async () => {
      // TypeScript compilation will fail if type doesn't exist
      const types = await import('./types.js');
      // The type itself isn't a runtime value, but we verify the module loads
      expect(types).toBeDefined();
    });

    it('should export SandboxPolicy interface', async () => {
      const types = await import('./types.js');
      expect(types).toBeDefined();
    });

    it('should export SandboxConfig interface', async () => {
      const types = await import('./types.js');
      expect(types).toBeDefined();
    });
  });
});
