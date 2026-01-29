# Skills CLI

Manage Claude Code skills from the command line.

## Install

```bash
./packages/skills-cli/bin/skills.js
```

## What It Does

1. Scans your project, recommends skills
2. Installs skills to `.claude/skills/`
3. Routes prompts to relevant skills
4. Tracks skill usage

## Quick Start

```bash
skills scan         # Get recommendations
skills scan --all   # Install all recommendations
skills list         # See what's installed
skills stats        # Check usage
```

## Documentation

- [DONE.md](./DONE.md) - What's implemented (392 tests passing)
- [RESEARCH.md](./RESEARCH.md) - Architecture research
- [PLAN.md](./PLAN.md) - Roadmap

## Development

```bash
npm run build -w @anthropic/skills-cli
npm test -w @anthropic/skills-cli
```
