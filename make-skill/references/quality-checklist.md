# Skill Quality Checklist

- [ ] Folder name matches frontmatter `name`
- [ ] `name` is lowercase kebab-case
- [ ] `description` includes clear triggers
- [ ] `category` (if present) is one of: `meta|audit|principles|habits|hot`
- [ ] `agents/openai.yaml` default prompt references `$<skill-name>`
- [ ] `node ../hooks/packages/cli/bin/skills.js validate <skill-name>` passes
- [ ] No stale references to renamed skills or removed categories
