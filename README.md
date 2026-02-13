# Skills

A curated collection of Claude Code skills for development workflows.

## Available Skills

### Code Review
| Skill | Description |
|-------|-------------|
| [code-review-rust](./code-review-rust/SKILL.md) | Rust code review guidelines (error handling, safety, idioms) |
| [code-review-ts](./code-review-ts/SKILL.md) | TypeScript code review guidelines (type safety, idioms) |
| [differential-review](./differential-review/SKILL.md) | Security-focused review for PRs and diffs |

### Testing
| Skill | Description |
|-------|-------------|
| [tdd](./tdd/SKILL.md) | Test-driven development (RED → GREEN → REFACTOR) |

### Development Enforcement
| Skill | Description |
|-------|-------------|
| [dogfood](./dogfood/SKILL.md) | Enforces using tools you build + prevents manual workarounds |
| [rick-rubin](./rick-rubin/SKILL.md) | Scope discipline and simplicity |
| [model-router](./model-router/SKILL.md) | Model tier routing for cost and reliability |

### Repository Maintenance
| Skill | Description |
|-------|-------------|
| [repo-hygiene](./repo-hygiene/SKILL.md) | Pre-work checks, documentation updates, cleanup |
| [refactor-suggestions](./refactor-suggestions/SKILL.md) | Suggest refactors for modified code |

### Creation
| Skill | Description |
|-------|-------------|
| [skill-maker](./skill-maker/SKILL.md) | Create Claude Code skills |

## Installation

Copy a skill to your project:

```bash
cp -r <skill-name> /path/to/project/.claude/skills/
```

Reference in your CLAUDE.md:

```markdown
## Installed Skills
- @.claude/skills/<skill-name>/SKILL.md
```

## TypeScript Tooling

For the skills CLI and library (scanning, installing, validating), see [hooks](https://github.com/4meta5/hooks).

## License

MIT
