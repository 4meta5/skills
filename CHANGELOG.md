# Changelog

## [0.7.0] - 2026-02-16

### Added

- **bryan-cantrill** - Evidence-first engineering. Written design before implementation, risk-ordered execution, observability contracts.
- **elon-musk** - Delete-first refactoring with strict Git safety gates and rollback discipline.
- **linus-torvalds** - No regressions, no breaking userspace, minimal patches, proof over talk. P0-P4 priority stack.
- **steve-jobs** - Experience-first product planning. Top-10 enforcement, DRI ownership, ruthless focus.

### Changed

- **make-skill** - Added mandatory steps to update CLAUDE.md and verify AGENTS.md after skill creation.

### Skills (23)

| Skill | Category |
|-------|----------|
| bryan-cantrill | principles |
| code-review-rust | audit |
| code-review-ts | audit |
| compound-workflow | habits |
| diff-review | audit |
| dogfood | principles |
| elon-musk | principles |
| fresh-eyes | principles |
| function-analyzer | audit |
| install-skill | meta |
| linus-torvalds | principles |
| make-skill | meta |
| model-router | principles |
| paul-graham | habits |
| refactor-suggestions | principles |
| repo-hygiene | habits |
| rick-rubin | principles |
| semantic-grep | audit |
| spec-checker | audit |
| steve-jobs | principles |
| svelte5-cloudflare | hot |
| tdd | principles |
| wip | meta |

## [0.6.0] - 2026-02-14

### Stabilized

- **Canonical skill taxonomy is now stable.** The five categories — `meta`, `audit`, `principles`, `habits`, `hot` — are final and will not change going forward.

### Categories

| Category | Skills |
|----------|--------|
| **meta** | make-skill, install-skill |
| **audit** | code-review-rust, code-review-ts, diff-review, function-analyzer, semantic-grep, spec-checker |
| **principles** | tdd, refactor-suggestions, dogfood, model-router, rick-rubin |
| **habits** | compound-workflow, repo-hygiene, paul-graham |
| **hot** | svelte5-cloudflare |

### Changed

- **Renamed skills** - `skill-maker` → `make-skill`, `semgrep` → `semantic-grep`, `workflow` → `compound-workflow`
- **Added install-skill** - Skill installation workflow using the hooks CLI
- **Added svelte5-cloudflare** - Svelte 5 + SvelteKit on Cloudflare Workers skill (hot category)

### Skills (17)

| Skill | Category |
|-------|----------|
| code-review-rust | audit |
| code-review-ts | audit |
| compound-workflow | habits |
| diff-review | audit |
| dogfood | principles |
| function-analyzer | audit |
| install-skill | meta |
| make-skill | meta |
| model-router | principles |
| paul-graham | habits |
| refactor-suggestions | principles |
| repo-hygiene | habits |
| rick-rubin | principles |
| semantic-grep | audit |
| spec-checker | audit |
| svelte5-cloudflare | hot |
| tdd | principles |

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
