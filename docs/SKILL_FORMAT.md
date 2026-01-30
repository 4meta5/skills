# Skill Format Specification

Skills are Markdown files with YAML frontmatter. This document defines the format.

## File Structure

Each skill lives in its own directory:

```
.claude/skills/
  my-skill/
    SKILL.md           # Required: skill definition
    resources/         # Optional: supporting files
      example.ts
      template.md
```

## SKILL.md Format

```markdown
---
name: skill-name
description: |
  Clear description of what this skill does.
  Include trigger conditions for semantic matching.
category: testing
---

# Skill Title

Content that Claude receives when this skill activates.
```

## Frontmatter Fields

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier (kebab-case) |
| `description` | string | What the skill does and when to use it |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `category` | string | - | One of: testing, development, documentation, security, refactoring, performance |
| `user-invocable` | boolean | false | Can be triggered via `/skill-name` command |
| `disable-model-invocation` | boolean | false | Prevent automatic activation |
| `allowed-tools` | string | - | Comma-separated list of allowed tools |
| `context` | string | inline | `inline` or `fork` (run in subagent) |
| `agent` | string | - | Subagent type if context is fork |

## Description Best Practices

The description is used for semantic matching. Write it for discoverability.

**Good description:**

```yaml
description: |
  Enforce Test-Driven Development workflow with RED-GREEN-REFACTOR phases.
  Use when: implementing new features, fixing bugs, refactoring code.
  Blocks implementation until failing test exists. Requires test pass
  before proceeding to refactor phase.
```

**Bad description:**

```yaml
description: TDD skill
```

Include:

- What the skill does
- When to trigger it (specific conditions)
- Key behaviors or constraints

## Content Guidelines

The content after frontmatter is what Claude receives. Write clear, actionable instructions.

### Structure

```markdown
# Skill Name

Brief overview of purpose.

## When to Use

- Specific trigger condition 1
- Specific trigger condition 2

## Workflow

Step-by-step process...

## Examples

Concrete examples with code...

## Rationalizations (optional)

Common excuses to skip this workflow and why they're rejected.
```

### Writing Style

- Use imperative mood ("Write tests first" not "You should write tests first")
- Be specific about conditions and actions
- Include examples where helpful
- Keep it focused (one skill, one purpose)

## Categories

| Category | Use For |
|----------|---------|
| `testing` | Test workflows, coverage, assertions |
| `development` | Code patterns, best practices, workflows |
| `documentation` | Writing docs, comments, READMEs |
| `security` | Security review, vulnerability analysis |
| `refactoring` | Code improvement, cleanup, migration |
| `performance` | Optimization, profiling, benchmarking |

## Supporting Files

Skills can include supporting files in a `resources/` subdirectory:

```
my-skill/
  SKILL.md
  resources/
    template.ts      # Code templates
    checklist.md     # Reference checklists
    examples/        # Example implementations
```

Reference them in the skill content:

```markdown
See [checklist](resources/checklist.md) for the full review process.
```

## User-Invocable Skills

Set `user-invocable: true` to enable `/skill-name` command triggering:

```yaml
---
name: commit
description: Generate commit message from staged changes
user-invocable: true
---
```

Users can then type `/commit` to invoke the skill directly.

## Example: Complete Skill

```markdown
---
name: tdd
description: |
  Enforce Test-Driven Development with three-phase gate system.
  Use when: implementing features, fixing bugs, refactoring.
  Blocks progress until conditions met. RED > GREEN > REFACTOR.
category: testing
user-invocable: true
---

# Test-Driven Development

You are not allowed to implement code until the full TDD cycle is followed.

## Three-Phase Gate System

### Phase 1: RED (Write Failing Test)

**BLOCKED: Cannot proceed until test failure is proven**

1. Write a test that captures expected behavior
2. Run the test. It MUST fail.
3. Document the failure output as proof

### Phase 2: GREEN (Make It Pass)

**BLOCKED: Cannot proceed until test passes**

1. Write MINIMUM code to make the test pass
2. Run the test. It MUST pass.
3. Document the pass output as proof

### Phase 3: REFACTOR (Clean Up)

1. Review code for improvements
2. Make changes while keeping tests green
3. Document what was refactored

## Blocking Conditions

| Phase | Condition to Proceed |
|-------|---------------------|
| RED > GREEN | Test failure output shown |
| GREEN > REFACTOR | Test pass output shown |
| REFACTOR > Done | Tests still pass |
```
