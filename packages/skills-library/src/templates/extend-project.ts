import type { ProjectTemplate } from '../types.js';

/**
 * Template for extending a project with testing capabilities
 */
export const extendWithTesting: ProjectTemplate = {
  name: 'extend-testing',
  description: 'Add testing skills and configuration to an existing project',
  skills: ['test-first-bugfix'],
  claudemd: `## Testing

This project uses a test-first approach to bug fixing.

### Skills
- @.claude/skills/test-first-bugfix/SKILL.md

### Commands
- \`npm test\` - Run tests
- \`npm run test:watch\` - Run tests in watch mode
`,
  structure: [
    { path: 'tests', type: 'directory', content: '' },
    {
      path: 'tests/.gitkeep',
      type: 'file',
      content: ''
    }
  ]
};

/**
 * Template for extending a project with security review capabilities
 */
export const extendWithSecurity: ProjectTemplate = {
  name: 'extend-security',
  description: 'Add security review skills to an existing project',
  skills: ['security-review'],
  claudemd: `## Security

This project uses security-focused code review practices.

### Skills
- Security review skill for identifying vulnerabilities
`,
  structure: []
};
