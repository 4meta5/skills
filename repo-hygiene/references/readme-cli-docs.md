# CLI Documentation Patterns

## Essential CLI Documentation

Every CLI tool README should document:

1. **Installation** (global and local)
2. **Basic usage** with examples
3. **All commands** with descriptions
4. **Common flags** (`--help`, `--version`, `--json`)
5. **Exit codes** (for scripting)
6. **Environment variables**

## --help Output

Document the `--help` output directly or reference it:

```markdown
## Usage

\`\`\`
$ my-cli --help

Usage: my-cli [command] [options]

Commands:
  scan      Scan for recommendations
  install   Install a skill
  list      List installed skills

Options:
  -h, --help     Show help
  -v, --version  Show version
  --json         Output as JSON
  --no-color     Disable colors
\`\`\`
```

## Command Tables

For CLIs with many commands, use tables:

```markdown
## Commands

| Command | Description | Example |
|---------|-------------|---------|
| `scan` | Scan project for recommendations | `my-cli scan` |
| `install <name>` | Install a skill by name | `my-cli install tdd` |
| `list` | List all installed skills | `my-cli list --json` |
| `validate` | Validate skill quality | `my-cli validate ./skill` |
```

## Flag Documentation

Document flags with their short forms, types, and defaults:

```markdown
## Options

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--json` | `-j` | boolean | false | Output as JSON |
| `--verbose` | `-v` | boolean | false | Verbose output |
| `--config` | `-c` | string | `.config` | Config file path |
| `--limit` | `-l` | number | 10 | Max results |
```

## Machine-Readable Output

Document JSON output for scripting:

```markdown
## JSON Output

Use `--json` for machine-readable output:

\`\`\`bash
$ my-cli scan --json
{
  "recommendations": [
    {
      "name": "tdd",
      "confidence": "HIGH",
      "reason": "Test files detected"
    }
  ]
}
\`\`\`

### JSON Schema

| Field | Type | Description |
|-------|------|-------------|
| `recommendations` | array | List of recommended skills |
| `recommendations[].name` | string | Skill name |
| `recommendations[].confidence` | string | HIGH, MEDIUM, or LOW |
```

## Exit Codes

Document exit codes for scripting:

```markdown
## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | File not found |
| 4 | Permission denied |
```

## Environment Variables

Document all environment variables:

```markdown
## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MY_CLI_CONFIG` | Config file path | `.config` |
| `MY_CLI_DEBUG` | Enable debug mode | `false` |
| `NO_COLOR` | Disable colored output | (not set) |
```

## NO_COLOR Support

Document [NO_COLOR](https://no-color.org/) support:

```markdown
## Disabling Colors

This CLI respects the [NO_COLOR](https://no-color.org/) standard:

\`\`\`bash
NO_COLOR=1 my-cli scan
\`\`\`

Or use the `--no-color` flag:

\`\`\`bash
my-cli scan --no-color
\`\`\`
```

## GIF Demos

GIF demos are highly effective for CLIs. Create them with:

- [asciinema](https://asciinema.org/) (terminal recording)
- [terminalizer](https://terminalizer.com/) (GIF export)
- [vhs](https://github.com/charmbracelet/vhs) (scripted recordings)

**Placement**:
- Hero demo: After badges, before "What It Does"
- Command demos: In each command's documentation section

**Best practices**:
- Keep under 30 seconds
- Show real output (not mock)
- Use a clean terminal (no prompt clutter)
- Pause on important output

## Example-Driven Documentation

Show examples with expected output:

```markdown
### Scanning a Project

\`\`\`bash
$ cd my-project
$ my-cli scan

Scanning...
Found 3 recommendations:

  HIGH   tdd           Test files detected
  MEDIUM typescript    tsconfig.json found
  LOW    prettier      No formatter config

Install all with: my-cli scan --all
\`\`\`
```

## Subcommand Help

For CLIs with subcommands, document each:

```markdown
### my-cli scan

Scan the current project for skill recommendations.

\`\`\`
Usage: my-cli scan [options]

Options:
  --all         Install all recommendations
  --min <level> Minimum confidence (HIGH, MEDIUM, LOW)
  --json        Output as JSON
\`\`\`

**Examples**:

\`\`\`bash
# Basic scan
my-cli scan

# Install all high-confidence recommendations
my-cli scan --all --min HIGH

# Get JSON for scripting
my-cli scan --json | jq '.recommendations[].name'
\`\`\`
```

## Piping and Scripting

Show how to use with pipes:

```markdown
## Scripting

### With jq

\`\`\`bash
# Get skill names
my-cli list --json | jq -r '.[].name'

# Count skills by category
my-cli list --json | jq 'group_by(.category) | map({category: .[0].category, count: length})'
\`\`\`

### With xargs

\`\`\`bash
# Install multiple skills
echo "tdd typescript prettier" | xargs -n1 my-cli install
\`\`\`
```

## Version Information

Document how to check versions:

```markdown
## Version

\`\`\`bash
$ my-cli --version
my-cli v1.2.3
\`\`\`

Or check programmatically:

\`\`\`bash
$ my-cli --version --json
{"version": "1.2.3", "node": "18.0.0"}
\`\`\`
```
