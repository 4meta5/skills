# Skills

17 curated agentic skills organized into five permanent categories.

## Categories

### meta
- [make-skill](./make-skill/SKILL.md)
- [install-skill](./install-skill/SKILL.md)

### audit
- [code-review-rust](./code-review-rust/SKILL.md)
- [code-review-ts](./code-review-ts/SKILL.md)
- [diff-review](./diff-review/SKILL.md)
- [function-analyzer](./function-analyzer/SKILL.md)
- [semantic-grep](./semantic-grep/SKILL.md)
- [spec-checker](./spec-checker/SKILL.md)

### principles
- [tdd](./tdd/SKILL.md)
- [refactor-suggestions](./refactor-suggestions/SKILL.md)
- [dogfood](./dogfood/SKILL.md)
- [model-router](./model-router/SKILL.md)
- [rick-rubin](./rick-rubin/SKILL.md)

### habits
- [compound-workflow](./compound-workflow/SKILL.md)
- [repo-hygiene](./repo-hygiene/SKILL.md)
- [paul-graham](./paul-graham/SKILL.md)

### hot
- [svelte5-cloudflare](./svelte5-cloudflare/SKILL.md)

## Quick Start

```bash
cp -r <skill-name> /path/to/project/.claude/skills/
```

Or install with local hooks CLI:

```bash
cd ../skills
node ../hooks/packages/cli/bin/skills.js add <skill-name> --cwd /path/to/project
```
