---
title: Skill Format
description: SKILL.md spec and frontmatter fields
---

# Skill Format

Skills are defined in `SKILL.md` files with YAML frontmatter and markdown content.

## Directory Structure

```
.claude/skills/
└── my-skill/
    ├── SKILL.md              # Required: Skill definition
    └── references/           # Optional: Supporting files
        ├── example.md
        └── patterns.md
```

## SKILL.md Format

```markdown
---
name: my-skill
description: Brief description of what this skill does
category: testing
---

# Skill Title

Instructions for Claude go here in markdown format.
```

## Frontmatter Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier (kebab-case) |
| `description` | string | One-line description for discovery |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | One of: testing, development, documentation, refactoring, security, performance |
| `user-invocable` | boolean | If true, skill can be invoked with `/skill-name` |
| `disable-model-invocation` | boolean | If true, Claude won't auto-invoke this skill |
| `context` | string | Either `fork` (separate context) or `inline` (current context) |
| `allowed-tools` | string | Comma-separated list of tools the skill can use |

## Description Best Practices

Write descriptions that help with discovery:

**Good:**
```yaml
description: Enforces Test-Driven Development workflow with RED-GREEN-REFACTOR phases. Use when implementing features, fixing bugs, or refactoring.
```

**Bad:**
```yaml
description: TDD skill
```

Include:
- What the skill does
- When to use it (trigger conditions)
- Key behaviors or constraints

## Content Guidelines

The markdown content after frontmatter is your skill's instructions to Claude.

### Structure

1. **Quick Start** - Essential info in the first few lines
2. **When to Use** - Trigger conditions
3. **Main Content** - Detailed instructions
4. **Examples** - Code or workflow examples
5. **Notes** - Caveats and edge cases

### Writing Style

- Be direct and specific
- Use imperative mood ("Do this", not "You should do this")
- Include concrete examples
- Define blocking conditions if applicable
- Keep it concise - Claude has limited context

### Example Content

```markdown
# Test-Driven Development

## Quick Start

Write failing test → Make it pass → Refactor. Never skip phases.

## Blocking Conditions

**BLOCKED: Cannot proceed until test failure is proven**

You must show test failure output before writing implementation code.

## Workflow

### Phase 1: RED
1. Write a test for expected behavior
2. Run the test - it MUST fail
3. Document failure output

### Phase 2: GREEN
1. Write minimal code to pass
2. Run test - it MUST pass
3. Document pass output

### Phase 3: REFACTOR
1. Clean up code
2. Tests must still pass

## Example Output

\`\`\`
PHASE 1 - RED ✗
Test: should validate email format
Result: FAILED
Proceeding to Phase 2...
\`\`\`
```

## Supporting Files

Place additional resources in a `references/` subdirectory:

```
my-skill/
├── SKILL.md
└── references/
    ├── api-patterns.md
    └── error-handling.md
```

Reference them from SKILL.md:

```markdown
See [API Patterns](references/api-patterns.md) for detailed examples.
```
