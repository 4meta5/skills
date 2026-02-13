# Skills Collection

A curated collection of Claude Code skills for development workflows.

## Skills

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
