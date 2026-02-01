# @4meta5/skills-cli

CLI for discovering, installing, and managing Claude Code skills.

## Installation

```bash
npm install -g @4meta5/skills-cli
```

## Quick Start

```bash
# Scan your project for recommended skills
skills scan

# Install all high-confidence recommendations
skills scan --all

# List installed skills
skills list

# Add a specific skill
skills add tdd

# Show skill details
skills show tdd
```

## Commands

| Command | Description |
|---------|-------------|
| `scan` | Analyze project and recommend skills |
| `scan --all` | Install all HIGH confidence recommendations |
| `scan --show-alternatives` | Show all matches, not just top per category |
| `add <name>` | Install a skill by name |
| `add <name> from <source>` | Install from a specific source |
| `list` | List installed skills |
| `list --custom` | List only custom skills (your own) |
| `list --upstream` | List only upstream skills (from sources) |
| `list --provenance` | Show provenance type for each skill |
| `show <name>` | Display skill details |
| `remove <name>` | Uninstall a skill |
| `validate` | Validate skill files in the project |
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
| `evaluate <prompt>` | Test skill routing for a prompt |
| `embed` | Generate skill embeddings |
| `source list` | List configured skill sources |
| `source add <url>` | Add a skill repository |
| `stats` | Show usage analytics |
| `init` | Initialize skills in current project |

## Skill Scanning

The CLI analyzes your project to recommend relevant skills:

```bash
skills scan
```

Output:
```
HIGH   tdd                    Testing workflow enforcement
HIGH   typescript-strict      TypeScript best practices
MEDIUM security-analysis      Security review for PRs
LOW    aws-cdk                AWS CDK patterns
```

Confidence levels:
- **HIGH**: Strong match based on tech stack and file patterns
- **MEDIUM**: Partial match, likely useful
- **LOW**: Weak match, may not be relevant

## Provenance Tracking

Skills track where they came from:

```bash
# See which skills are yours vs upstream
skills list --provenance

# List only skills you created
skills list --custom

# List only skills from external sources
skills list --upstream
```

## Hooks

Hooks make skills activate automatically. Install them once:

```bash
# See available hooks
skills hook available

# Install hooks
skills hook add skill-forced-eval semantic-router usage-tracker

# Check what's installed
skills hook list
```

Available hooks:

| Hook | Purpose |
|------|---------|
| `skill-forced-eval` | Forces Claude to evaluate and activate relevant skills |
| `semantic-router` | Matches prompts to skills using embeddings |
| `usage-tracker` | Logs skill activations to `~/.claude/usage.jsonl` |

## Skill Sources

Add external skill repositories:

```bash
# Add a source
skills source add https://github.com/user/skills-repo

# List configured sources
skills source list

# Install from a specific source
skills add my-skill from my-source
```

## Updating Skills

Keep upstream skills current:

```bash
# Check for available updates
skills update --check

# Update a specific skill
skills update tdd

# Update all upstream skills
skills update --all

# Update with security review
skills update tdd --review
```

## Hygiene

Clean auto-generated test artifacts:

```bash
# Scan for test-skill-* directories and slop
skills hygiene scan

# Include package subdirectories
skills hygiene scan -r

# Delete detected slop
skills hygiene clean --confirm
```

## CLAUDE.md Sync

Keep your CLAUDE.md in sync with installed skills:

```bash
# Sync references to match installed skills
skills claudemd sync
```

## Configuration

The CLI uses these directories:

| Location | Purpose |
|----------|---------|
| `.claude/skills/` | Project-level skills |
| `~/.claude/skills/` | User-level skills |
| `~/.claude/usage.jsonl` | Usage tracking data |

## Semantic Routing

Skills activate based on prompt similarity. The router combines:

- **Keyword matching** (30% weight): Fast regex patterns
- **Embedding similarity** (70% weight): Semantic understanding

Activation modes:
- **IMMEDIATE** (>0.85): Force activation via MUST_CALL
- **SUGGESTION** (0.70-0.85): Recommend via CONSIDER_CALLING
- **CHAT** (<0.70): No activation

## Integration

This CLI integrates with these packages:

- `@4meta5/skills` - Core library for skill management
- `@4meta5/skill-loader` - SKILL.md parsing
- `@4meta5/project-detector` - Tech stack detection
- `@4meta5/semantic-matcher` - Prompt-to-skill matching
- `@4meta5/workflow-enforcer` - TDD and workflow enforcement
- `@4meta5/chain` - Skill chaining and DAG resolution

## License

MIT
