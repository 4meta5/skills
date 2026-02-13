# Skills Collection

A curated collection of Claude Code skills for development workflows.

## Skills

| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines |
| code-review-ts | TypeScript code review guidelines |
| differential-review | Security-focused code review for diffs |
| dogfood | Enforces dogfooding and prevents manual workarounds |
| function-analyzer | Per-function deep analysis for audit context |
| model-router | Model tier routing for cost and reliability |
| paul-graham | Paul Graham inspired writing and markdown/README editing |
| refactor-suggestions | Suggest refactors for modified code |
| repo-hygiene | Repository housekeeping and documentation |
| rick-rubin | Scope discipline and simplicity |
| semgrep | Semgrep static analysis with parallel scan/triage |
| skill-maker | Create Claude Code skills |
| spec-compliance-checker | Spec-to-code compliance analysis |
| tdd | Test-driven development workflow |
| workflow | Structured development cycle |

## Installation

Copy skills to your project's `.claude/skills/` directory:

```bash
cp -r <skill-name> /path/to/project/.claude/skills/
```

Then reference in your CLAUDE.md:

```markdown
## Installed Skills
- @.claude/skills/<skill-name>/SKILL.md
```

## TypeScript Tooling

For the skills CLI and library, see the [hooks](https://github.com/4meta5/hooks) repository.
