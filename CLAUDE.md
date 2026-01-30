# Skills Library Project

This project provides a TypeScript library for managing Claude AI skills.

## Git Policy

**NEVER push to the remote repository.** The user will handle all pushes manually. You may commit locally, but do not run `git push` under any circumstances.

## Project Structure
- `packages/skills/` - Main TypeScript library
- `packages/cli/` - CLI for managing skills
- `packages/web/` - Website (private)
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

### Code Review & Security
- @.claude/skills/code-review-ts/SKILL.md - TypeScript review guidelines
- @.claude/skills/security-analysis/SKILL.md - Static security review
- @.claude/skills/differential-review/SKILL.md - Security-focused diff analysis
- @.claude/skills/code-maturity-assessor/SKILL.md - Trail of Bits maturity framework

### Frontend & UI
- @.claude/skills/frontend-design/SKILL.md - Production-grade UI creation
- @.claude/skills/baseline-ui/SKILL.md - Opinionated UI baseline
- @.claude/skills/web-design-guidelines/SKILL.md - Web Interface Guidelines
- @.claude/skills/fixing-accessibility/SKILL.md - Fix accessibility issues
- @.claude/skills/fixing-motion-performance/SKILL.md - Fix animation performance

### Svelte & SvelteKit
- @.claude/skills/claude-svelte5-skill/SKILL.md - Comprehensive Svelte 5 reference
- @.claude/skills/svelte-runes/SKILL.md - Svelte 5 runes guidance
- @.claude/skills/sveltekit-structure/SKILL.md - File-based routing, layouts
- @.claude/skills/sveltekit-data-flow/SKILL.md - Load functions, form actions
- @.claude/skills/sveltekit-svelte5-tailwind-skill/SKILL.md - SvelteKit + Svelte 5 + Tailwind

### Documentation
- @.claude/skills/markdown-writer/SKILL.md - Consistent markdown style
- @.claude/skills/blog-writer/SKILL.md - Blog post creation
- @.claude/skills/skill-maker/SKILL.md - Create Claude Code skills
- @.claude/skills/typescript-circular-dependency/SKILL.md - Resolve circular imports

## Workflow Orchestration

The **workflow-orchestrator** skill is always active. It detects context and chains:

| Context | Chain |
|---------|-------|
| New project | project-init → dogfood-skills |
| Task completion | doc-maintenance → repo-hygiene |
| Testing | tdd → suggest-tests → unit-test-workflow → property-based-testing → repo-hygiene |
| Feature done | dogfood-skills → repo-hygiene |
| Bug fix | tdd + no-workarounds → doc-maintenance |
