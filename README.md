# Skills

17 curated agentic skills for Claude Code, organized into five categories.

## All Skills

| Skill | Category | Description |
| --- | --- | --- |
| [make-skill](./make-skill/SKILL.md) | `meta` | Create and validate new skills using the canonical taxonomy |
| [install-skill](./install-skill/SKILL.md) | `meta` | Install skills into a target project via the hooks CLI |
| [code-review-rust](./code-review-rust/SKILL.md) | `audit` | Rust code review focused on correctness, safety, and idiomatic patterns |
| [code-review-ts](./code-review-ts/SKILL.md) | `audit` | TypeScript code review focused on type safety and TS idioms |
| [diff-review](./diff-review/SKILL.md) | `audit` | Security-focused differential review of PRs, commits, and diffs |
| [function-analyzer](./function-analyzer/SKILL.md) | `audit` | Ultra-granular per-function deep analysis for security audit context |
| [semantic-grep](./semantic-grep/SKILL.md) | `audit` | Semgrep static analysis with parallel execution and structured triage |
| [spec-checker](./spec-checker/SKILL.md) | `audit` | Specification-to-code compliance analysis |
| [tdd](./tdd/SKILL.md) | `principles` | Test-driven development with RED-GREEN-REFACTOR enforcement |
| [refactor-suggestions](./refactor-suggestions/SKILL.md) | `principles` | Scoped refactor suggestions for security, maintainability, and readability |
| [dogfood](./dogfood/SKILL.md) | `principles` | Enforce dogfooding for tool projects; prevent manual workarounds |
| [model-router](./model-router/SKILL.md) | `principles` | Route work to the cheapest model tier that can reliably complete it |
| [rick-rubin](./rick-rubin/SKILL.md) | `principles` | Enforce scope discipline and simplicity for agent tasks |
| [compound-workflow](./compound-workflow/SKILL.md) | `habits` | Structured workflow: brainstorm, plan, work, review, compound |
| [repo-hygiene](./repo-hygiene/SKILL.md) | `habits` | Repository housekeeping: pre-work checks, docs, cleanup |
| [paul-graham](./paul-graham/SKILL.md) | `habits` | Write high-signal prose in a Paul Graham style |
| [svelte5-cloudflare](./svelte5-cloudflare/SKILL.md) | `hot` | Deploy Svelte 5 + SvelteKit on Cloudflare Workers safely |

## Categories

| Category | Purpose |
| --- | --- |
| `meta` | Skills that create and manage other skills |
| `audit` | Security review, static analysis, and compliance |
| `principles` | Development practices and engineering discipline |
| `habits` | Workflow patterns and documentation standards |
| `hot` | Framework-specific skills for active stacks |

## Quick Start

Copy a skill directly:

```bash
cp -r <skill-name> /path/to/project/.claude/skills/
```

Or install with the [hooks CLI](https://github.com/4meta5/hooks).
