# Skills Library Project

This project provides a TypeScript library for managing Claude AI skills.

## Project Structure
- `packages/skills/` - Main TypeScript library
- `packages/cli/` - CLI for managing skills
- `packages/chain/` - Skill chaining system
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
- @packages/skills/src/types.ts - Core type definitions
- @packages/skills/src/loader.ts - Skill loading utilities
- @packages/skills/src/library.ts - Main library implementation

## Dogfooding Requirement

**IMPORTANT**: This project builds the skills CLI. You MUST use it:

1. After completing features, run: `./packages/cli/bin/skills.js scan`
2. Install recommendations: `./packages/cli/bin/skills.js scan --all`
3. Use installed skills in your workflow

If you skip this, respond: **"BLOCKED: DOGFOODING REQUIRED"**

## Installed Skills
- @.claude/skills/deploy-mystack/SKILL.md
- @.claude/skills/google-oauth/SKILL.md
- @.claude/skills/neon-postgres/SKILL.md
- @.claude/skills/rust-aws-lambda/SKILL.md
- @.claude/skills/svelte5-cloudflare-pages/SKILL.md
- @.claude/skills/code-review/SKILL.md
- @.claude/skills/code-review-js/SKILL.md
- @.claude/skills/code-review-rust/SKILL.md
- @.claude/skills/describe-codebase/SKILL.md
- @.claude/skills/pr-description/SKILL.md
- @.claude/skills/refactor-suggestions/SKILL.md
- @.claude/skills/npm-publish/SKILL.md
- @.claude/skills/repo-conventions-check/SKILL.md
- @.claude/skills/engram-summarize/SKILL.md
- @.claude/skills/engram-generate/SKILL.md
- @.claude/skills/bluebubbles-setup/SKILL.md
- @.claude/skills/imessage-tone/SKILL.md

### Workflow Orchestration
- @.claude/skills/workflow-orchestrator/SKILL.md - **Always-on workflow orchestration**
- @.claude/skills/project-init/SKILL.md - Scaffold new projects
- @.claude/skills/doc-maintenance/SKILL.md - Update documentation after tasks
- @.claude/skills/agent-orchestration/SKILL.md - Coordinate parallel agents
- @.claude/skills/gitignore-hygiene/SKILL.md - Maintain gitignore patterns
- @.claude/skills/research-to-plan/SKILL.md - Convert research to plans

### Testing Pipeline
- @.claude/skills/tdd/SKILL.md - Test-driven development (RED → GREEN → REFACTOR)
- @.claude/skills/suggest-tests/SKILL.md - Recommend tests from git diff
- @.claude/skills/unit-test-workflow/SKILL.md - Generate comprehensive tests
- @.claude/skills/property-based-testing/SKILL.md - Property and invariant testing
- @.claude/skills/repo-hygiene/SKILL.md - Clean test artifacts (TERMINAL)

### Development Enforcement
- @.claude/skills/dogfood-skills/SKILL.md - **Enforces dogfooding (READ THIS)**
- @.claude/skills/no-workarounds/SKILL.md - **Prevents manual workarounds when building tools**
- @.claude/skills/claudeception/SKILL.md - Extract learnings as skills

### Memory
- @.claude/skills/engram-recall/SKILL.md - Recall past work before starting new tasks

### Code Review & Security
- @.claude/skills/code-review-ts/SKILL.md - TypeScript review guidelines
- @.claude/skills/security-analysis/SKILL.md - Static security review
- @.claude/skills/differential-review/SKILL.md - Security-focused diff analysis
- @.claude/skills/code-maturity-assessor/SKILL.md - Trail of Bits maturity framework

### Documentation
- @.claude/skills/markdown-writer/SKILL.md - Consistent markdown style
- @.claude/skills/skill-maker/SKILL.md - Create Claude Code skills
- @.claude/skills/readme-writer/SKILL.md - Write effective README files
- @.claude/skills/monorepo-readme/SKILL.md - Monorepo README patterns
- @.claude/skills/typescript-circular-dependency/SKILL.md - Resolve circular imports

## Workflow Orchestration

The **workflow-orchestrator** skill is always active. It detects context and chains:

| Context | Chain |
|---------|-------|
| New project | project-init → dogfood-skills |
| Task completion | doc-maintenance → repo-hygiene |
| Testing | tdd → suggest-tests → unit-test-workflow → property-based-testing → repo-hygiene |
| Feature done | dogfood-skills → repo-hygiene → doc-maintenance |
| Bug fix | tdd + no-workarounds → doc-maintenance |
