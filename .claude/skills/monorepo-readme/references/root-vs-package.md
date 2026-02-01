# Root vs Package README Responsibilities

## Principle: No Duplication

Each piece of information should live in exactly one place:
- Root README links to package READMEs for details
- Package READMEs link to root for project-wide information

## Root README Responsibilities

### Must Include

1. **Project Overview**
   - What the monorepo contains
   - Why packages are together
   - Target audience

2. **Package Table**
   - All packages with descriptions
   - Links to package directories
   - npm badges (if published)

3. **Architecture**
   - How packages relate
   - Dependency direction
   - Mermaid diagram

4. **Development Setup**
   - Prerequisites
   - Install command
   - Build command
   - Test command

5. **Workspace Commands**
   - How to work with specific packages
   - Common development tasks

### Should Include

1. **Publishing Workflow**
   - How to release
   - Version strategy (fixed vs independent)
   - CI/CD overview

2. **Contributing**
   - Link to CONTRIBUTING.md
   - Code of conduct
   - Where to report issues

3. **License**
   - Project-wide license
   - Note if packages have different licenses

### Should Not Include

- Detailed API documentation for any single package
- Package-specific installation from npm
- Package-specific troubleshooting

## Package README Responsibilities

### Must Include

1. **Package Description**
   - What this specific package does
   - When to use it

2. **Installation**
   ```markdown
   ## Installation

   \`\`\`bash
   npm install @scope/package-name
   \`\`\`
   ```

3. **Basic Usage**
   - Import statement
   - Simple example
   - Expected output

4. **Link to Root**
   ```markdown
   > Part of the [project-name](../../README.md) monorepo.
   ```

### Should Include

1. **API Reference**
   - Functions and their signatures
   - Configuration options
   - Return types

2. **Examples**
   - Common use cases
   - Integration examples

3. **Package-Specific Config**
   - Options unique to this package
   - Environment variables

### Should Not Include

- How to set up the monorepo for development
- How to contribute to the project
- Information about other packages

## Linking Strategy

### From Root to Packages

```markdown
## Packages

| Package | Description |
|---------|-------------|
| [`@scope/cli`](./packages/cli) | Command-line interface |
| [`@scope/lib`](./packages/lib) | Core library |

For detailed documentation, see each package's README.
```

### From Package to Root

```markdown
# @scope/cli

> Part of the [Project Name](../../README.md) monorepo.

## Installation
...

## Development

See the [root README](../../README.md#development) for development setup.
```

## Common Mistakes

### Duplicating Information

**Wrong**: Same installation instructions in root and package README

**Right**: Root shows `npm install` for development, package shows `npm install @scope/pkg` for users

### Missing Cross-Links

**Wrong**: Package README has no link to root

**Right**: Package README starts with link to monorepo context

### Outdated Package List

**Wrong**: Root README package table doesn't match actual packages

**Right**: CI check verifies package table matches `packages/` directory

### Inconsistent Depth

**Wrong**: Some packages have detailed docs, others have one line

**Right**: All packages follow same README template

## Package README Template

```markdown
# @scope/package-name

> Part of the [Project Name](../../README.md) monorepo.

Brief description of what this package does.

## Installation

\`\`\`bash
npm install @scope/package-name
\`\`\`

## Usage

\`\`\`typescript
import { something } from '@scope/package-name';

// Example usage
\`\`\`

## API

### `functionName(options)`

Description of the function.

**Parameters:**
- `options.param1` (string): Description

**Returns:** Description of return value

## License

[MIT](../../LICENSE)
```

## Internal vs Published Packages

### Published Packages

- Full npm installation instructions
- npm badge in root table
- Version compatibility notes

### Internal Packages

- Mark as "(internal)" in package table
- Document how to import within monorepo
- Note that it's not published
