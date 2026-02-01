# Frontmatter Specification

Complete reference for SKILL.md frontmatter fields.

## Required Fields

### name
- **Type**: string
- **Format**: kebab-case
- **Example**: `my-skill-name`
- **Rules**:
  - Must be unique within the skills directory
  - Lowercase letters, numbers, hyphens only
  - No spaces or underscores
  - Should be descriptive but concise (2-4 words)

### description
- **Type**: string (multi-line recommended)
- **Minimum Length**: 50 characters (for semantic matching)
- **Structure**:
  1. What it does (first sentence)
  2. Trigger conditions (Use when:, Helps with:)
  3. Specific context (error messages, file types)

```yaml
description: |
  Fix for "ENOENT" errors when running npm scripts in monorepos.
  Use when: (1) npm run fails with ENOENT, (2) paths work in root
  but not packages, (3) symlinked deps cause failures.
  Covers Lerna, Turborepo, and npm workspaces.
```

## Optional Fields

### category
- **Type**: enum
- **Valid Values**:
  - `testing` - Test-related skills
  - `development` - General development
  - `documentation` - Docs and README
  - `refactoring` - Code restructuring
  - `security` - Security practices
  - `performance` - Optimization

### user-invocable
- **Type**: boolean
- **Default**: false
- **Description**: When true, skill can be called via `/skill-name`
- **Example**: `user-invocable: true`

### disable-model-invocation
- **Type**: boolean
- **Default**: false
- **Description**: When true, prevents automatic loading by the model
- **Use Case**: Skills that should only be invoked explicitly

### allowed-tools
- **Type**: string (comma-separated)
- **Description**: Restricts which tools the skill can use
- **Example**: `allowed-tools: Read,Write,Bash`
- **Common Values**: Read, Write, Edit, Bash, Glob, Grep, WebFetch

### context
- **Type**: enum
- **Valid Values**:
  - `fork` - Run in separate context
  - `inline` - Run in current context
- **Default**: inline

### agent
- **Type**: string
- **Description**: Specific agent to use for this skill
- **Example**: `agent: explore`

## Metadata Fields (Optional)

### author
- **Type**: string
- **Description**: Skill author name
- **Example**: `author: Claude Code`

### version
- **Type**: string (semver)
- **Format**: MAJOR.MINOR.PATCH
- **Example**: `version: 1.0.0`

### date
- **Type**: string (ISO date)
- **Format**: YYYY-MM-DD
- **Example**: `date: 2026-01-30`

## Complete Example

```yaml
---
name: nextjs-server-error-debugging
description: |
  Debug getServerSideProps and getStaticProps errors in Next.js.
  Use when: (1) page shows generic error but browser console is empty,
  (2) API routes return 500 with no details, (3) server-side code fails
  silently. Check terminal/server logs for actual error messages.
author: Claude Code
version: 1.0.0
date: 2026-01-30
category: development
user-invocable: false
---
```

## Validation

The `skills validate` command checks:
- Required fields present
- Category is valid enum value
- Name follows kebab-case
- Description meets minimum length
- No invalid field names
