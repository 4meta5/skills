# Changelog

## [0.5.0] - 2026-02-13

### Added

- **paul-graham** - Writing and markdown editing skill. Direct prose, structural editing, README conventions.
- **semgrep** - Semgrep static analysis with parallel scan/triage workflow. Scanner and triager run as separate sub-agents.
- **workflow** - Structured development cycle with five phases: brainstorm, plan, work, review, compound.
- **function-analyzer** - Ultra-granular per-function deep analysis for security audit context building. Ported from Trail of Bits audit-skills.
- **spec-checker** - Specification-to-code compliance analysis using a 7-phase IR workflow. Ported from Trail of Bits audit-skills.
- **validate.sh** - Root-level validation script using the hooks CLI.
- **OpenAI Codex support** - Added `agents/openai.yaml` config to every skill for Codex agent usage.

### Changed

- **repo-hygiene** - Added alphabetical ordering rules, link validation, and paul-graham cross-reference.
- **diff-review** - Minor SKILL.md cleanup.

### Skills (15)

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| diff-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| function-analyzer | Per-function deep analysis for audit context |
| model-router | Model tier routing for cost and reliability |
| paul-graham | Writing and markdown/README editing |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| semgrep | Semgrep static analysis with parallel scan/triage |
| skill-maker | Create agentic skills |
| spec-checker | Spec-to-code compliance analysis |
| tdd | Test-driven development workflow |
| workflow | Structured development cycle |

## [0.4.0] - 2026-02-13

### Added

- **model-router** - New skill for ROUTINE/MODERATE/COMPLEX model tier routing with explicit escalation and sub-agent defaults

### Changed

- **Merged no-workarounds into dogfood** - Consolidated into a single "use your tools, fix when broken" skill
- **Moved svelte5-rustaws-neon-devops** - Skill moved to [openclaw-skills](https://github.com/4meta5/openclaw-skills) repository
- **README links** - All skill table entries now link to their SKILL.md files
- **Skill descriptions** - Added `Use when:` trigger phrases to code-review-ts, diff-review, refactor-suggestions
- **Cross-references** - rick-rubin and skill-maker now reference model-router

### Removed

- **no-workarounds** - Merged into dogfood
- **svelte5-rustaws-neon-devops** - Moved to openclaw-skills

### Skills (10)

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| diff-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| model-router | Model tier routing for cost and reliability |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| skill-maker | Create agentic skills |
| tdd | Test-driven development workflow |

## [0.3.0] - 2026-02-05

### Breaking Changes

- **Hooks extracted to separate repository** - All hooks have been moved to [github.com/4meta5/hooks](https://github.com/4meta5/hooks). The hooks repository now contains the TypeScript CLI, skill loader, and all hook implementations.
- **Packages removed** - The `packages/` directory containing CLI tooling, semantic matcher, and workflow enforcer has been extracted to the hooks repository.
- **Skills purged** - Removed 24 experimental/unused skills. This repository now focuses on a curated collection of 11 production-ready skills.

### Changed

- **Repository structure flattened** - Skills now live at the root level (`<skill-name>/`) instead of nested (`skills/<skill-name>/`). This fixes symlink resolution issues.

### Fixed

- Fixed symlink bug that caused skill resolution failures
- Fixed test bugs
- Cleaned up precommit hook artifacts from extraction

## [0.2.0] - 2026-02-03

- Initial release with hooks and packages

## [0.1.0] - 2026-02-01

- Initial release
