# Skills

A curated collection of Claude Code skills for development workflows.

## Available Skills

### Code Review
| Skill | Description |
|-------|-------------|
| code-review-rust | Rust code review guidelines (error handling, safety, idioms) |
| code-review-ts | TypeScript code review guidelines (type safety, idioms) |
| differential-review | Security-focused review for PRs and diffs |

### Testing
| Skill | Description |
|-------|-------------|
| tdd | Test-driven development (RED → GREEN → REFACTOR) |

### Development Enforcement
| Skill | Description |
|-------|-------------|
| dogfood | Enforces using tools you build |
| no-workarounds | Prevents manual workarounds when building tools |
| rick-rubin | Scope discipline and simplicity |

### Repository Maintenance
| Skill | Description |
|-------|-------------|
| repo-hygiene | Pre-work checks, documentation updates, cleanup |
| refactor-suggestions | Suggest refactors for modified code |

### Creation
| Skill | Description |
|-------|-------------|
| skill-maker | Create Claude Code skills |

### Deployment
| Skill | Description |
|-------|-------------|
| svelte5-rustaws-neon-devops | Deploy Svelte5/Rust/Neon stack |

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
