import { describe, it, expect } from 'vitest';
import {
  classifyFile,
  classifyWriteIntent,
  classifyEditIntent,
  classifyToolIntent,
  describeIntent,
} from './intent.js';

describe('intent classification', () => {
  describe('classifyFile', () => {
    it('identifies test files', () => {
      expect(classifyFile('src/utils.test.ts')).toBe('test');
      expect(classifyFile('src/utils.spec.ts')).toBe('test');
      expect(classifyFile('tests/utils.ts')).toBe('test');
      expect(classifyFile('__tests__/utils.ts')).toBe('test');
      expect(classifyFile('test_utils.py')).toBe('test');
      expect(classifyFile('utils_test.go')).toBe('test');
      expect(classifyFile('utils_test.rs')).toBe('test');
      expect(classifyFile('Button.stories.tsx')).toBe('test');
    });

    it('identifies documentation files', () => {
      expect(classifyFile('README.md')).toBe('docs');
      expect(classifyFile('CHANGELOG.md')).toBe('docs');
      expect(classifyFile('docs/guide.md')).toBe('docs');
      expect(classifyFile('documentation/api.rst')).toBe('docs');
      expect(classifyFile('LICENSE')).toBe('docs');
      expect(classifyFile('CONTRIBUTING.md')).toBe('docs');
    });

    it('identifies configuration files', () => {
      expect(classifyFile('package.json')).toBe('config');
      expect(classifyFile('tsconfig.json')).toBe('config');
      expect(classifyFile('eslint.config.js')).toBe('config');
      expect(classifyFile('vite.config.ts')).toBe('config');
      expect(classifyFile('.env')).toBe('config');
      expect(classifyFile('config.yaml')).toBe('config');
      expect(classifyFile('Cargo.toml')).toBe('config');
      expect(classifyFile('pyproject.toml')).toBe('config');
      expect(classifyFile('go.mod')).toBe('config');
    });

    it('identifies implementation files', () => {
      expect(classifyFile('src/utils.ts')).toBe('impl');
      expect(classifyFile('src/components/Button.tsx')).toBe('impl');
      expect(classifyFile('lib/main.py')).toBe('impl');
      expect(classifyFile('src/main.rs')).toBe('impl');
      expect(classifyFile('cmd/server/main.go')).toBe('impl');
    });
  });

  describe('classifyWriteIntent', () => {
    it('returns write_test for test files', () => {
      expect(classifyWriteIntent('src/utils.test.ts')).toBe('write_test');
    });

    it('returns write_docs for doc files', () => {
      expect(classifyWriteIntent('README.md')).toBe('write_docs');
    });

    it('returns write_config for config files', () => {
      expect(classifyWriteIntent('package.json')).toBe('write_config');
    });

    it('returns write_impl for implementation files', () => {
      expect(classifyWriteIntent('src/utils.ts')).toBe('write_impl');
    });
  });

  describe('classifyEditIntent', () => {
    it('returns edit_test for test files', () => {
      expect(classifyEditIntent('src/utils.test.ts')).toBe('edit_test');
    });

    it('returns edit_docs for doc files', () => {
      expect(classifyEditIntent('README.md')).toBe('edit_docs');
    });

    it('returns edit_config for config files', () => {
      expect(classifyEditIntent('package.json')).toBe('edit_config');
    });

    it('returns edit_impl for implementation files', () => {
      expect(classifyEditIntent('src/utils.ts')).toBe('edit_impl');
    });
  });

  describe('classifyToolIntent', () => {
    it('classifies write tool', () => {
      expect(classifyToolIntent('write', { file_path: 'src/utils.ts' })).toBe('write_impl');
      expect(classifyToolIntent('write', { file_path: 'src/utils.test.ts' })).toBe('write_test');
      expect(classifyToolIntent('write', { file_path: 'README.md' })).toBe('write_docs');
    });

    it('classifies edit tool', () => {
      expect(classifyToolIntent('edit', { file_path: 'src/utils.ts' })).toBe('edit_impl');
      expect(classifyToolIntent('edit', { file_path: 'src/utils.test.ts' })).toBe('edit_test');
    });

    it('classifies read tool', () => {
      expect(classifyToolIntent('read', {})).toBe('read');
      expect(classifyToolIntent('glob', {})).toBe('read');
      expect(classifyToolIntent('grep', {})).toBe('read');
    });

    it('classifies bash commands', () => {
      expect(classifyToolIntent('bash', { command: 'npm test' })).toBe('run');
      expect(classifyToolIntent('bash', { command: 'git commit -m "test"' })).toBe('commit');
      expect(classifyToolIntent('bash', { command: 'git push origin main' })).toBe('push');
      expect(classifyToolIntent('bash', { command: 'npm run deploy' })).toBe('deploy');
      expect(classifyToolIntent('bash', { command: 'rm -rf node_modules' })).toBe('delete');
    });

    it('classifies git tools', () => {
      expect(classifyToolIntent('git_commit', {})).toBe('commit');
      expect(classifyToolIntent('git_push', {})).toBe('push');
    });

    it('handles unknown tools', () => {
      expect(classifyToolIntent('unknown_tool', {})).toBe('run');
    });

    it('handles missing args', () => {
      expect(classifyToolIntent('write', undefined)).toBe('write_impl');
      expect(classifyToolIntent('bash', {})).toBe('run');
    });
  });

  describe('describeIntent', () => {
    it('describes intents', () => {
      expect(describeIntent('write_test')).toBe('Write test file');
      expect(describeIntent('write_impl')).toBe('Write implementation file');
      expect(describeIntent('commit')).toBe('Commit changes');
      expect(describeIntent('push')).toBe('Push to remote');
    });
  });
});
