# Description Writing Guide

The description field is critical for skill discovery. Well-written descriptions enable semantic matching to surface the right skill at the right time.

## Structure

A good description has three parts:

1. **What it does** (1 sentence)
2. **Trigger conditions** (when to use)
3. **Specific context** (symptoms, errors, frameworks)

## Good vs Bad Examples

### Bad: Too Vague
```yaml
description: Helps with React problems.
```
**Problems**: No trigger conditions, no specific symptoms, won't match queries.

### Bad: Too Short
```yaml
description: Debug server errors.
```
**Problems**: Under 50 chars, no specifics, matches too broadly.

### Good: Structured with Triggers
```yaml
description: |
  Debug getServerSideProps errors in Next.js. Use when: (1) page shows
  generic error but console is empty, (2) API routes return 500 with no
  details. Server-side errors appear in terminal, not browser console.
```
**Why it works**: Specific framework, numbered triggers, actionable info.

### Good: Error Message Focused
```yaml
description: |
  Fix "ENOENT: no such file or directory" errors when running npm scripts
  in monorepos. Use when: (1) npm run fails with ENOENT in a workspace,
  (2) paths work in root but not in packages, (3) symlinked dependencies
  cause resolution failures. Covers Lerna, Turborepo, npm workspaces.
```
**Why it works**: Exact error message, multiple scenarios, named tools.

## Trigger Condition Keywords

Include phrases that help semantic matching:

- "Use when..."
- "Use for..."
- "Helps with..."
- "Invoke when..."
- "Apply when..."
- "Triggers on..."

## Specific Context Markers

Include specific identifiers that users might search for:

| Type | Examples |
|------|----------|
| Error messages | `"ENOENT"`, `"Cannot read property"` |
| File types | `.ts`, `.tsx`, `package.json` |
| Frameworks | `Next.js`, `SvelteKit`, `React` |
| Tools | `npm`, `git`, `TypeScript` |
| Concepts | `circular dependency`, `race condition` |

## Length Guidelines

| Length | Quality |
|--------|---------|
| < 50 chars | Too short, will warn |
| 50-100 chars | Minimum, add context |
| 100-200 chars | Good balance |
| 200-400 chars | Comprehensive |
| > 400 chars | Consider SKILL.md body |

## Quality Score

The validator scores descriptions on:

1. **Length** (0.5 points if > 50 chars)
2. **Trigger keywords** (0.25 points)
3. **Specific context** (0.25 points)
   - Quoted strings (error messages)
   - File extensions
   - Numbered lists
   - Technical terms

Target score: 0.8 or higher.

## Checklist

- [ ] First sentence explains what skill does
- [ ] Includes "Use when:" or similar phrase
- [ ] Lists 2-3 specific trigger conditions
- [ ] Mentions specific error messages (if applicable)
- [ ] Names frameworks/tools (if applicable)
- [ ] Over 50 characters
- [ ] Under 400 characters (detailed content in SKILL.md body)
