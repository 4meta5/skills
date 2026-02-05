---
name: dogfood
description: |
  Enforces dogfooding for tool projects. Use when building CLIs,
  libraries, or automation that you should use yourself.
  Triggers on: feature completion, session end, tool failures.
category: development
user-invocable: true
---

# Dogfood

When building tools, you MUST use the tools you build.

## Core Principle

If you're building a tool that does X, you must use X yourself. Dogfooding:
1. Reveals bugs and UX issues
2. Builds understanding of user pain points
3. Validates the value proposition
4. Maintains project credibility

## Configuration

Define dogfood commands in CLAUDE.md:

```markdown
## Dogfood

Command: `npm run cli -- scan`
Verify: `npm run cli -- list`
```

If no ## Dogfood section exists, ask the user what command to run.

## Mandatory Actions

### After Completing Any Feature/Bugfix

1. **Run the tool** you just modified
2. **Review output** for issues
3. **Document** what you tested
4. **If skipping**: Document reason explicitly

## Blocking Condition

If you complete a feature without using the tool:

**BLOCKED: DOGFOODING REQUIRED**

You cannot proceed until you:
1. Run the tool's main command
2. Verify it works as expected
3. Document any issues found

## When to Dogfood

- After implementing a new feature
- After fixing a bug
- After refactoring code
- At the end of a work session
- When the tool fails during testing

## Rationalizations (All Rejected)

| Excuse | Why It's Wrong | Required Action |
|--------|----------------|-----------------|
| "I'll test later" | Later never comes | Test NOW |
| "Tests are passing" | Tests != real usage | Run the tool |
| "Just a small change" | Small bugs compound | Still dogfood |
| "Not relevant" | You built it, use it | Justify explicitly |

## Quality Check

Before ending work, verify:
- Did I run the tool I modified?
- Did it work as expected?
- Did I document any issues?

If any answer is "no": **BLOCKED: DOGFOODING REQUIRED**
