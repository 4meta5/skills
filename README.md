# Skills

A curated collection of Claude Code skills for development workflows.

## Available Skills

### Code Review
| Skill | Description |
|-------|-------------|
| [code-review-rust](./code-review-rust/SKILL.md) | Rust code review guidelines (error handling, safety, idioms) |
| [code-review-ts](./code-review-ts/SKILL.md) | TypeScript code review guidelines (type safety, idioms) |
| [differential-review](./differential-review/SKILL.md) | Security-focused review for PRs and diffs |

### Security
| Skill | Description |
|-------|-------------|
| [function-analyzer](./function-analyzer/SKILL.md) | Ultra-granular per-function analysis for audit context building |
| [semgrep](./semgrep/SKILL.md) | Semgrep static analysis with parallel scan/triage workflow |
| [spec-compliance-checker](./spec-compliance-checker/SKILL.md) | Spec-to-code compliance analysis (7-phase IR workflow) |

### Testing
| Skill | Description |
|-------|-------------|
| [tdd](./tdd/SKILL.md) | Test-driven development (RED → GREEN → REFACTOR) |

### Development Enforcement
| Skill | Description |
|-------|-------------|
| [dogfood](./dogfood/SKILL.md) | Enforces using tools you build + prevents manual workarounds |
| [model-router](./model-router/SKILL.md) | Model tier routing for cost and reliability |
| [paul-graham](./paul-graham/SKILL.md) | Paul Graham inspired writing and markdown/README editing |
| [rick-rubin](./rick-rubin/SKILL.md) | Scope discipline and simplicity |

### Repository Maintenance
| Skill | Description |
|-------|-------------|
| [refactor-suggestions](./refactor-suggestions/SKILL.md) | Suggest refactors for modified code |
| [repo-hygiene](./repo-hygiene/SKILL.md) | Pre-work checks, documentation updates, cleanup |

### Workflow
| Skill | Description |
|-------|-------------|
| [workflow](./workflow/SKILL.md) | Structured development cycle (brainstorm → plan → work → review → compound) |

### Creation
| Skill | Description |
|-------|-------------|
| [skill-maker](./skill-maker/SKILL.md) | Create Claude Code skills |

## Naming

All skill names and folder names use **kebab-case** (lowercase, hyphens only).

## Validation

```bash
./validate.sh            # all skills
./validate.sh semgrep    # single skill
```

Requires `../hooks` repo (see [hooks](https://github.com/4meta5/hooks)).

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
