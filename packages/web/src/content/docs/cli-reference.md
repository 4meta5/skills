---
title: CLI Reference
description: All commands with examples
---

# CLI Reference

Complete reference for all Skills CLI commands.

## Global Options

```bash
skills --help     # Show help
skills --version  # Show version
```

## Commands

### scan

Analyze your project and recommend skills.

```bash
skills scan                    # Scan current directory
skills scan --show-alternatives # Show all matches, not just top per category
skills scan --all              # Install all high-confidence recommendations
```

### add

Add skills to your project.

```bash
skills add tdd                           # Add by name
skills add tdd security-analysis         # Add multiple skills
skills add --git https://github.com/user/repo  # Add from git URL
skills add --user tdd                    # Install to ~/.claude/skills
```

### remove

Remove skills from your project.

```bash
skills remove tdd              # Remove a skill
skills remove tdd code-review  # Remove multiple skills
```

### list

List available and installed skills.

```bash
skills list                    # List installed skills
skills list --remote           # List skills from configured sources
```

### show

Display skill details.

```bash
skills show tdd                # Show skill metadata and description
```

### source

Manage skill sources (remote repositories).

```bash
skills source list                              # List configured sources
skills source add https://github.com/user/repo  # Add a source
skills source add https://github.com/user/repo --name my-source  # Add with custom name
skills source remove my-source                  # Remove a source
```

### update

Update skills from their sources.

```bash
skills update                  # Update all skills
skills update tdd              # Update specific skill
```

### init

Initialize a new project with skills.

```bash
skills init                    # Initialize in current directory
skills init my-project         # Initialize in new directory
```

### defaults

Manage default skills installed in new projects.

```bash
skills defaults list           # List default skills
skills defaults add tdd        # Add to defaults
skills defaults remove tdd     # Remove from defaults
```

## Examples

### Typical Workflow

```bash
# 1. Scan your project
skills scan

# 2. Review recommendations and install
skills add tdd code-review-ts

# 3. Verify installation
skills list

# 4. Start using Claude Code - skills are automatically loaded
```

### Adding Skills from GitHub

```bash
# Add a source
skills source add https://github.com/spences10/svelte-skills-kit

# List available skills
skills list --remote

# Install from the source
skills add svelte-runes
```
