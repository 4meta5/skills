import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectConflicts, blockInstallIfConflict } from './conflicts.js';

// Mock the skills-library for loading skill metadata
vi.mock('@4meta5/skills', () => ({
  loadSkillFromPath: vi.fn()
}));

describe('conflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectConflicts', () => {
    it('detects conflict when installing conflicting skill', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      // Mock to return different skills based on path
      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/strict-tdd')) {
          return {
            metadata: {
              name: 'strict-tdd',
              description: 'Strict TDD workflow',
              conflicts: ['loose-tdd']
            },
            content: '',
            path
          };
        }
        if (path.endsWith('/loose-tdd')) {
          return {
            metadata: {
              name: 'loose-tdd',
              description: 'Loose TDD workflow',
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      const conflicts = await detectConflicts('strict-tdd', ['loose-tdd'], '/skills');

      expect(conflicts).toContain('loose-tdd');
    });

    it('returns empty array when no conflicts', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/tdd')) {
          return {
            metadata: {
              name: 'tdd',
              description: 'TDD workflow',
              conflicts: ['anti-tdd']
            },
            content: '',
            path
          };
        }
        if (path.endsWith('/security-analysis')) {
          return {
            metadata: {
              name: 'security-analysis',
              description: 'Security analysis',
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      const conflicts = await detectConflicts('tdd', ['security-analysis'], '/skills');

      expect(conflicts).toEqual([]);
    });

    it('handles skill without conflicts field gracefully', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/simple-skill')) {
          return {
            metadata: {
              name: 'simple-skill',
              description: 'A simple skill without conflicts',
              // No conflicts field
            },
            content: '',
            path
          };
        }
        if (path.endsWith('/other-skill')) {
          return {
            metadata: {
              name: 'other-skill',
              description: 'Another skill',
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      const conflicts = await detectConflicts('simple-skill', ['other-skill'], '/skills');

      expect(conflicts).toEqual([]);
    });

    it('detects bidirectional conflicts (if A conflicts B, then B conflicts A)', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      // Skill B does not declare conflict with A, but A declares conflict with B
      // When installing B, we should check if any installed skill (A) conflicts with B
      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/skill-b')) {
          return {
            metadata: {
              name: 'skill-b',
              description: 'Skill B',
              // No conflicts declared
            },
            content: '',
            path
          };
        }
        if (path.endsWith('/skill-a')) {
          // Installed skill A declares conflict with skill-b
          return {
            metadata: {
              name: 'skill-a',
              description: 'Skill A',
              conflicts: ['skill-b']
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      const conflicts = await detectConflicts('skill-b', ['skill-a'], '/skills');

      // Should detect that skill-a conflicts with skill-b (bidirectional)
      expect(conflicts).toContain('skill-a');
    });
  });

  describe('blockInstallIfConflict', () => {
    it('throws error with conflicting skill names', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/strict-tdd')) {
          return {
            metadata: {
              name: 'strict-tdd',
              description: 'Strict TDD workflow',
              conflicts: ['loose-tdd']
            },
            content: '',
            path
          };
        }
        if (path.endsWith('/loose-tdd')) {
          return {
            metadata: {
              name: 'loose-tdd',
              description: 'Loose TDD workflow',
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      await expect(
        blockInstallIfConflict('strict-tdd', ['loose-tdd'], '/skills')
      ).rejects.toThrow(/strict-tdd.*conflicts.*loose-tdd/i);
    });

    it('does not throw when no conflicts exist', async () => {
      const { loadSkillFromPath } = await import('@4meta5/skills');

      vi.mocked(loadSkillFromPath).mockImplementation(async (path: string) => {
        if (path.endsWith('/tdd')) {
          return {
            metadata: {
              name: 'tdd',
              description: 'TDD workflow',
            },
            content: '',
            path
          };
        }
        throw new Error(`Unknown skill path: ${path}`);
      });

      await expect(
        blockInstallIfConflict('tdd', [], '/skills')
      ).resolves.not.toThrow();
    });
  });
});
