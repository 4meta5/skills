# Changelog

## [Unreleased]

### Changed

- **Added model-router** - New core skill for ROUTINE/MODERATE/COMPLEX model tier routing with explicit escalation and sub-agent defaults
- **Moved svelte5-rustaws-neon-devops** - Skill moved to [openclaw-skills](https://github.com/4meta5/openclaw-skills) repository
- **Merged no-workarounds into dogfood** - The no-workarounds skill has been folded into dogfood for a unified "use your tools, fix when broken" enforcement

### Remaining Skills (10)

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| differential-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| model-router | Model tier routing for cost and reliability |
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
