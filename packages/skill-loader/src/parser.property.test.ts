/**
 * Property-based tests for the parser module
 *
 * These tests use fast-check to verify invariants across a wide range of inputs.
 * Run separately from unit tests due to longer execution time:
 *   npm run test:property
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseFrontmatter, formatSkillMd } from './parser.js';

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

describe('formatSkillMd property tests', () => {
  it('should produce valid SKILL.md that can be parsed', () => {
    fc.assert(
      fc.property(skillNameArb, descriptionArb, bodyContentArb, (name, description, body) => {
        const formatted = formatSkillMd({ name, description }, body);
        const parsed = parseFrontmatter(formatted);
        expect(parsed.frontmatter.name).toBe(name);
        expect(parsed.frontmatter.description).toBe(description);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve all metadata fields through format/parse roundtrip', () => {
    fc.assert(
      fc.property(
        skillNameArb,
        descriptionArb,
        fc.constantFrom('testing', 'development', 'documentation', 'security'),
        fc.boolean(),
        bodyContentArb,
        (name, description, category, userInvocable, body) => {
          const metadata = {
            name,
            description,
            category: category as 'testing' | 'development' | 'documentation' | 'security',
            'user-invocable': userInvocable
          };
          const formatted = formatSkillMd(metadata, body);
          const parsed = parseFrontmatter(formatted);

          expect(parsed.frontmatter.name).toBe(name);
          expect(parsed.frontmatter.description).toBe(description);
          expect(parsed.frontmatter.category).toBe(category);
          expect(parsed.frontmatter['user-invocable']).toBe(userInvocable);
        }
      ),
      { numRuns: 50 }
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
