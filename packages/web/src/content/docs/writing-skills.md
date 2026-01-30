---
title: Writing Skills
description: How to create your own skills
---

# Writing Skills

Create custom skills to encode your team's best practices, coding standards, and workflows.

## When to Create a Skill

Good candidates for skills:

- **Repeatable workflows** - TDD, code review checklists, deployment procedures
- **Team conventions** - Coding standards, naming conventions, architecture patterns
- **Domain expertise** - Framework-specific knowledge, API integration patterns
- **Quality gates** - Security checks, performance guidelines, accessibility requirements

## Quick Start

### 1. Create the Directory

```bash
mkdir -p .claude/skills/my-skill
```

### 2. Write SKILL.md

```bash
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: Brief description for skill discovery
category: development
---

# My Skill

Instructions for Claude go here.

## When to Use

Describe trigger conditions.

## Workflow

1. Step one
2. Step two
3. Step three
EOF
```

### 3. Test It

Start a new Claude Code session and verify the skill loads:

```bash
claude
```

Type a prompt that should trigger your skill and verify Claude follows the instructions.

## Skill Design Patterns

### Blocking Conditions

Force Claude to stop until conditions are met:

```markdown
## Blocking Condition

**BLOCKED: Tests must pass before proceeding**

Do not continue with implementation until all tests pass.
Show test output as proof.
```

### Phase Gates

Structure work into distinct phases:

```markdown
## Phase 1: Research

- Read existing code
- Identify patterns
- Document findings

**Gate:** Must complete research before Phase 2

## Phase 2: Implementation

- Write code
- Follow patterns from Phase 1
- Add tests
```

### Checklists

Ensure completeness:

```markdown
## Before Submitting

- [ ] Tests pass
- [ ] No lint errors
- [ ] Documentation updated
- [ ] PR description complete
```

### Rationalizations Table

Anticipate and block common shortcuts:

```markdown
## Rationalizations (Do Not Accept)

| Excuse | Why It's Wrong | Required Action |
|--------|----------------|-----------------|
| "It's a small change" | Small changes still need tests | Write the test |
| "I'll add tests later" | Later never comes | BLOCKED |
| "Tests are slow" | Speed doesn't override quality | Write the test |
```

## Best Practices

### Be Specific

**Bad:**
```markdown
Write good code.
```

**Good:**
```markdown
Functions must be under 20 lines. Extract helper functions for complex logic.
```

### Include Examples

**Bad:**
```markdown
Use proper error handling.
```

**Good:**
```markdown
## Error Handling

Wrap external calls in try-catch:

\`\`\`typescript
try {
  const result = await externalApi.call();
  return result;
} catch (error) {
  logger.error('External API failed', { error });
  throw new ExternalServiceError('API unavailable');
}
\`\`\`
```

### Define Scope

```markdown
## When to Use

Use this skill when:
- Creating new API endpoints
- Modifying existing endpoint behavior
- Adding authentication to endpoints

Do NOT use when:
- Writing utility functions
- Updating documentation only
- Refactoring without behavior changes
```

## Testing Skills

### Manual Testing

1. Create the skill
2. Start Claude Code in a test project
3. Trigger the skill with a relevant prompt
4. Verify Claude follows instructions

### Iterate

Skills often need refinement:

1. Observe where Claude deviates from intent
2. Add explicit constraints for those cases
3. Test again
4. Repeat until behavior matches expectations

## Sharing Skills

### Via Git Repository

1. Create a repository with your skills:

```
my-skills-repo/
├── tdd/
│   └── SKILL.md
├── code-review/
│   └── SKILL.md
└── README.md
```

2. Others can add your repo as a source:

```bash
skills source add https://github.com/you/my-skills-repo
skills add tdd
```

### Via npm Package

Package skills and publish to npm. Users install with:

```bash
skills add --git https://github.com/you/my-skills-repo
```

## Maintenance

### Version Your Skills

Track changes in skill content:

```yaml
---
name: my-skill
description: Description here
version: 1.2.0
---
```

### Document Changes

Add a changelog section:

```markdown
## Changelog

### 1.2.0
- Added blocking condition for tests
- Improved error handling examples

### 1.1.0
- Added TypeScript-specific patterns
```

### Keep Skills Focused

One skill should do one thing well. Split large skills into focused smaller ones:

- `tdd` - Test-driven development workflow
- `code-review` - Code review guidelines
- `security-analysis` - Security-focused review

Don't create a monolithic "best-practices" skill that tries to do everything.
