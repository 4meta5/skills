---
name: skill-maker
description: |
  Create and validate Claude Code skills following this repository's existing conventions.
  Use when: (1) adding a new skill to this repo, (2) turning concrete learnings into a
  reusable skill, (3) validating an existing skill for quality and correctness.
  This skill focuses on correct structure, minimal scope, and adherence to repo standards.
category: development
user-invocable: true
---

# Skill Maker

Create and validate Claude Code skills without expanding scope or inventing new conventions.

This skill is for adding a skill cleanly and correctly to this repository. It is not a mandate to redesign the skills system, research external best practices, or refactor unrelated parts of the repo.

## Core Principles

- Follow existing repo conventions exactly.
- Prefer the simplest valid skill structure.
- Do not add files, metadata, or tooling unless required.
- Treat validation failures as the source of truth.
- If something is unclear, ask or note it; do not guess.

## When to Use This Skill

Use skill-maker when you are:
- Adding a new skill under skills/<skill-name>/
- Converting a specific, proven workflow into a reusable skill
- Validating an existing skill for quality and correctness
- Fixing validation or quality issues in a skill

Do not use skill-maker to:
- Perform web research or add citations
- Redesign the skills framework
- Add new global documentation or tooling
- Refactor unrelated skills or folders
- Improve conventions beyond what the repo already enforces

## Quick Start (Minimal Path)

1. Choose the simplest template that works (default: simple).
2. Create directory: skills/<skill-name>/
3. Write SKILL.md with valid frontmatter and actionable content.
4. Add references/ only if necessary.
5. Run: skills validate <skill-name>
6. Fix only what validation flags.

## Templates

| Template | Structure | Use Case |
|----------|-----------|----------|
| simple | SKILL.md only | Most skills |
| with-references | SKILL.md + references/ | Multiple artifacts or longer guidance |
| full | + docs/, templates/, provenance | Rare; only when clearly justified |

Default to simple. Escalate only with a clear reason.

## Frontmatter Specification

Every skill must include YAML frontmatter.

### Required fields

```yaml
---
name: skill-name          # kebab-case, unique identifier
description: |            # Multi-line strongly recommended
  What the skill does.
  Use when: (1) condition, (2) condition.
---
```

### Optional fields (use sparingly)

```yaml
category: testing|development|documentation|refactoring|security|performance
user-invocable: true
disable-model-invocation: false
allowed-tools: Read,Write
context: fork|inline
agent: agent-name
```

If a field is not clearly needed, omit it.

Authoritative spec: references/frontmatter-spec.md

## Description Quality (Critical)

The description drives discovery and correct usage. It must be concrete.

Include:

1. What it does (plain language)
2. When to use it (explicit trigger conditions)
3. What context it applies to (files, errors, tools, frameworks)

Good example:

```yaml
description: |
  Fix ENOENT errors in npm monorepos caused by incorrect working directories.
  Use when: (1) npm run fails with ENOENT, (2) commands work at repo root
  but fail in packages, (3) symlinked paths break resolution.
  Applies to npm workspaces, Lerna, and Turborepo.
```

Bad example:

```yaml
description: A skill that helps with npm issues.
```

If the description is vague, the skill is not ready.

## Quality Checklist (Required)

Before considering a skill complete:

- [ ] Name is kebab-case and specific
- [ ] Description is clear and > 50 characters
- [ ] Description includes explicit trigger conditions
- [ ] Category is valid (if present)
- [ ] All referenced files exist
- [ ] No placeholder or filler content
- [ ] Guidance is actionable, not abstract
- [ ] skills validate <skill-name> passes

Details: references/quality-checklist.md

## Validation

Always validate locally.

```bash
# Validate specific skill
skills validate <skill-name>

# Validate all skills in project
skills validate

# JSON output
skills validate --json
```

Validation typically enforces:

- Frontmatter correctness
- Description quality
- Category validity
- Slop/placeholder detection
- Reference file integrity

Do not bypass validation.

## Slop Detection (Non-Negotiable)

The validator flags common failure modes:

| Pattern | Example | Required Action |
|---------|---------|-----------------|
| Test names | test-skill-12345 | Rename |
| Placeholder text | TODO improve later | Rewrite |
| Generic titles | # Test Skill | Replace |
| Lorem ipsum | Any | Delete |

If flagged, fix it. Do not argue with the validator.

## Directory Structure (Canonical)

All skills live in skills/:

```
skills/<skill-name>/
├── SKILL.md              # Required
├── references/           # Optional
├── templates/            # Optional
├── scripts/              # Optional
└── .provenance.json      # Optional
```

Do not place skills directly in packages/skills/skills/ (generated output).

## Skill Chaining (Informational)

This skill pairs well with:

- model-router (when a skill needs explicit task-class routing guidance; keep it short and avoid provider pricing tables)
- tdd (when adding validation logic)
- claudeception (extracting learnings into skills)
- dogfood-skills (self-validation)

Chaining is optional. Keep each skill usable on its own.

## Anti-Patterns (Scope Creep)

Do not do these when creating a skill:

- Adding new scripts or tooling to make it easier
- Adding new global docs or repo-wide guidelines
- Refactoring other skills while you're there
- Turning a simple skill into a framework
- Researching external standards and retrofitting the repo to match
- Adding extra files by default (references/, docs/, templates/) without need

If you believe additional changes are necessary:

- Do not implement them during skill creation.
- Write a short note listing what and why.

## Final Guidance

- Start small.
- Add only what is necessary.
- Delete anything you can justify deleting.
- If unsure, write a note instead of code.
- A boring, correct skill is better than a clever one.
