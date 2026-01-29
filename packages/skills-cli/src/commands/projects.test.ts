import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { trackProjectInstallation, getProjectInstallation, getAllTrackedProjects, untrackProjectInstallation } from '../config.js';

describe('projects command', () => {
  let projectA: string;
  let projectB: string;
  let projectC: string;
  // Use unique skill names to avoid test isolation issues
  let tddSkill: string;
  let noWorkaroundsSkill: string;
  let dogfoodSkill: string;

  beforeEach(async () => {
    const timestamp = Date.now();
    tddSkill = `tdd-${timestamp}`;
    noWorkaroundsSkill = `no-workarounds-${timestamp}`;
    dogfoodSkill = `dogfood-skills-${timestamp}`;

    // Create temporary project directories
    projectA = await mkdtemp(join(tmpdir(), 'skills-projects-a-'));
    projectB = await mkdtemp(join(tmpdir(), 'skills-projects-b-'));
    projectC = await mkdtemp(join(tmpdir(), 'skills-projects-c-'));

    // Set up project structures
    for (const projectDir of [projectA, projectB, projectC]) {
      await mkdir(join(projectDir, '.claude', 'skills'), { recursive: true });
    }

    // Track various skills in projects
    await trackProjectInstallation(projectA, tddSkill, 'skill');
    await trackProjectInstallation(projectA, noWorkaroundsSkill, 'skill');
    await trackProjectInstallation(projectB, tddSkill, 'skill');
    await trackProjectInstallation(projectC, noWorkaroundsSkill, 'skill');
    await trackProjectInstallation(projectC, dogfoodSkill, 'skill');
  });

  afterEach(async () => {
    // Clean up tracking
    await untrackProjectInstallation(projectA, tddSkill, 'skill');
    await untrackProjectInstallation(projectA, noWorkaroundsSkill, 'skill');
    await untrackProjectInstallation(projectB, tddSkill, 'skill');
    await untrackProjectInstallation(projectC, noWorkaroundsSkill, 'skill');
    await untrackProjectInstallation(projectC, dogfoodSkill, 'skill');
    await rm(projectA, { recursive: true, force: true });
    await rm(projectB, { recursive: true, force: true });
    await rm(projectC, { recursive: true, force: true });
  });

  describe('projectsCommand list', () => {
    it('should list all tracked projects', async () => {
      const { projectsCommand } = await import('./projects.js');

      // The command returns the list of projects (or logs them)
      // For this test, we verify via the config functions
      const allProjects = await getAllTrackedProjects();

      expect(allProjects).toContain(projectA);
      expect(allProjects).toContain(projectB);
      expect(allProjects).toContain(projectC);
    });

    it('should filter projects by skill name', async () => {
      const { projectsCommand, getProjectsForSkill } = await import('./projects.js');

      // Projects with the tdd skill
      const tddProjects = await getProjectsForSkill(tddSkill);
      expect(tddProjects).toContain(projectA);
      expect(tddProjects).toContain(projectB);
      expect(tddProjects).not.toContain(projectC);

      // Projects with dogfood skill
      const dogfoodProjects = await getProjectsForSkill(dogfoodSkill);
      expect(dogfoodProjects).toContain(projectC);
      expect(dogfoodProjects).not.toContain(projectA);
      expect(dogfoodProjects).not.toContain(projectB);
    });
  });

  describe('projectsCommand add', () => {
    it('should add current project to tracking', async () => {
      const { projectsCommand } = await import('./projects.js');

      // Create a new project that's not tracked
      const timestamp = Date.now();
      const newProject = await mkdtemp(join(tmpdir(), 'skills-projects-new-'));
      const someSkillName = `some-skill-${timestamp}`;
      await mkdir(join(newProject, '.claude', 'skills', someSkillName), { recursive: true });
      await writeFile(
        join(newProject, '.claude', 'skills', someSkillName, 'SKILL.md'),
        `---\nname: ${someSkillName}\ndescription: A skill\n---\n\n# Some Skill\n`,
        'utf-8'
      );

      try {
        // Project should not be tracked yet (unless tracked by other tests)
        // Run add command to track it
        await projectsCommand('add', ['.'], { cwd: newProject });

        // Verify it's now tracked with the skill found in its directory
        const installation = await getProjectInstallation(newProject);
        expect(installation).toBeDefined();
        expect(installation?.skills).toContain(someSkillName);
      } finally {
        await untrackProjectInstallation(newProject, someSkillName, 'skill');
        await rm(newProject, { recursive: true, force: true });
      }
    });
  });

  describe('projectsCommand remove', () => {
    it('should remove project from tracking', async () => {
      const { projectsCommand } = await import('./projects.js');

      // Verify projectA is tracked
      let allProjects = await getAllTrackedProjects();
      expect(allProjects).toContain(projectA);

      // Remove projectA from tracking
      await projectsCommand('remove', [projectA], {});

      // Verify it's no longer tracked
      allProjects = await getAllTrackedProjects();
      expect(allProjects).not.toContain(projectA);
    });
  });
});
