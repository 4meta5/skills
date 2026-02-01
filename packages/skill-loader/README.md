# @4meta5/skill-loader

Parse and load SKILL.md files for Claude Code skills.

## Installation

```bash
npm install @4meta5/skill-loader
```

## Usage

### Load a skill from a directory

```typescript
import { loadSkillFromPath } from '@4meta5/skill-loader';

const skill = await loadSkillFromPath('.claude/skills/tdd');

console.log(skill.metadata.name);        // 'tdd'
console.log(skill.metadata.description); // 'Test-driven development workflow'
console.log(skill.content);              // Skill instructions
console.log(skill.supportingFiles);      // ['references/guide.md']
```

### Load all skills from a directory

```typescript
import { loadSkillsFromDirectory } from '@4meta5/skill-loader';

// Load all skills, including nested ones
const skills = await loadSkillsFromDirectory('.claude/skills');

for (const skill of skills) {
  console.log(`${skill.metadata.name}: ${skill.metadata.description}`);
}

// Limit search depth
const shallowSkills = await loadSkillsFromDirectory('skills', { maxDepth: 2 });
```

### Parse SKILL.md content directly

```typescript
import { parseFrontmatter } from '@4meta5/skill-loader';

const content = `---
name: my-skill
description: A helpful skill
category: development
---

# My Skill

Instructions here.
`;

const parsed = parseFrontmatter(content);

console.log(parsed.frontmatter.name);     // 'my-skill'
console.log(parsed.frontmatter.category); // 'development'
console.log(parsed.body);                 // '# My Skill\n\nInstructions here.'
```

### Format skill metadata to SKILL.md

```typescript
import { formatSkillMd } from '@4meta5/skill-loader';

const content = formatSkillMd(
  {
    name: 'my-skill',
    description: 'A helpful skill',
    category: 'development',
    'user-invocable': true
  },
  '# Instructions\n\nDo the thing.'
);

// Returns formatted SKILL.md content
```

### Check if a directory is a skill

```typescript
import { isSkillDirectory } from '@4meta5/skill-loader';

if (await isSkillDirectory('./my-skill')) {
  console.log('Valid skill directory');
}
```

## SKILL.md Format

A valid SKILL.md file has YAML frontmatter followed by markdown content:

```markdown
---
name: skill-name
description: Brief description of what the skill does
category: testing
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Write, Bash
context: inline
agent: my-agent
---

# Skill Name

Skill instructions and content here.
```

### Required Fields

- `name`: Unique identifier (kebab-case)
- `description`: Brief description

### Optional Fields

- `category`: One of `testing`, `development`, `documentation`, `refactoring`, `security`, `performance`
- `user-invocable`: Whether skill can be invoked via `/skill-name`
- `disable-model-invocation`: Prevent automatic loading
- `allowed-tools`: Comma-separated list of allowed tools
- `context`: `fork` or `inline`
- `agent`: Specific agent to use

## Types

```typescript
interface Skill {
  metadata: SkillMetadata;
  content: string;
  path: string;
  supportingFiles?: string[];
}

interface SkillMetadata {
  name: string;
  description: string;
  category?: SkillCategory;
  'disable-model-invocation'?: boolean;
  'user-invocable'?: boolean;
  'allowed-tools'?: string;
  context?: 'fork' | 'inline';
  agent?: string;
}

type SkillCategory =
  | 'testing'
  | 'development'
  | 'documentation'
  | 'refactoring'
  | 'security'
  | 'performance';
```

## License

MIT
