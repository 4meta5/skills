# Claude Code Skills

Intelligent skill discovery and workflow enforcement for Claude Code.

```bash
npx @4meta5/skills-cli scan
```

## What It Does

**Skills** are reusable prompts that activate when needed. This CLI:

1. **Scans your project** and recommends relevant skills based on your tech stack
2. **Installs skills** to `.claude/skills/` for Claude Code to discover
3. **Routes prompts** to the right skill using semantic matching
4. **Enforces workflows** like TDD and code review automatically

## Quick Start

```bash
# Install globally
npm install -g @4meta5/skills-cli

# Scan your project for recommended skills
skills scan

# Install all high-confidence recommendations
skills scan --all

# List installed skills
skills list

# Add a specific skill
skills add tdd
```

## Why Skills?

Claude Code loads skills from `.claude/skills/` directories. But finding the right skills is hard. You need to know what exists, evaluate quality, and keep them updated.

This CLI solves that:

| Problem | Solution |
|---------|----------|
| "What skills should I use?" | `skills scan` analyzes your project |
| "Where do I find skills?" | Built-in library + curated community sources |
| "Are these skills any good?" | Confidence scoring and deduplication |
| "How do I install them?" | `skills add name` or `skills scan --all` |

## Features

### Project Analysis

Detects your tech stack automatically:

- **Languages**: TypeScript, Python, Rust, Go
- **Frameworks**: React, Vue, Svelte, Next.js, SvelteKit
- **Databases**: Postgres, MongoDB, Prisma, Drizzle
- **Testing**: Vitest, Jest, Pytest, Playwright
- **Deployment**: AWS, Cloudflare, Vercel

### Skill Matching

Maps your stack to relevant skills with confidence levels:

```
HIGH   tdd                    Testing workflow enforcement
HIGH   typescript-strict      TypeScript best practices
MEDIUM security-analysis      Security review for PRs
LOW    aws-cdk                AWS CDK patterns (detected: cloudflare)
```

### Semantic Routing

Skills activate based on context, not manual invocation. The router scores your prompt against skill descriptions and triggers the right one.

### Bundled Skills

| Category | Skills |
|----------|--------|
| Testing | tdd, unit-test-workflow, suggest-tests, property-based-testing |
| Development | no-workarounds, code-review, code-review-ts |
| Security | security-analysis, differential-review |
| Documentation | markdown-writer |
| Learning | claudeception |

## CLI Reference

| Command | Description |
|---------|-------------|
| `scan` | Analyze project, recommend skills |
| `scan --all` | Install all high-confidence recommendations |
| `add <name>` | Install a skill by name |
| `add <name> from <source>` | Install from a specific source |
| `list` | List installed skills |
| `show <name>` | Display skill details |
| `remove <name>` | Uninstall a skill |
| `source list` | List configured skill sources |
| `source add <url>` | Add a skill repository |
| `stats` | Show usage analytics |

## Skill Format

Skills are Markdown files with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it
category: testing
---

# My Skill

Instructions for Claude when this skill activates.

## When to Use

- Trigger condition 1
- Trigger condition 2

## How to Apply

Step-by-step guidance...
```

See [SKILL_FORMAT.md](./docs/SKILL_FORMAT.md) for the full specification.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development

```bash
# Clone and install
git clone https://github.com/4meta5/skills.git
cd skills
npm install

# Build
npm run build

# Test
npm test

# Run CLI locally
npm run skills scan
```

## License

MIT. See [LICENSE](./LICENSE).

## Links

- [Documentation](./docs/)
- [Skill Format Specification](./docs/SKILL_FORMAT.md)
- [Implementation Status](./docs/DONE.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
