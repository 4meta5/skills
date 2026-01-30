import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Import functions to test (these don't exist yet - tests will fail)
import {
  createProvenance,
  readProvenance,
  updateProvenance,
  type Provenance,
  type ProvenanceSource
} from './provenance.js';

describe('provenance tracking', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skills-provenance-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('createProvenance', () => {
    it('should create provenance file for git source', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'my-skill');
      await mkdir(skillDir, { recursive: true });

      const source: ProvenanceSource = {
        type: 'git',
        url: 'https://github.com/owner/repo',
        path: '.claude/skills/my-skill',
        ref: 'main',
        commit: 'abc1234def5678'
      };

      await createProvenance(skillDir, source);

      // Verify file was created
      const provenancePath = join(skillDir, '.provenance.json');
      const content = await readFile(provenancePath, 'utf-8');
      const provenance = JSON.parse(content) as Provenance;

      expect(provenance.source.type).toBe('git');
      expect(provenance.source.url).toBe('https://github.com/owner/repo');
      expect(provenance.source.commit).toBe('abc1234def5678');
      expect(provenance.installed.at).toBeDefined();
      expect(provenance.installed.by).toContain('skills-cli');
    });

    it('should create provenance for local/bundled source', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'bundled-skill');
      await mkdir(skillDir, { recursive: true });

      const source: ProvenanceSource = {
        type: 'bundled',
        path: 'packages/skills-library/skills/bundled-skill'
      };

      await createProvenance(skillDir, source);

      const provenancePath = join(skillDir, '.provenance.json');
      const content = await readFile(provenancePath, 'utf-8');
      const provenance = JSON.parse(content) as Provenance;

      expect(provenance.source.type).toBe('bundled');
      expect(provenance.source.path).toBe('packages/skills-library/skills/bundled-skill');
    });

    it('should create provenance for custom (local) source', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'custom-skill');
      await mkdir(skillDir, { recursive: true });

      const source: ProvenanceSource = {
        type: 'custom'
      };

      await createProvenance(skillDir, source);

      const provenancePath = join(skillDir, '.provenance.json');
      const content = await readFile(provenancePath, 'utf-8');
      const provenance = JSON.parse(content) as Provenance;

      expect(provenance.source.type).toBe('custom');
    });

    it('should include security review metadata', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'reviewed-skill');
      await mkdir(skillDir, { recursive: true });

      const source: ProvenanceSource = {
        type: 'git',
        url: 'https://github.com/owner/repo',
        commit: 'abc1234'
      };

      await createProvenance(skillDir, source, {
        security: {
          lastReview: new Date().toISOString(),
          riskLevel: 'low',
          reviewedBy: 'auto'
        }
      });

      const provenancePath = join(skillDir, '.provenance.json');
      const content = await readFile(provenancePath, 'utf-8');
      const provenance = JSON.parse(content) as Provenance;

      expect(provenance.security).toBeDefined();
      expect(provenance.security?.riskLevel).toBe('low');
    });
  });

  describe('readProvenance', () => {
    it('should read existing provenance file', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'existing-skill');
      await mkdir(skillDir, { recursive: true });

      const provenanceData: Provenance = {
        source: {
          type: 'git',
          url: 'https://github.com/owner/repo',
          commit: 'abc1234'
        },
        installed: {
          at: '2026-01-30T15:00:00Z',
          by: 'skills-cli@1.0.0'
        }
      };

      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify(provenanceData, null, 2),
        'utf-8'
      );

      const provenance = await readProvenance(skillDir);

      expect(provenance).not.toBeNull();
      expect(provenance?.source.type).toBe('git');
      expect(provenance?.source.url).toBe('https://github.com/owner/repo');
    });

    it('should return null for skill without provenance', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'no-provenance');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, 'SKILL.md'), '# Skill', 'utf-8');

      const provenance = await readProvenance(skillDir);

      expect(provenance).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'bad-provenance');
      await mkdir(skillDir, { recursive: true });
      await writeFile(join(skillDir, '.provenance.json'), 'not valid json', 'utf-8');

      const provenance = await readProvenance(skillDir);

      expect(provenance).toBeNull();
    });
  });

  describe('updateProvenance', () => {
    it('should update commit hash after skill update', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'updated-skill');
      await mkdir(skillDir, { recursive: true });

      // Create initial provenance
      const initialProvenance: Provenance = {
        source: {
          type: 'git',
          url: 'https://github.com/owner/repo',
          commit: 'old-commit'
        },
        installed: {
          at: '2026-01-01T00:00:00Z',
          by: 'skills-cli@1.0.0'
        }
      };

      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify(initialProvenance, null, 2),
        'utf-8'
      );

      // Update provenance
      await updateProvenance(skillDir, {
        source: { commit: 'new-commit' },
        updated: { at: new Date().toISOString() }
      });

      const provenance = await readProvenance(skillDir);

      expect(provenance?.source.commit).toBe('new-commit');
      expect(provenance?.updated).toBeDefined();
      expect(provenance?.installed.at).toBe('2026-01-01T00:00:00Z'); // Preserved
    });

    it('should add security review information', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'security-update');
      await mkdir(skillDir, { recursive: true });

      const initialProvenance: Provenance = {
        source: { type: 'git', url: 'https://example.com', commit: 'abc' },
        installed: { at: '2026-01-01T00:00:00Z', by: 'test' }
      };

      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify(initialProvenance, null, 2),
        'utf-8'
      );

      await updateProvenance(skillDir, {
        security: {
          lastReview: '2026-01-30T15:00:00Z',
          riskLevel: 'medium',
          reviewedBy: 'differential-review'
        }
      });

      const provenance = await readProvenance(skillDir);

      expect(provenance?.security?.riskLevel).toBe('medium');
      expect(provenance?.security?.reviewedBy).toBe('differential-review');
    });
  });

  describe('provenance schema', () => {
    it('should validate complete provenance structure', async () => {
      const skillDir = join(tempDir, '.claude', 'skills', 'complete');
      await mkdir(skillDir, { recursive: true });

      const completeProvenance: Provenance = {
        source: {
          type: 'git',
          url: 'https://github.com/owner/repo',
          path: '.claude/skills/skill-name',
          ref: 'v1.0.0',
          commit: 'abc1234def5678'
        },
        installed: {
          at: '2026-01-30T15:00:00Z',
          by: 'skills-cli@1.0.0'
        },
        updated: {
          at: '2026-01-30T16:00:00Z'
        },
        security: {
          lastReview: '2026-01-30T15:00:00Z',
          riskLevel: 'low',
          reviewedBy: 'auto',
          reviewReport: 'DIFFERENTIAL_REVIEW_REPORT.md'
        }
      };

      await writeFile(
        join(skillDir, '.provenance.json'),
        JSON.stringify(completeProvenance, null, 2),
        'utf-8'
      );

      const provenance = await readProvenance(skillDir);

      expect(provenance).toEqual(completeProvenance);
    });
  });
});
