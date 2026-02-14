---
name: install-skill
description: |
  Install skills from ../skills into a target project via local ../hooks CLI,
  including pre-publish local-path workflows after make-skill changes.
  Use when: (1) a new or renamed skill was added in ../skills, (2) hooks packages
  changed locally and are not published yet, (3) you need deterministic installation
  into .claude/skills with CLAUDE.md sync and no stale npm dependency assumptions.
category: meta
user-invocable: true
---

# Install Skill

Install skills using local repos (`../skills` + `../hooks`) first. Do not require npm publish.

## Primary Flow

1. Ensure target skill exists under `../skills/<skill-name>/SKILL.md`.
2. If hooks contracts changed, rebuild local packages:
```bash
cd ../hooks
npm run build -w @4meta5/skill-loader
npm run build -w @4meta5/skills
npm run build -w @4meta5/skills-cli
```
3. Install into target project from local source:
```bash
cd ../skills
node ../hooks/packages/cli/bin/skills.js add <skill-name> --cwd /absolute/path/to/project
```
4. Validate install in target project:
- `.claude/skills/<skill-name>/SKILL.md` exists
- `CLAUDE.md` contains `- @.claude/skills/<skill-name>/SKILL.md`

## Hard-Cut Rename Install

If skill names were renamed, do not keep aliases.
1. Install new name.
2. Remove old name from project:
```bash
cd ../skills
node ../hooks/packages/cli/bin/skills.js remove <old-skill-name> --cwd /absolute/path/to/project
```
3. Run `node ../hooks/packages/cli/bin/skills.js claudemd sync --cwd /absolute/path/to/project`.

## Auto-Maintenance

After any incident, update this skill and `../make-skill` with:
1. Symptom
2. Root cause
3. Detection command
4. Minimal fix command

When invoked, always prefer local-path installation before recommending npm-published binaries.
