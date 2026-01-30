# Contributing

Thanks for your interest in contributing to Claude Code Skills.

## Ways to Contribute

1. **Report bugs**: Open an issue with reproduction steps
2. **Suggest features**: Open an issue describing the use case
3. **Submit skills**: Add new skills to the bundled library
4. **Improve docs**: Fix typos, clarify explanations, add examples
5. **Write code**: Fix bugs, implement features

## Development Setup

```bash
# Clone the repo
git clone https://github.com/4meta5/skills.git
cd skills

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run the CLI locally
npm run skills scan
```

## Project Structure

```
packages/
  skills-library/     # Core library for loading and managing skills
  skills-cli/         # Command-line interface
.claude/skills/       # Local skill definitions (for development)
```

## Code Style

- TypeScript strict mode
- Write tests first (TDD)
- Keep functions small and focused
- Use descriptive variable names

We use ESLint and Prettier. Run `npm run lint` before committing.

## Testing

```bash
# Unit tests (fast, runs on commit)
npm test

# Property-based tests (slower)
npm run test:property

# All tests
npm run test:all

# Type checking
npm run typecheck
```

Pre-commit hooks run typecheck and unit tests automatically.

## Submitting Changes

1. Fork the repo
2. Create a branch (`git checkout -b fix/issue-123`)
3. Make your changes
4. Write tests for new functionality
5. Run `npm test` and `npm run typecheck`
6. Commit with a clear message
7. Push and open a PR

## Commit Messages

Keep them concise and descriptive:

```
fix: handle missing SKILL.md gracefully
feat: add source management commands
docs: clarify skill format specification
test: add property tests for loader
```

## Adding a New Skill

1. Create a directory in `packages/skills-library/skills/`
2. Add a `SKILL.md` file with proper frontmatter
3. Include clear trigger conditions and instructions
4. Add tests if the skill has complex logic
5. Update the bundled skills list in the README

Skill template:

```markdown
---
name: my-skill
description: One-line description for matching
category: testing|development|documentation|security
---

# Skill Name

## When to Use

- Specific trigger condition
- Another trigger condition

## Instructions

Clear, actionable guidance...
```

## Questions?

Open an issue or start a discussion. We're happy to help.
