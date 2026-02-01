# README Structure Guide

## SOTA Section Ordering (2026)

The recommended order balances user needs with discoverability:

```
1. Title + Tagline
2. Badges (build, version, license)
3. Hero Code Example
4. Table of Contents (if >200 lines)
5. What It Does (value proposition)
6. Quick Start
7. Why/Motivation (optional)
8. Features
9. Installation (detailed)
10. Usage/Examples
11. API Reference (if applicable)
12. Configuration
13. Troubleshooting/FAQ
14. Contributing
15. License
16. Acknowledgments (optional)
```

## Section Details

### Title + Tagline

The title should be the project name. The tagline should:
- Be under 120 characters
- Explain what it does, not how
- Avoid jargon
- Be scannable

**Good**: "A fast, minimal static site generator"
**Bad**: "A Node.js-based SSG using Markdown and YAML frontmatter"

### Table of Contents

Generate automatically or manually. Keep it:
- One level deep (H2 headers only)
- Linked with anchor tags
- Updated when sections change

**Manual example**:
```markdown
## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
```

**Auto-generation** (VS Code extension or CLI):
```bash
npx markdown-toc README.md --no-firsth1
```

### Hero Code Example

The first code block users see. Requirements:
- Works with copy-paste
- Under 5 lines
- Shows the primary use case
- Uses `npx` if possible (no install required)

**Good**:
```bash
npx create-my-app my-project
cd my-project
npm start
```

**Bad** (too many steps, requires global install):
```bash
npm install -g my-cli
my-cli init --template=default --verbose
cd my-project
npm install
npm run build
npm start
```

### What It Does

3-5 bullet points explaining value. Focus on outcomes, not features.

**Good**:
```markdown
## What It Does

- **Scans your project** and recommends relevant skills
- **Installs skills** from curated sources or custom repos
- **Validates skills** for quality and security
- **Syncs CLAUDE.md** to keep skill references current
```

**Bad** (feature-focused, not value-focused):
```markdown
## Features

- Written in TypeScript
- Uses fast-glob for file discovery
- Supports JSON output
- Has a plugin system
```

### Quick Start

Get users running in under 10 minutes. Include:
1. Prerequisites (Node version, etc.)
2. Install command
3. First run command
4. Expected output

### Installation

Detailed installation for different scenarios:
- npm/yarn/pnpm
- Global vs local
- Different platforms
- From source

### Usage/Examples

Show real-world examples with expected output:

```markdown
## Usage

### Basic Example

\`\`\`bash
$ my-cli scan
Scanning project...
Found 3 recommendations:
  - tdd (HIGH confidence)
  - typescript-eslint (MEDIUM confidence)
  - jest-config (LOW confidence)
\`\`\`

### With Options

\`\`\`bash
$ my-cli scan --json
{"recommendations": [...]}
\`\`\`
```

### Configuration

Document all configuration options:
- File locations (`.config/`, `package.json`, etc.)
- Environment variables
- CLI flags that override config
- Default values

### Troubleshooting/FAQ

Common issues and solutions. Format as:

```markdown
## Troubleshooting

### Error: "Module not found"

**Cause**: Missing peer dependency.

**Solution**:
\`\`\`bash
npm install missing-peer
\`\`\`
```

## Using `<details>` Tags

Collapse long sections that aren't critical for first-time users:

```markdown
<details>
<summary>Full API Reference</summary>

| Command | Description |
|---------|-------------|
| scan | Scan for recommendations |
| install | Install a skill |
...

</details>
```

Use for:
- Long tables (over 20 rows)
- Advanced configuration
- Changelog sections
- Detailed API reference

## Length Guidelines

| README Length | Recommendation |
|---------------|----------------|
| Under 100 lines | Single file, no ToC |
| 100-300 lines | Add ToC, consider collapsing |
| 300-500 lines | Collapse long sections, consider splitting |
| Over 500 lines | Split into docs/, link from README |

## When to Split

Move to separate docs when:
- Section is over 200 lines
- Content is reference material (not getting started)
- Multiple audiences need different depths

Keep in README:
- Quick start (always)
- Value proposition (always)
- Basic usage (always)
- Installation (always)
