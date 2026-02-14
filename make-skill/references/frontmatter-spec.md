# Frontmatter Specification

## Required

- `name`: kebab-case, unique in repository
- `description`: clear trigger-oriented description

## Optional

- `category`: one of `meta|audit|principles|habits|hot`
- `user-invocable`: boolean
- `disable-model-invocation`: boolean
- `allowed-tools`: comma-separated tool list
- `context`: `fork|inline`
- `agent`: string

## Rule

Only the five canonical categories are supported.
