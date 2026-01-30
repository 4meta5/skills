/**
 * Property-based tests for the loader module
 *
 * These tests use fast-check to verify invariants across a wide range of inputs.
 * Run separately from unit tests due to longer execution time:
 *   npm run test:property
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseFrontmatter, loadSkillFromPath, loadSkillsFromDirectory } from './loader.js';

// Custom arbitraries for skill-related data
const skillNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,30}$/);

// YAML-safe description: alphanumeric starting and ending with non-whitespace
const descriptionArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,20}$/)
  .map(s => s.trim());

// Body content: simple alphanumeric
const bodyContentArb = fc.stringMatching(/^[a-z0-9]{0,50}$/);

// Generate valid SKILL.md content
const validSkillMdArb = fc.record({
  name: skillNameArb,
  description: descriptionArb,
  body: bodyContentArb,
  disableModelInvocation: fc.option(fc.boolean(), { nil: undefined }),
  userInvocable: fc.option(fc.boolean(), { nil: undefined }),
  allowedTools: fc.option(
    fc.array(fc.constantFrom('Read', 'Write', 'Bash', 'Edit', 'Grep', 'Glob'), { minLength: 1, maxLength: 6 })
      .map(tools => tools.join(', ')),
    { nil: undefined }
  )
}).map(({ name, description, body, disableModelInvocation, userInvocable, allowedTools }) => {
  let yaml = `name: ${name}\ndescription: ${description}`;
  if (disableModelInvocation !== undefined) {
    yaml += `\ndisable-model-invocation: ${disableModelInvocation}`;
  }
  if (userInvocable !== undefined) {
    yaml += `\nuser-invocable: ${userInvocable}`;
  }
  if (allowedTools !== undefined) {
    yaml += `\nallowed-tools: ${allowedTools}`;
  }
  return {
    content: `---\n${yaml}\n---\n\n${body}`,
    expected: { name, description, body: body.trim() }
  };
});

// Helper to create isolated temp directory for each test iteration
async function withTempDir<T>(fn: (tempDir: string) => Promise<T>): Promise<T> {
  const tempDir = join(tmpdir(), `skill-prop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  try {
    await mkdir(tempDir, { recursive: true });
    return await fn(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

describe('parseFrontmatter property tests', () => {
  it('should parse any valid SKILL.md and extract correct name and description', () => {
    fc.assert(
      fc.property(validSkillMdArb, ({ content, expected }) => {
        const result = parseFrontmatter(content);
        expect(result.frontmatter.name).toBe(expected.name);
        expect(result.frontmatter.description).toBe(expected.description);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve body content after parsing', () => {
    fc.assert(
      fc.property(validSkillMdArb, ({ content, expected }) => {
        const result = parseFrontmatter(content);
        expect(result.body).toBe(expected.body);
      }),
      { numRuns: 100 }
    );
  });

  it('should be idempotent: parsing the same content twice yields same result', () => {
    fc.assert(
      fc.property(validSkillMdArb, ({ content }) => {
        const result1 = parseFrontmatter(content);
        const result2 = parseFrontmatter(content);
        expect(result1).toEqual(result2);
      }),
      { numRuns: 50 }
    );
  });

  it('should reject content without frontmatter delimiters', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z0-9]{5,50}$/),
        (content) => {
          expect(() => parseFrontmatter(content)).toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should reject frontmatter missing required name field', () => {
    fc.assert(
      fc.property(descriptionArb, (description) => {
        const content = `---\ndescription: ${description}\n---\n\nBody`;
        expect(() => parseFrontmatter(content)).toThrow('name');
      }),
      { numRuns: 30 }
    );
  });

  it('should reject frontmatter missing required description field', () => {
    fc.assert(
      fc.property(skillNameArb, (name) => {
        const content = `---\nname: ${name}\n---\n\nBody`;
        expect(() => parseFrontmatter(content)).toThrow('description');
      }),
      { numRuns: 30 }
    );
  });
});

describe('loadSkillFromPath property tests', () => {
  it('should load any valid SKILL.md from disk', async () => {
    await fc.assert(
      fc.asyncProperty(validSkillMdArb, async ({ content, expected }) => {
        await withTempDir(async (tempDir) => {
          await writeFile(join(tempDir, 'SKILL.md'), content);
          const skill = await loadSkillFromPath(tempDir);
          expect(skill.metadata.name).toBe(expected.name);
          expect(skill.metadata.description).toBe(expected.description);
          expect(skill.path).toBe(tempDir);
        });
      }),
      { numRuns: 30 }
    );
  });

  it('should always include the path in loaded skill', async () => {
    await fc.assert(
      fc.asyncProperty(validSkillMdArb, async ({ content }) => {
        await withTempDir(async (tempDir) => {
          await writeFile(join(tempDir, 'SKILL.md'), content);
          const skill = await loadSkillFromPath(tempDir);
          expect(skill.path).toBe(tempDir);
        });
      }),
      { numRuns: 20 }
    );
  });

  it('should throw for directories without SKILL.md', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z]{5,15}$/),
        async (filename) => {
          await withTempDir(async (tempDir) => {
            // Write some other file, not SKILL.md
            await writeFile(join(tempDir, `${filename}.md`), 'content');
            await expect(loadSkillFromPath(tempDir)).rejects.toThrow('SKILL.md not found');
          });
        }
      ),
      { numRuns: 15 }
    );
  });
});

describe('loadSkillsFromDirectory property tests', () => {
  it('should load all valid skills and skip invalid ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validSkillMdArb, { minLength: 0, maxLength: 4 }),
        fc.integer({ min: 0, max: 2 }),
        async (validSkills, invalidCount) => {
          await withTempDir(async (tempDir) => {
            // Create valid skill directories
            for (let i = 0; i < validSkills.length; i++) {
              const skillDir = join(tempDir, `valid-skill-${i}`);
              await mkdir(skillDir, { recursive: true });
              await writeFile(join(skillDir, 'SKILL.md'), validSkills[i].content);
            }

            // Create invalid skill directories (no SKILL.md)
            for (let i = 0; i < invalidCount; i++) {
              const invalidDir = join(tempDir, `invalid-skill-${i}`);
              await mkdir(invalidDir, { recursive: true });
              await writeFile(join(invalidDir, 'README.md'), '# Not a skill');
            }

            const loaded = await loadSkillsFromDirectory(tempDir);
            expect(loaded.length).toBe(validSkills.length);
          });
        }
      ),
      { numRuns: 15 }
    );
  });

  it('should return empty array for non-existent directory', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z]{10,20}$/),
        async (randomPath) => {
          const skills = await loadSkillsFromDirectory(join('/non/existent', randomPath));
          expect(skills).toEqual([]);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should load skills with correct metadata', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validSkillMdArb, { minLength: 1, maxLength: 3 }),
        async (validSkills) => {
          await withTempDir(async (tempDir) => {
            // Create skills with unique directory names
            for (let i = 0; i < validSkills.length; i++) {
              const skillDir = join(tempDir, `skill-${i}`);
              await mkdir(skillDir, { recursive: true });
              await writeFile(join(skillDir, 'SKILL.md'), validSkills[i].content);
            }

            const loaded = await loadSkillsFromDirectory(tempDir);

            expect(loaded.length).toBe(validSkills.length);
            // All loaded skills should have valid name and description
            for (const skill of loaded) {
              expect(skill.metadata.name).toBeTruthy();
              expect(skill.metadata.description).toBeTruthy();
              expect(skill.path).toBeTruthy();
            }
          });
        }
      ),
      { numRuns: 15 }
    );
  });
});

describe('round-trip property tests', () => {
  it('parsed frontmatter + body should contain all original data', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        descriptionArb,
        bodyContentArb,
        (name, description, body) => {
          const content = `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
          const result = parseFrontmatter(content);

          // All original data should be recoverable
          expect(result.frontmatter.name).toBe(name);
          expect(result.frontmatter.description).toBe(description);
          expect(result.body).toBe(body.trim());
        }
      ),
      { numRuns: 100 }
    );
  });
});
