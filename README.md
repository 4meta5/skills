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

### Skill Chaining

Skills chain together using the declarative chain system in `packages/chain/`.

**How it works:**
1. Define skills with capabilities they provide/require in `chains/skills.yaml`
2. Define workflow profiles in `chains/profiles.yaml`
3. Chain system resolves skill order using DAG-based resolution
4. Hooks enforce prerequisites before allowing tools

**Commands:**
```bash
chain validate              # Validate YAML specs
chain resolve --profile X   # Show resolved skill chain
chain status                # Show current chain progress
chain activate --profile X  # Activate a workflow
chain next                  # Show next step in chain
chain clear                 # Clear active session
```

**Status:** Phases 0-3.5 complete (189 tests). Profile auto-selection pending.

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
| `update --check` | Check for upstream skill updates |
| `update <name>` | Update a skill from its source |
| `update --all` | Update all upstream skills |
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
  "source": {
    "type": "git",
    "url": "https://github.com/...",
    "path": "plugins/skill-name/skills/skill-name",
    "ref": "main",
    "commit": "abc123..."
  },
  "installed": { "at": "2024-01-15T...", "by": "skills-cli@1.0.0" }
}
```

**When you create a skill yourself**, there's no `.provenance.json`. The CLI treats missing provenance as "custom".

The logic is simple:
- Has `.provenance.json` with `type: "git"`? → upstream skill
- Has `.provenance.json` with `type: "custom"`? → custom skill
- No `.provenance.json` at all? → custom skill (default)

Use `skills list --provenance` to see which is which.

## Updating Skills

Skills with `upstream` origin can be updated from their source:

```bash
# Check for updates
skills update --check

# Update with security review
skills update property-based-testing --review

# Update all upstream skills
skills update --all --review
```

Security review assesses risk using differential-review:
- **LOW**: Documentation changes
- **MEDIUM**: New files, import changes
- **HIGH**: Scripts, external calls, permissions (requires `--yes`)

## Packages

This monorepo contains:

| Package | Path | Description |
|---------|------|-------------|
| `@4meta5/skills-cli` | `packages/cli` | CLI for scanning, installing, and managing skills |
| `@4meta5/skills` | `packages/skills` | Core library for loading and parsing skills |
| `@4meta5/chain` | `packages/chain` | Skill chaining system with DAG resolution |
| `web` (private) | `packages/web` | Website for browsing and discovering skills |

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

---

## Skills Library

| Skill | Origin | Category | Description |
|-------|--------|----------|-------------|
| tdd | custom | testing | Test-driven development (RED/GREEN/REFACTOR) |
| suggest-tests | custom | testing | Recommend tests based on git diff |
| unit-test-workflow | custom | testing | Multi-phase test generation |
| property-based-testing | upstream (tob) | testing | Property and invariant testing |
| repo-hygiene | custom | testing | Clean auto-generated test artifacts |
| dogfood-skills | custom | development | Enforces using tools you build |
| no-workarounds | custom | development | Prevents manual workarounds |
| claudeception | upstream (claudeception) | development | Extract learnings into skills |
| typescript-circular-dependency | upstream (claudeception) | development | Detect circular imports |
| skill-maker | custom | development | Create Claude Code skills |
| workflow-orchestrator | custom | workflow | Context detection and skill chaining |
| project-init | custom | workflow | Scaffold new projects |
| doc-maintenance | custom | workflow | Auto-update docs after tasks |
| agent-orchestration | custom | workflow | Coordinate parallel agents |
| research-to-plan | custom | workflow | Convert research to plans |
| gitignore-hygiene | custom | workflow | Maintain gitignore patterns |
| code-review-ts | custom | security | TypeScript review guidelines |
| security-analysis | custom | security | Static security review |
| differential-review | upstream (tob) | security | Security-focused diff analysis |
| code-maturity-assessor | upstream (tob) | security | Trail of Bits maturity framework |
| markdown-writer | custom | documentation | Consistent markdown style |
| blog-writer | custom | documentation | Blog post creation |
| frontend-design | custom | ui | Distinctive UI creation |
| baseline-ui | custom | ui | Opinionated UI baseline |
| web-design-guidelines | custom | ui | Web Interface Guidelines |
| fixing-accessibility | custom | ui | Fix accessibility issues |
| fixing-motion-performance | custom | ui | Fix animation performance |
| svelte-runes | custom | svelte | Svelte 5 runes ($state, $derived, $effect) |
| sveltekit-structure | custom | svelte | File-based routing, layouts |
| sveltekit-data-flow | custom | svelte | Load functions, form actions |
| claude-svelte5-skill | custom | svelte | Comprehensive Svelte 5 reference |
| sveltekit-svelte5-tailwind-skill | custom | svelte | SvelteKit + Svelte 5 + Tailwind v4 |
| imessage-tone | custom | communication | Two-mode iMessage tone (owner vs others) |
| bluebubbles-setup | custom | communication | BlueBubbles iMessage integration setup |

**Origin key:**
- `custom` - Created for this project
- `upstream (tob)` - From [Trail of Bits](https://github.com/trailofbits/skills)
- `upstream (claudeception)` - From [Claudeception](https://github.com/blader/Claudeception)
