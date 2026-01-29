import type { ProjectTemplate } from '../types.js';

/**
 * Template for a new TypeScript project with standard tooling
 */
export const newTsProject: ProjectTemplate = {
  name: 'typescript-project',
  description: 'A new TypeScript project with testing and linting configured',
  skills: ['test-first-bugfix'],
  claudemd: `# Project

## Development Commands
- \`npm run build\` - Build the project
- \`npm test\` - Run tests
- \`npm run lint\` - Lint code

## Coding Conventions
- Use TypeScript strict mode
- Write tests first (use the test-first-bugfix skill)
- Keep functions small and focused
- Use descriptive variable names
`,
  structure: [
    { path: 'src', type: 'directory', content: '' },
    { path: 'tests', type: 'directory', content: '' },
    {
      path: '.gitignore',
      type: 'file',
      content: `# Dependencies
node_modules/

# Build outputs
dist/
*.js
*.d.ts
*.js.map
!src/**/*.ts

# Test coverage
coverage/

# IDE
.idea/
.vscode/

# OS
.DS_Store

# Logs
*.log
`
    },
    {
      path: 'src/index.ts',
      type: 'file',
      content: `export function main(): void {
  console.log('Hello, world!');
}
`
    },
    {
      path: 'tests/index.test.ts',
      type: 'file',
      content: `import { describe, it, expect } from 'vitest';
import { main } from '../src/index';

describe('main', () => {
  it('should run without error', () => {
    expect(() => main()).not.toThrow();
  });
});
`
    },
    {
      path: 'package.json',
      type: 'file',
      content: JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          build: 'tsc',
          test: 'vitest',
          lint: 'eslint src'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
          eslint: '^8.0.0'
        }
      }, null, 2)
    },
    {
      path: 'tsconfig.json',
      type: 'file',
      content: JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: 'dist',
          declaration: true
        },
        include: ['src']
      }, null, 2)
    }
  ]
};
