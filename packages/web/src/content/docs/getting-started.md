---
title: Getting Started
description: Install the CLI and add your first skill
---

# Getting Started

The Skills CLI helps you discover and install Claude Code skills for your projects.

## Installation

Install the CLI globally:

```bash
npm install -g @4meta5/skills-cli
```

Or use it directly with npx:

```bash
npx @4meta5/skills-cli scan
```

## Your First Scan

Navigate to your project directory and run:

```bash
skills scan
```

This analyzes your project and recommends skills based on your tech stack, dependencies, and existing patterns.

## Installing a Skill

Once you see recommendations, install a skill:

```bash
skills add tdd
```

This creates a `.claude/skills/tdd/` directory in your project with the skill definition.

## Verifying Installation

List installed skills:

```bash
skills list
```

## What Happens Next

Claude Code automatically reads skills from `.claude/skills/` when you start a session. The skill instructions become part of Claude's context, enhancing its capabilities for your specific workflow.

## Next Steps

- [CLI Reference](/docs/cli-reference) - All available commands
- [Skill Format](/docs/skill-format) - How skills are structured
- [Writing Skills](/docs/writing-skills) - Create your own skills
