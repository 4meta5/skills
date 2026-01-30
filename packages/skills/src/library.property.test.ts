/**
 * Property-based tests for the library module
 *
 * These tests use fast-check to verify invariants of the skills library.
 * Run separately from unit tests due to longer execution time:
 *   npm run test:property
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createSkillsLibrary } from './library.js';
import type { Skill, SkillCategory } from './types.js';

// Custom arbitraries
const skillNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/);

// YAML-safe description: alphanumeric without trailing/leading spaces
const descriptionArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,20}$/)
  .map(s => s.trim());

// Body content: simple alphanumeric
const bodyContentArb = fc.stringMatching(/^[a-z0-9]{0,50}$/);
const categoryArb = fc.constantFrom<SkillCategory>('testing', 'development', 'documentation', 'refactoring', 'security', 'performance');

// Generate valid skill data
const skillDataArb = fc.record({
  name: skillNameArb,
  description: descriptionArb,
  body: bodyContentArb,
  category: fc.option(categoryArb, { nil: undefined })
});

function createSkillMd(data: { name: string; description: string; body: string; category?: SkillCategory }): string {
  let yaml = `name: ${data.name}\ndescription: ${data.description}`;
  if (data.category) {
    yaml += `\ncategory: ${data.category}`;
  }
  return `---\n${yaml}\n---\n\n${data.body}`;
}

// Helper to create isolated temp directory for each test iteration
async function withTempDirs<T>(fn: (bundledDir: string, projectDir: string) => Promise<T>): Promise<T> {
  const tempDir = join(tmpdir(), `lib-prop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const bundledDir = join(tempDir, 'bundled');
  const projectDir = join(tempDir, 'project');

  try {
    await mkdir(bundledDir, { recursive: true });
    await mkdir(projectDir, { recursive: true });
    return await fn(bundledDir, projectDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

describe('createSkillsLibrary property tests', () => {
  describe('loadSkill', () => {
    it('should always return skill with matching name', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            const skillDir = join(bundledDir, skillData.name);
            await mkdir(skillDir, { recursive: true });
            await writeFile(join(skillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            const skill = await library.loadSkill(skillData.name);

            expect(skill.metadata.name).toBe(skillData.name);
          });
        }),
        { numRuns: 25 }
      );
    });

    it('should prioritize project skills over bundled skills with same name', async () => {
      await fc.assert(
        fc.asyncProperty(
          skillDataArb,
          descriptionArb,
          async (skillData, projectDescription) => {
            await withTempDirs(async (bundledDir, projectDir) => {
              // Create bundled skill
              const bundledSkillDir = join(bundledDir, skillData.name);
              await mkdir(bundledSkillDir, { recursive: true });
              await writeFile(join(bundledSkillDir, 'SKILL.md'), createSkillMd(skillData));

              // Create project skill with same name but different description
              const projectSkillDir = join(projectDir, '.claude', 'skills', skillData.name);
              await mkdir(projectSkillDir, { recursive: true });
              await writeFile(
                join(projectSkillDir, 'SKILL.md'),
                createSkillMd({ ...skillData, description: projectDescription })
              );

              const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
              const skill = await library.loadSkill(skillData.name);

              expect(skill.metadata.description).toBe(projectDescription);
            });
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should throw for non-existent skills', async () => {
      await fc.assert(
        fc.asyncProperty(skillNameArb, async (name) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            await expect(library.loadSkill(name)).rejects.toThrow(`Skill not found: ${name}`);
          });
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('listSkills', () => {
    it('should list all skills when no category filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb, { minLength: 1, maxLength: 4 }),
          async (skills) => {
            await withTempDirs(async (bundledDir, projectDir) => {
              // Create skills with unique names
              const uniqueSkills = skills.map((skill, i) => ({
                ...skill,
                name: `${skill.name}-${i}`
              }));

              for (const skill of uniqueSkills) {
                const dir = join(bundledDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
              const listed = await library.listSkills();

              expect(listed.length).toBe(uniqueSkills.length);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should filter by category correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb.map(s => ({ ...s, category: 'testing' as SkillCategory })), { minLength: 1, maxLength: 3 }),
          fc.array(skillDataArb.map(s => ({ ...s, category: 'development' as SkillCategory })), { minLength: 1, maxLength: 3 }),
          async (testingSkills, devSkills) => {
            await withTempDirs(async (bundledDir, projectDir) => {
              const allSkills = [
                ...testingSkills.map((s, i) => ({ ...s, name: `testing-${i}` })),
                ...devSkills.map((s, i) => ({ ...s, name: `dev-${i}` }))
              ];

              for (const skill of allSkills) {
                const dir = join(bundledDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });

              const filteredTesting = await library.listSkills('testing');
              const filteredDev = await library.listSkills('development');

              expect(filteredTesting.length).toBe(testingSkills.length);
              expect(filteredDev.length).toBe(devSkills.length);

              filteredTesting.forEach((skill: Skill) => {
                expect(skill.metadata.category).toBe('testing');
              });
              filteredDev.forEach((skill: Skill) => {
                expect(skill.metadata.category).toBe('development');
              });
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should deduplicate skills across locations', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            // Create same skill in both bundled and project
            const bundledSkillDir = join(bundledDir, skillData.name);
            await mkdir(bundledSkillDir, { recursive: true });
            await writeFile(join(bundledSkillDir, 'SKILL.md'), createSkillMd(skillData));

            const projectSkillDir = join(projectDir, '.claude', 'skills', skillData.name);
            await mkdir(projectSkillDir, { recursive: true });
            await writeFile(join(projectSkillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            const listed = await library.listSkills();

            const matchingSkills = listed.filter((s: Skill) => s.metadata.name === skillData.name);
            expect(matchingSkills.length).toBe(1);
          });
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('installSkill', () => {
    it('should install skill to project location', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            // Create bundled skill
            const bundledSkillDir = join(bundledDir, skillData.name);
            await mkdir(bundledSkillDir, { recursive: true });
            await writeFile(join(bundledSkillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            const skill = await library.loadSkill(skillData.name);
            await library.installSkill(skill, { location: 'project' });

            const installedPath = join(projectDir, '.claude', 'skills', skillData.name, 'SKILL.md');
            const installedContent = await readFile(installedPath, 'utf-8');

            expect(installedContent).toContain(`name: ${skillData.name}`);
          });
        }),
        { numRuns: 15 }
      );
    });

    it('installed skill should be loadable', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            // Create bundled skill
            const bundledSkillDir = join(bundledDir, skillData.name);
            await mkdir(bundledSkillDir, { recursive: true });
            await writeFile(join(bundledSkillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            const originalSkill = await library.loadSkill(skillData.name);
            await library.installSkill(originalSkill, { location: 'project' });

            // Create new library instance to load from project
            const newLibrary = createSkillsLibrary({ cwd: projectDir, skillsDir: '/nonexistent' });
            const loadedSkill = await newLibrary.loadSkill(skillData.name);

            expect(loadedSkill.metadata.name).toBe(skillData.name);
          });
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('extendProject', () => {
    it('should install all specified skills', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb, { minLength: 1, maxLength: 3 }),
          async (skills) => {
            await withTempDirs(async (bundledDir, projectDir) => {
              // Create bundled skills with unique names
              const uniqueSkills = skills.map((skill, i) => ({
                ...skill,
                name: `${skill.name}-${i}`
              }));

              for (const skill of uniqueSkills) {
                const dir = join(bundledDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
              await library.extendProject(uniqueSkills.map(s => s.name));

              // Verify all skills are installed
              for (const skill of uniqueSkills) {
                const installedPath = join(projectDir, '.claude', 'skills', skill.name, 'SKILL.md');
                const content = await readFile(installedPath, 'utf-8');
                expect(content).toContain(`name: ${skill.name}`);
              }
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should update or create CLAUDE.md with skill references', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            // Create bundled skill
            const dir = join(bundledDir, skillData.name);
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            await library.extendProject([skillData.name]);

            const claudeMdContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
            expect(claudeMdContent).toContain(`@.claude/skills/${skillData.name}/SKILL.md`);
          });
        }),
        { numRuns: 15 }
      );
    });
  });
});

describe('invariant tests', () => {
  it('listSkills().length >= loadSkill() successes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(skillDataArb, { minLength: 0, maxLength: 4 }),
        async (skills) => {
          await withTempDirs(async (bundledDir, projectDir) => {
            const uniqueSkills = skills.map((skill, i) => ({
              ...skill,
              name: `skill-${i}`
            }));

            for (const skill of uniqueSkills) {
              const dir = join(bundledDir, skill.name);
              await mkdir(dir, { recursive: true });
              await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
            }

            const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });
            const listed = await library.listSkills();

            let loadableCount = 0;
            for (const skill of uniqueSkills) {
              try {
                await library.loadSkill(skill.name);
                loadableCount++;
              } catch {
                // Skill not loadable
              }
            }

            expect(listed.length).toBeGreaterThanOrEqual(loadableCount);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  it('loading then installing then loading should preserve skill data', async () => {
    await fc.assert(
      fc.asyncProperty(skillDataArb, async (skillData) => {
        await withTempDirs(async (bundledDir, projectDir) => {
          // Create bundled skill
          const dir = join(bundledDir, skillData.name);
          await mkdir(dir, { recursive: true });
          await writeFile(join(dir, 'SKILL.md'), createSkillMd(skillData));

          const library = createSkillsLibrary({ cwd: projectDir, skillsDir: bundledDir });

          // Load -> Install -> Load cycle
          const original = await library.loadSkill(skillData.name);
          await library.installSkill(original, { location: 'project' });
          const reloaded = await library.loadSkill(skillData.name);

          // Core metadata should be preserved
          expect(reloaded.metadata.name).toBe(original.metadata.name);
          expect(reloaded.metadata.description).toBe(original.metadata.description);
          if (original.metadata.category) {
            expect(reloaded.metadata.category).toBe(original.metadata.category);
          }
        });
      }),
      { numRuns: 15 }
    );
  });
});
