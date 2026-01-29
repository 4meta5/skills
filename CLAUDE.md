# Skills Library Project

This project provides a TypeScript library for managing Claude AI skills.

## Project Structure
- `packages/skills-library/` - Main TypeScript library
- `.claude/skills/` - Local skill definitions

## Development Commands
- `npm run build` - Build the library
- `npm test` - Run unit tests (fast, runs on commit)
- `npm run test:property` - Run property-based tests (slower, run manually)
- `npm run test:all` - Run all tests (unit + property)
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - Lint code

## Testing Strategy
- **Unit tests** (`*.test.ts`) - Fast, deterministic tests for specific functionality
- **Property tests** (`*.property.test.ts`) - Randomized tests using fast-check to verify invariants

## Git Hooks (Lefthook)
Pre-commit hook runs typecheck + unit tests in parallel. Property tests are excluded for speed.

**Skip hooks when needed:**
- `LEFTHOOK=0 git commit -m "message"` - Skip all hooks
- `SKIP=typecheck git commit -m "message"` - Skip specific hook

## Coding Conventions
- Use TypeScript strict mode
- Write tests first (use the test-first-bugfix skill)
- Keep functions small and focused
- Use descriptive variable names

## Key Files
- @packages/skills-library/src/types.ts - Core type definitions
- @packages/skills-library/src/loader.ts - Skill loading utilities
- @packages/skills-library/src/library.ts - Main library implementation

## Installed Skills
- @.claude/skills/test-first-bugfix/SKILL.md
