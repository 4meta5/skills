# @4meta5/project-detector

Detect project technology stack including languages, frameworks, databases, testing tools, and deployment targets.

## Installation

```bash
npm install @4meta5/project-detector
```

## Usage

### Analyze a project

```typescript
import { analyzeProject, getAllTags } from '@4meta5/project-detector';

const analysis = await analyzeProject('./my-project');

console.log('Languages:', analysis.languages.map(l => l.name));
// ['TypeScript']

console.log('Frameworks:', analysis.frameworks.map(f => f.name));
// ['SvelteKit 2', 'Svelte 5']

console.log('Testing:', analysis.testing.map(t => t.name));
// ['Vitest', 'Playwright']

console.log('Databases:', analysis.databases.map(d => d.name));
// ['Drizzle ORM', 'PostgreSQL']

console.log('Deployment:', analysis.deployment.map(d => d.name));
// ['Cloudflare Workers']

console.log('All tags:', getAllTags(analysis));
// ['typescript', 'svelte', 'sveltekit', 'vitest', 'drizzle', ...]
```

### With options

```typescript
const analysis = await analyzeProject('./my-project', {
  skipWorkspaces: true,    // Don't scan monorepo workspaces
  skipEnvFiles: true,      // Don't read .env files
  skipSkillDetection: true // Don't scan for installed skills
});
```

### Get all technologies

```typescript
import { getAllTechnologies } from '@4meta5/project-detector';

const all = getAllTechnologies(analysis);
// Flat list of all detected technologies
```

### Use individual detectors

```typescript
import {
  detectLanguages,
  detectFrameworks,
  detectTesting,
  detectDatabases,
  detectDeployment,
  createDetectionContext
} from '@4meta5/project-detector';

// Create context manually
const ctx = await createDetectionContext('./my-project');

// Run individual detectors
const languages = await detectLanguages(ctx);
const frameworks = await detectFrameworks(ctx);
```

## Detection Coverage

### Languages
- TypeScript (from package.json or tsconfig.json)
- JavaScript (from package.json)
- Rust (from Cargo.toml)
- Python (from pyproject.toml, requirements.txt, setup.py)
- Go (from go.mod)

### Frameworks
- React, React 18+
- Next.js 13+, Next.js 14+
- Svelte, Svelte 5
- SvelteKit, SvelteKit 2
- Vue 3, Nuxt 3
- Angular
- Express, Fastify, Hono
- Astro, Remix

### Testing
- Vitest, Jest, Mocha
- Playwright, Cypress
- Testing Library (React/Svelte/Vue)
- Storybook
- Cargo Test, proptest, quickcheck (Rust)
- Pytest (Python)
- Go Test

### Databases
- PostgreSQL, Neon Postgres
- MySQL, PlanetScale
- SQLite, Turso
- MongoDB
- Redis, Upstash Redis
- Supabase
- ORMs: Drizzle, Prisma, Kysely, TypeORM, Sequelize, Mongoose
- SQLx (Rust)

### Deployment
- Cloudflare Workers, D1, R2
- AWS Lambda, CDK, SAM
- Vercel
- Netlify
- Docker, Kubernetes

## Types

```typescript
interface ProjectAnalysis {
  languages: DetectedTechnology[];
  frameworks: DetectedTechnology[];
  deployment: DetectedTechnology[];
  testing: DetectedTechnology[];
  databases: DetectedTechnology[];
  existingSkills: string[];
  projectPath: string;
  workspaces?: string[];
}

interface DetectedTechnology {
  name: string;
  category: TechnologyCategory;
  confidence: 'high' | 'medium' | 'low';
  version?: string;
  evidence: string;
  tags: string[];
}

type TechnologyCategory =
  | 'language'
  | 'framework'
  | 'deployment'
  | 'testing'
  | 'database';
```

## Workspace Support

The detector automatically scans monorepo workspaces:
- npm/yarn workspaces (from package.json)
- pnpm workspaces (from pnpm-workspace.yaml)
- Lerna (from lerna.json)
- Common subdirectories (backend, api, server, etc.)

## License

MIT
