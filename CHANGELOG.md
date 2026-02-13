# Changelog

## [0.5.0] - 2026-02-13

### Added

- **semgrep** - New skill for Semgrep static analysis with parallel scan/triage workflow
- **workflow** - New skill for structured development cycle (brainstorm, plan, work, review, compound)
- **validate.sh** - Root-level validation script using hooks CLI

### Skills (12)

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| differential-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| model-router | Model tier routing for cost and reliability |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| semgrep | Semgrep static analysis with parallel scan/triage |
| skill-maker | Create Claude Code skills |
| tdd | Test-driven development workflow |
| workflow | Structured development cycle |

## [0.4.0] - 2026-02-13

### Added

- **model-router** - New skill for ROUTINE/MODERATE/COMPLEX model tier routing with explicit escalation and sub-agent defaults

### Changed

- **Merged no-workarounds into dogfood** - Consolidated into a single "use your tools, fix when broken" skill
- **Moved svelte5-rustaws-neon-devops** - Skill moved to [openclaw-skills](https://github.com/4meta5/openclaw-skills) repository
- **README links** - All skill table entries now link to their SKILL.md files
- **Skill descriptions** - Added `Use when:` trigger phrases to code-review-ts, differential-review, refactor-suggestions
- **Cross-references** - rick-rubin and skill-maker now reference model-router

### Removed

- **no-workarounds** - Merged into dogfood
- **svelte5-rustaws-neon-devops** - Moved to openclaw-skills

### Skills (10)

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| differential-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| model-router | Model tier routing for cost and reliability |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| skill-maker | Create Claude Code skills |
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
