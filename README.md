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

## Bundled Skills

### Testing & Quality

| Skill | Description |
|-------|-------------|
| tdd | Test-driven development workflow (RED/GREEN/REFACTOR) |
| unit-test-workflow | Multi-phase test generation |
| suggest-tests | Recommend tests based on git diff |
| property-based-testing | Property and invariant testing guidance |

### Development Workflow

| Skill | Description |
|-------|-------------|
| no-workarounds | Prevents manual workarounds when building tools |
| dogfood-skills | Enforces using the tools you build |
| claudeception | Extracts learnings into new skills |
| typescript-circular-dependency | Detect and resolve circular imports |

### Code Review & Security

| Skill | Description |
|-------|-------------|
| code-review-ts | TypeScript-specific review guidelines |
| security-analysis | Static security review for PRs |
| differential-review | Security-focused diff analysis |
| code-maturity-assessor | Trail of Bits maturity framework |

### Documentation

| Skill | Description |
|-------|-------------|
| markdown-writer | Consistent markdown style (Paul Graham voice) |
| blog-writer | Blog post creation for amarsingh.dev |

### Frontend & UI

| Skill | Description |
|-------|-------------|
| frontend-design | Distinctive, production-grade UI creation |
| baseline-ui | Enforces opinionated UI baseline |
| web-design-guidelines | Review against Web Interface Guidelines |
| fixing-accessibility | Fix accessibility issues |
| fixing-motion-performance | Fix animation performance issues |

### Svelte & SvelteKit

| Skill | Description |
|-------|-------------|
| svelte-runes | Svelte 5 runes guidance ($state, $derived, $effect) |
| sveltekit-structure | File-based routing, layouts, error handling |
| sveltekit-data-flow | Load functions, form actions, data flow |
| _temp_claude-svelte5-skill | Comprehensive Svelte 5 reference |
| _temp_sveltekit-svelte5-tailwind-skill | SvelteKit + Svelte 5 + Tailwind v4 integration |

## CLI Reference

| Command | Description |
|---------|-------------|
| `scan` | Analyze project, recommend skills |
| `scan --all` | Install all high-confidence recommendations |
| `scan --show-alternatives` | Show all matches, not just top per category |
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

## Packages

This monorepo contains:

| Package | Description |
|---------|-------------|
| `@4meta5/skills-cli` | CLI for scanning, installing, and managing skills |
| `@4meta5/skills-library` | Core library for loading and parsing skills |
| `@4meta5/skills-web` | Website for browsing and discovering skills |

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
