# Skills Library Project

This project provides a TypeScript library for managing Claude AI skills.

## Git Policy

**NEVER push to the remote repository.** The user will handle all pushes manually. You may commit locally, but do not run `git push` under any circumstances.

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
- Write tests first (use the tdd skill)
- Keep functions small and focused
- Use descriptive variable names

## Key Files
- @packages/skills-library/src/types.ts - Core type definitions
- @packages/skills-library/src/loader.ts - Skill loading utilities
- @packages/skills-library/src/library.ts - Main library implementation

## Dogfooding Requirement

**IMPORTANT**: This project builds the skills CLI. You MUST use it:

1. After completing features, run: `./packages/skills-cli/bin/skills.js scan`
2. Install recommendations: `./packages/skills-cli/bin/skills.js scan --all`
3. Use installed skills in your workflow

If you skip this, respond: **"BLOCKED: DOGFOODING REQUIRED"**

## Installed Skills
- @.claude/skills/blog-writer/SKILL.md
- @.claude/skills/repo-hygiene/SKILL.md
- @.claude/skills/skill-maker/SKILL.md
- @.claude/skills/fixing-accessibility/SKILL.md
- @.claude/skills/fixing-motion-performance/SKILL.md
- @.claude/skills/frontend-design/SKILL.md
- @.claude/skills/baseline-ui/SKILL.md
- @.claude/skills/web-design-guidelines/SKILL.md
- @.claude/skills/claude-svelte5-skill/SKILL.md
- @.claude/skills/svelte-runes/SKILL.md
- @.claude/skills/sveltekit-structure/SKILL.md
- @.claude/skills/sveltekit-data-flow/SKILL.md
- @.claude/skills/sveltekit-svelte5-tailwind-skill/SKILL.md
- @.claude/skills/markdown-writer/SKILL.md
- @.claude/skills/property-based-testing/SKILL.md
- @.claude/skills/code-maturity-assessor/SKILL.md
- @.claude/skills/typescript-circular-dependency/SKILL.md
- @.claude/skills/dogfood-skills/SKILL.md - **Enforces dogfooding (READ THIS)**
- @.claude/skills/no-workarounds/SKILL.md - **Prevents manual workarounds when building tools**
- @.claude/skills/differential-review/SKILL.md
- @.claude/skills/claudeception/SKILL.md
- @.claude/skills/code-review-ts/SKILL.md
- @.claude/skills/security-analysis/SKILL.md
- @.claude/skills/suggest-tests/SKILL.md
- @.claude/skills/unit-test-workflow/SKILL.md
- @.claude/skills/tdd/SKILL.md
- @.claude/skills/workflow/SKILL.md - **Workflow orchestration (chains with tdd, no-workarounds, dogfood-skills)**
