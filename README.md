# Skills

24 curated agentic skills for Claude Code, organized into five categories.

## All Skills

| Skill | Category | Description |
| --- | --- | --- |
| [install-skill](./install-skill/SKILL.md) | `meta` | Install skills into a target project via the hooks CLI |
| [make-skill](./make-skill/SKILL.md) | `meta` | Create, update, and validate skills using the canonical taxonomy |
| [script-agents](./script-agents/SKILL.md) | `meta` | Build minimal prompt-dispatch scripts for coding agents |
| [wip](./wip/SKILL.md) | `meta` | Prompt library workflow with safe mutation guardrails |
| [code-review-rust](./code-review-rust/SKILL.md) | `audit` | Rust code review focused on correctness, safety, and idiomatic patterns |
| [code-review-ts](./code-review-ts/SKILL.md) | `audit` | TypeScript code review focused on type safety and TS idioms |
| [diff-review](./diff-review/SKILL.md) | `audit` | Security-focused differential review of PRs, commits, and diffs |
| [function-analyzer](./function-analyzer/SKILL.md) | `audit` | Per-function deep analysis for security audit context |
| [semantic-grep](./semantic-grep/SKILL.md) | `audit` | Semgrep static analysis with parallel execution and structured triage |
| [spec-checker](./spec-checker/SKILL.md) | `audit` | Specification-to-code compliance analysis |
| [bryan-cantrill](./bryan-cantrill/SKILL.md) | `principles` | Evidence-first engineering with written design and observability |
| [dogfood](./dogfood/SKILL.md) | `principles` | Enforce dogfooding for tool projects. No manual workarounds. |
| [elon-musk](./elon-musk/SKILL.md) | `principles` | Delete-first refactoring with strict safety and rollback |
| [fresh-eyes](./fresh-eyes/SKILL.md) | `principles` | Perspective-shift discipline for plans, code, and bugs |
| [linus-torvalds](./linus-torvalds/SKILL.md) | `principles` | No regressions, minimal patches, proof over talk |
| [model-router](./model-router/SKILL.md) | `principles` | Route work to the cheapest model tier that succeeds |
| [refactor-suggestions](./refactor-suggestions/SKILL.md) | `principles` | Scoped refactor suggestions from branch diffs |
| [rick-rubin](./rick-rubin/SKILL.md) | `principles` | Scope discipline and simplicity for agent tasks |
| [steve-jobs](./steve-jobs/SKILL.md) | `principles` | Experience-first product planning with ruthless focus |
| [tdd](./tdd/SKILL.md) | `principles` | Test-driven development with RED-GREEN-REFACTOR enforcement |
| [compound-workflow](./compound-workflow/SKILL.md) | `habits` | Structured workflow: brainstorm, plan, work, review, compound |
| [paul-graham](./paul-graham/SKILL.md) | `habits` | Clear, direct prose. Optimize for insight per sentence. |
| [repo-hygiene](./repo-hygiene/SKILL.md) | `habits` | Repository housekeeping: pre-work checks, docs, cleanup |
| [svelte5-cloudflare](./svelte5-cloudflare/SKILL.md) | `hot` | SvelteKit on Cloudflare Workers |

## Categories

| Category | Purpose |
| --- | --- |
| `meta` | Create and manage skills |
| `audit` | Security review, static analysis, compliance |
| `principles` | Engineering discipline and development practices |
| `habits` | Workflow patterns and documentation standards |
| `hot` | Framework-specific skills for active stacks |

## Quick Start

Copy a skill directly:

```bash
cp -r <skill-name> /path/to/project/.claude/skills/
```

Or install with the [hooks CLI](https://github.com/4meta5/hooks).

Runtime libraries for loading, matching, and detecting skills live in [skillex](https://github.com/4meta5/skillex).

## Prompt Workflow

Shell wrappers for fast prompt reuse. Defined in `~/.zsh/skills-promptlib.zsh`, sourced from `~/.zshrc`.

| Command | What It Does |
| --- | --- |
| `pp` | Append a prompt to the scratchpad (`prompt-append.sh`) |
| `ppx` | Print prompts as LLM worksheet, paste back improvements (`prompt-improve.sh`) |
| `rr <A-J>` | Extract and print a rick-rubin prompt section |
| `rff <P\|R\|F>` | Print a fresh-eyes prompt (Planning, Review, or Reflection) |

Clipboard (`pbcopy`/`xclip`) is optional. Stdout always works.
