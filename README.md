# Claude Code Skills

Intelligent skill discovery and workflow enforcement for Claude Code.

```bash
npx @4meta5/skills-cli scan
```

## What It Does

**Skills** are reusable prompts that activate when needed. This CLI:

1. **Scans your project** and recommends relevant skills based on your tech stack
2. **Installs skills** to a flat `.claude/skills/` directory
3. **Tracks provenance** to distinguish custom skills from upstream sources
4. **Routes prompts** to the right skill using semantic matching
5. **Enforces workflows** like TDD and code review automatically

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

# List only custom skills (your own)
skills list --custom

# List only upstream skills (from sources)
skills list --upstream

# Show provenance type for each skill
skills list --provenance

# Add a specific skill
skills add tdd
```

## Why Skills?

Claude Code loads skills from `.claude/skills/` directories. Finding the right skills is hard. You need to know what exists, evaluate quality, and keep them updated.

This CLI solves that:

| Problem | Solution |
|---------|----------|
| "What skills should I use?" | `skills scan` analyzes your project |
| "Where do I find skills?" | Built-in library + curated community sources |
| "Are these skills any good?" | Confidence scoring and deduplication |
| "How do I install them?" | `skills add name` or `skills scan --all` |
| "Which skills did I write?" | `skills list --custom` filters by provenance |

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

## How Skills Get Activated

Skills don't activate by magic. They need hooks.

Claude Code supports "hooks" that run shell scripts when certain events happen. This CLI provides three hooks that make skills work:

| Hook | What It Does |
|------|--------------|
| `skill-forced-eval` | Injects a prompt forcing Claude to evaluate and activate relevant skills |
| `semantic-router` | Matches your prompt to skills using embeddings, suggests or forces activation |
| `usage-tracker` | Logs skill activations to `~/.claude/usage.jsonl` for analytics |

### Installing Hooks

```bash
# See available hooks
skills hook available

# Install all three
skills hook add skill-forced-eval semantic-router usage-tracker

# Check what's installed
skills hook list
```

This creates `.claude/hooks/` with the shell scripts and configures `.claude/settings.local.json` to run them on every prompt.

### How Each Hook Works

**skill-forced-eval**: Runs on every prompt. Calls `skills evaluate` to generate a list of installed skills with their triggers. Injects this into the conversation as a "mandatory activation sequence" that forces Claude to:
1. Evaluate each skill (YES/NO with reason)
2. Call `Skill(name)` for every YES
3. Only then proceed with implementation

**semantic-router**: Uses vector embeddings to score your prompt against skill descriptions. If similarity > 0.85, forces activation. If 0.70-0.85, suggests activation. Below 0.70, stays silent.

**usage-tracker**: Logs events like `prompt_submitted`, `session_start`, `skill_activated` to a JSONL file. Use `skills stats` to analyze.

### Without Hooks

If you skip hooks, skills still exist in `.claude/skills/` but Claude won't automatically know to use them. You'd have to manually invoke them with `/skill-name` or hope Claude reads the CLAUDE.md references.

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
| claude-svelte5-skill | Comprehensive Svelte 5 reference |
| sveltekit-svelte5-tailwind-skill | SvelteKit + Svelte 5 + Tailwind v4 integration |

## CLI Reference

| Command | Description |
|---------|-------------|
| `scan` | Analyze project, recommend skills |
| `scan --all` | Install all high-confidence recommendations |
| `scan --show-alternatives` | Show all matches, not just top per category |
| `add <name>` | Install a skill by name |
| `add <name> from <source>` | Install from a specific source |
| `list` | List installed skills |
| `list --custom` | List only custom skills (no git provenance) |
| `list --upstream` | List only upstream skills (git provenance) |
| `list --provenance` | Show provenance type for each skill |
| `show <name>` | Display skill details |
| `remove <name>` | Uninstall a skill |
| `hygiene scan` | Detect auto-generated test slop |
| `hygiene clean --confirm` | Delete detected slop |
| `claudemd sync` | Sync CLAUDE.md with installed skills |
| `hook available` | List bundled hooks |
| `hook add <names>` | Install hooks to project |
| `hook list` | List installed hooks |
| `hook remove <names>` | Remove hooks from project |
| `evaluate` | Generate skill evaluation prompt (used by hooks) |
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

## How Skills Are Recognized

A skill is any folder with a `SKILL.md` file inside `.claude/skills/`:

```
.claude/skills/
├── tdd/
│   └── SKILL.md          ← This makes it a skill
├── svelte-runes/
│   ├── SKILL.md          ← This makes it a skill
│   └── references/       ← Optional supporting files
└── my-custom-skill/
    └── SKILL.md          ← This makes it a skill
```

That's it. No registration. No config. Just `SKILL.md`.

## How Provenance Works

`.provenance.json` is optional metadata. It tracks where a skill came from.

**When the CLI installs a skill from a source**, it creates `.provenance.json`:

```json
{
  "source": { "type": "git", "url": "https://github.com/..." },
  "installed": { "at": "2024-01-15T...", "by": "skills-cli@1.0.0" }
}
```

**When you create a skill yourself**, there's no `.provenance.json`. The CLI treats missing provenance as "custom".

The logic is simple:
- Has `.provenance.json` with `type: "git"`? → upstream skill
- Has `.provenance.json` with `type: "custom"`? → custom skill
- No `.provenance.json` at all? → custom skill (default)

Use `skills list --provenance` to see which is which.

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
