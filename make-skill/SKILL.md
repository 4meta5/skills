---
name: make-skill
description: |
  Create and validate new skills in this repository using the canonical taxonomy.
  Use when: (1) adding a new skill, (2) renaming or recategorizing a skill,
  (3) updating skill metadata/docs to match hooks validation contracts.
category: meta
user-invocable: true
---

# Make Skill

Create or update skills with strict consistency across `../skills` and `../hooks`.

## Canonical Taxonomy (Hard-Cut)

Only these categories are valid and supported:
- `meta`
- `audit`
- `principles`
- `habits`
- `hot`

Do not introduce any additional categories.

## Naming Rules

- Skill folder name must match frontmatter `name`.
- Use lowercase kebab-case.
- Renames are hard-cut (no aliases unless explicitly requested).

## Minimal Workflow

1. Create/update `skills/<skill-name>/SKILL.md`.
2. Set frontmatter fields: `name`, `description`, optional `category`, optional `user-invocable`.
3. Add/update `agents/openai.yaml` so `default_prompt` references `$<skill-name>`.
4. Validate with local hooks CLI:
```bash
cd ../skills
node ../hooks/packages/cli/bin/skills.js validate <skill-name>
```

## Cross-Repo Contract (Required)

If you change naming/category rules, update all of:
1. `../hooks/packages/skill-loader/src/types.ts`
2. `../hooks/packages/skills/src/types.ts`
3. `../hooks/packages/cli/src/detector/types.ts`
4. Related docs in `../hooks/packages/*/README.md`

Then rebuild local hooks packages:
```bash
cd ../hooks
npm run build -w @4meta5/skill-loader
npm run build -w @4meta5/skills
npm run build -w @4meta5/skills-cli
```

## Handoff to Install Skill

After creation, use `$install-skill` flow to install into a target project via local paths, not npm publish.

## Auto-Maintenance

Whenever an install/validation incident happens, update this skill with:
1. Symptom
2. Root cause
3. Detection command
4. Minimal fix
