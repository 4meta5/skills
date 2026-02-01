# @4meta5/skills

TypeScript library for managing Claude Code skills.

## Installation

```bash
npm install @4meta5/skills
```

## Usage

### Create a skills library instance

```typescript
import { createSkillsLibrary } from '@4meta5/skills';

const library = createSkillsLibrary({
  cwd: process.cwd(),  // optional, defaults to process.cwd()
});
```

### Load a skill by name

```typescript
const skill = await library.loadSkill('tdd');

console.log(skill.metadata.name);        // 'tdd'
console.log(skill.metadata.description); // 'Test-driven development workflow'
console.log(skill.content);              // Skill instructions
```

Skills are loaded from these locations (in order):
1. Project: `.claude/skills/<name>/SKILL.md`
2. User: `~/.claude/skills/<name>/SKILL.md`
3. Bundled: Skills included with this package

### List all available skills

```typescript
// List all skills
const skills = await library.listSkills();

for (const skill of skills) {
  console.log(`${skill.metadata.name}: ${skill.metadata.description}`);
}

// Filter by category
const testingSkills = await library.listSkills('testing');
```

### Install a skill

```typescript
const skill = await library.loadSkill('tdd');

// Install to project
await library.installSkill(skill, { location: 'project' });

// Install to user directory
await library.installSkill(skill, { location: 'user' });
```

### Create a new project with skills

```typescript
import { createSkillsLibrary, newTsProject } from '@4meta5/skills';

const library = createSkillsLibrary();

await library.createProject(newTsProject, './my-new-project');
```

This creates:
- CLAUDE.md with skill references
- README.md
- .gitignore
- .claude/skills/ directory with installed skills

### Extend an existing project

```typescript
await library.extendProject(['tdd', 'security-analysis']);
```

This installs the specified skills and updates CLAUDE.md to reference them.

## Bundled Skills

Access bundled skills directly without loading from disk:

```typescript
import {
  tdd,
  unitTestWorkflow,
  suggestTests,
  noWorkarounds,
  codeReview,
  securityAnalysis,
  getBundledSkill,
  listBundledSkillNames
} from '@4meta5/skills';

// Get a specific bundled skill
const skill = tdd;

// Get by name
const skill = getBundledSkill('tdd');

// List all bundled skill names
const names = listBundledSkillNames();
// ['tdd', 'unit-test-workflow', 'suggest-tests', ...]
```

## Project Templates

Pre-configured templates for common project types:

```typescript
import { newTsProject, extendWithTesting, extendWithSecurity } from '@4meta5/skills';

// Create a TypeScript project
await library.createProject(newTsProject, './my-project');

// Extend with testing skills
await library.createProject(extendWithTesting, './my-project');

// Extend with security skills
await library.createProject(extendWithSecurity, './my-project');
```

## Categories

Filter and organize skills by category:

```typescript
import type { SkillCategory } from '@4meta5/skills';

const categories: SkillCategory[] = [
  'testing',
  'development',
  'documentation',
  'refactoring',
  'security',
  'performance'
];
```

## Re-exports from @4meta5/skill-loader

For backwards compatibility, this package re-exports functions from `@4meta5/skill-loader`:

```typescript
import {
  loadSkillFromPath,
  loadSkillsFromDirectory,
  parseFrontmatter,
  discoverSupportingFiles
} from '@4meta5/skills';
```

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

interface InstallOptions {
  location: 'project' | 'user';
  cwd?: string;
}

interface SkillsLibraryOptions {
  cwd?: string;
  skillsDir?: string;
}

interface SkillsLibrary {
  loadSkill(name: string): Promise<Skill>;
  listSkills(category?: SkillCategory): Promise<Skill[]>;
  installSkill(skill: Skill, options: InstallOptions): Promise<void>;
  createProject(template: ProjectTemplate, targetPath: string): Promise<void>;
  extendProject(skills: string[]): Promise<void>;
}
```

## License

MIT
