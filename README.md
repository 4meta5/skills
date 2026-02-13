# Skills

15 curated agentic skills for AI-assisted development workflows. Each skill is a self-contained prompt that teaches a coding agent a specific capability. Works with Claude Code and OpenAI Codex.

## Available Skills

### Code Review
| Skill | Description |
|-------|-------------|
| [code-review-rust](./code-review-rust/SKILL.md) | Rust review (error handling, safety, idioms) |
| [code-review-ts](./code-review-ts/SKILL.md) | TypeScript review (type safety, idioms) |
| [differential-review](./differential-review/SKILL.md) | Security-focused review for PRs and diffs |

### Security Analysis
| Skill | Description |
|-------|-------------|
| [function-analyzer](./function-analyzer/SKILL.md) | Per-function deep analysis for audit context |
| [semgrep](./semgrep/SKILL.md) | Semgrep static analysis with parallel scan/triage |
| [spec-compliance-checker](./spec-compliance-checker/SKILL.md) | Spec-to-code compliance analysis |

### Testing
| Skill | Description |
|-------|-------------|
| [tdd](./tdd/SKILL.md) | Test-driven development (RED, GREEN, REFACTOR) |

### Development Enforcement
| Skill | Description |
|-------|-------------|
| [dogfood](./dogfood/SKILL.md) | Use the tools you build. No manual workarounds. |
| [model-router](./model-router/SKILL.md) | Route work to the cheapest capable model tier |
| [rick-rubin](./rick-rubin/SKILL.md) | Scope discipline and simplicity |

### Writing
| Skill | Description |
|-------|-------------|
| [paul-graham](./paul-graham/SKILL.md) | Direct prose, structural editing, README quality |

### Repository Maintenance
| Skill | Description |
|-------|-------------|
| [refactor-suggestions](./refactor-suggestions/SKILL.md) | Suggest refactors for modified code |
| [repo-hygiene](./repo-hygiene/SKILL.md) | Pre-work checks, documentation updates, cleanup |

### Workflow
| Skill | Description |
|-------|-------------|
| [workflow](./workflow/SKILL.md) | Structured cycle: brainstorm, plan, work, review, compound |

### Creation
| Skill | Description |
|-------|-------------|
| [skill-maker](./skill-maker/SKILL.md) | Create new agentic skills |

## Quick Start

### Claude Code

Copy a skill into your project:

```bash
cp -r semgrep /path/to/project/.claude/skills/
```

Reference it in your project's `CLAUDE.md`:

```markdown
## Installed Skills
- @.claude/skills/semgrep/SKILL.md
```

### OpenAI Codex

Every skill includes an `agents/openai.yaml` config. Point your Codex agent at the yaml file for the skill you want to use.

## Validation

```bash
./validate.sh            # all skills
./validate.sh semgrep    # single skill
```

Requires the [hooks](https://github.com/4meta5/hooks) repo at `../hooks`.

## License

MIT
