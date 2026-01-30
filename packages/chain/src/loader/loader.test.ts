import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  loadSkillsConfig,
  loadProfilesConfig,
  validateConfigs,
  getDefaultChainsDir,
} from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the test chains directory
const chainsDir = join(__dirname, '..', '..', 'chains');

describe('Loader', () => {
  describe('getDefaultChainsDir', () => {
    it('returns a path ending in chains', () => {
      const dir = getDefaultChainsDir();
      expect(dir.endsWith('chains')).toBe(true);
    });
  });

  describe('loadSkillsConfig', () => {
    it('loads valid skills.yaml', async () => {
      const config = await loadSkillsConfig(join(chainsDir, 'skills.yaml'));
      expect(config.version).toBe('1.0');
      expect(config.skills.length).toBeGreaterThan(0);
    });

    it('parses skill with all fields', async () => {
      const config = await loadSkillsConfig(join(chainsDir, 'skills.yaml'));
      const tdd = config.skills.find(s => s.name === 'tdd');
      expect(tdd).toBeDefined();
      expect(tdd?.provides).toContain('test_written');
      expect(tdd?.provides).toContain('test_green');
      expect(tdd?.requires).toEqual([]);
      expect(tdd?.conflicts).toContain('quick-fix');
      expect(tdd?.risk).toBe('low');
      expect(tdd?.cost).toBe('medium');
    });

    it('throws on missing file', async () => {
      await expect(loadSkillsConfig('/nonexistent/skills.yaml')).rejects.toThrow();
    });
  });

  describe('loadProfilesConfig', () => {
    it('loads valid profiles.yaml', async () => {
      const config = await loadProfilesConfig(join(chainsDir, 'profiles.yaml'));
      expect(config.version).toBe('1.0');
      expect(config.profiles.length).toBeGreaterThan(0);
    });

    it('parses profile with all fields', async () => {
      const config = await loadProfilesConfig(join(chainsDir, 'profiles.yaml'));
      const bugFix = config.profiles.find(p => p.name === 'bug-fix');
      expect(bugFix).toBeDefined();
      expect(bugFix?.match).toContain('fix');
      expect(bugFix?.capabilities_required).toContain('test_written');
      expect(bugFix?.strictness).toBe('strict');
      expect(bugFix?.priority).toBe(10);
    });

    it('throws on missing file', async () => {
      await expect(loadProfilesConfig('/nonexistent/profiles.yaml')).rejects.toThrow();
    });
  });

  describe('validateConfigs', () => {
    it('validates correct configs', async () => {
      const result = await validateConfigs(
        join(chainsDir, 'skills.yaml'),
        join(chainsDir, 'profiles.yaml')
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns warnings for unused capabilities', async () => {
      const result = await validateConfigs(
        join(chainsDir, 'skills.yaml'),
        join(chainsDir, 'profiles.yaml')
      );
      // We know some capabilities are unused in the example
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('returns errors for missing files', async () => {
      const result = await validateConfigs(
        '/nonexistent/skills.yaml',
        '/nonexistent/profiles.yaml'
      );
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
