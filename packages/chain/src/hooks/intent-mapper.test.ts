import { describe, it, expect } from 'vitest';
import {
  extractBashIntents,
  mapToolToIntents,
  findBlockedIntents,
  classifyFilePath,
  getPathAwareIntent,
} from './intent-mapper.js';

describe('extractBashIntents', () => {
  it('detects git commit', () => {
    expect(extractBashIntents('git commit -m "message"')).toContain('commit');
  });

  it('detects git add && git commit', () => {
    const intents = extractBashIntents('git add . && git commit -m "message"');
    expect(intents).toContain('commit');
  });

  it('detects git push', () => {
    expect(extractBashIntents('git push origin main')).toContain('push');
  });

  it('detects npm publish', () => {
    expect(extractBashIntents('npm publish')).toContain('deploy');
  });

  it('detects yarn publish', () => {
    expect(extractBashIntents('yarn publish')).toContain('deploy');
  });

  it('detects pnpm publish', () => {
    expect(extractBashIntents('pnpm publish')).toContain('deploy');
  });

  it('detects deploy command', () => {
    expect(extractBashIntents('vercel deploy --prod')).toContain('deploy');
  });

  it('detects rm -rf', () => {
    expect(extractBashIntents('rm -rf node_modules')).toContain('delete');
  });

  it('detects rm -r', () => {
    expect(extractBashIntents('rm -r dist')).toContain('delete');
  });

  it('detects git branch -D', () => {
    expect(extractBashIntents('git branch -D feature')).toContain('delete');
  });

  it('detects git push --delete', () => {
    expect(extractBashIntents('git push origin --delete feature')).toContain('delete');
  });

  it('detects echo redirect', () => {
    expect(extractBashIntents('echo "content" > file.txt')).toContain('write');
  });

  it('detects cat redirect', () => {
    expect(extractBashIntents('cat template.txt > output.txt')).toContain('write');
  });

  it('detects tee', () => {
    expect(extractBashIntents('echo "content" | tee file.txt')).toContain('write');
  });

  it('detects mkdir', () => {
    expect(extractBashIntents('mkdir -p src/components')).toContain('write');
  });

  it('detects touch', () => {
    expect(extractBashIntents('touch new-file.ts')).toContain('write');
  });

  it('returns empty array for read-only commands', () => {
    expect(extractBashIntents('cat file.txt')).toEqual([]);
    expect(extractBashIntents('ls -la')).toEqual([]);
    expect(extractBashIntents('git status')).toEqual([]);
  });

  it('detects multiple intents', () => {
    const intents = extractBashIntents('git add . && git commit -m "msg" && git push');
    expect(intents).toContain('commit');
    expect(intents).toContain('push');
  });
});

describe('mapToolToIntents', () => {
  it('maps Write tool to write intent', () => {
    expect(mapToolToIntents({ tool: 'Write' })).toEqual(['write']);
  });

  it('maps Edit tool to write intent', () => {
    expect(mapToolToIntents({ tool: 'Edit' })).toEqual(['write']);
  });

  it('maps NotebookEdit tool to write intent', () => {
    expect(mapToolToIntents({ tool: 'NotebookEdit' })).toEqual(['write']);
  });

  it('maps Read tool to no intents', () => {
    expect(mapToolToIntents({ tool: 'Read' })).toEqual([]);
  });

  it('maps Glob tool to no intents', () => {
    expect(mapToolToIntents({ tool: 'Glob' })).toEqual([]);
  });

  it('maps Grep tool to no intents', () => {
    expect(mapToolToIntents({ tool: 'Grep' })).toEqual([]);
  });

  it('maps Bash with git commit to commit intent', () => {
    expect(
      mapToolToIntents({
        tool: 'Bash',
        input: { command: 'git commit -m "message"' },
      })
    ).toContain('commit');
  });

  it('maps Bash with no command to no intents', () => {
    expect(mapToolToIntents({ tool: 'Bash' })).toEqual([]);
  });

  it('maps unknown tool to no intents', () => {
    expect(mapToolToIntents({ tool: 'UnknownTool' })).toEqual([]);
  });
});

describe('findBlockedIntents', () => {
  it('returns empty array when no blocked intents', () => {
    const result = findBlockedIntents(
      { tool: 'Write' },
      {}
    );
    expect(result).toEqual([]);
  });

  it('returns blocked intent with reason', () => {
    const result = findBlockedIntents(
      { tool: 'Write' },
      { write: 'Tests must be written first (TDD RED phase)' }
    );

    expect(result).toHaveLength(1);
    expect(result[0].intent).toBe('write');
    expect(result[0].reason).toBe('Tests must be written first (TDD RED phase)');
  });

  it('returns multiple blocked intents', () => {
    const result = findBlockedIntents(
      { tool: 'Bash', input: { command: 'git add . && git commit -m "msg" && git push' } },
      {
        commit: 'Tests must pass first',
        push: 'Code review required',
      }
    );

    expect(result).toHaveLength(2);
    expect(result.map((b) => b.intent)).toContain('commit');
    expect(result.map((b) => b.intent)).toContain('push');
  });

  it('ignores non-matching blocked intents', () => {
    const result = findBlockedIntents(
      { tool: 'Read' },
      { write: 'Tests must be written first' }
    );

    expect(result).toEqual([]);
  });
});

describe('classifyFilePath', () => {
  describe('test files', () => {
    it('classifies .test.ts files', () => {
      expect(classifyFilePath('src/foo.test.ts')).toBe('test');
    });

    it('classifies .spec.ts files', () => {
      expect(classifyFilePath('src/foo.spec.ts')).toBe('test');
    });

    it('classifies .test.js files', () => {
      expect(classifyFilePath('lib/bar.test.js')).toBe('test');
    });

    it('classifies _test.go files (Go convention)', () => {
      expect(classifyFilePath('pkg/foo_test.go')).toBe('test');
    });

    it('classifies test_*.py files (Python convention)', () => {
      expect(classifyFilePath('tests/test_utils.py')).toBe('test');
    });

    it('classifies files in tests/ directory', () => {
      expect(classifyFilePath('tests/integration/auth.ts')).toBe('test');
    });

    it('classifies files in test/ directory', () => {
      expect(classifyFilePath('test/helpers.ts')).toBe('test');
    });

    it('classifies files in __tests__/ directory', () => {
      expect(classifyFilePath('src/__tests__/component.tsx')).toBe('test');
    });

    it('classifies Rust test files in tests/', () => {
      expect(classifyFilePath('tests/integration.rs')).toBe('test');
    });

    it('handles case-insensitive matching', () => {
      expect(classifyFilePath('src/Foo.Test.ts')).toBe('test');
      expect(classifyFilePath('TESTS/bar.py')).toBe('test');
    });
  });

  describe('documentation files', () => {
    it('classifies .md files', () => {
      expect(classifyFilePath('CHANGELOG.md')).toBe('docs');
    });

    it('classifies .mdx files', () => {
      expect(classifyFilePath('docs/guide.mdx')).toBe('docs');
    });

    it('classifies files in docs/ directory', () => {
      expect(classifyFilePath('docs/api/reference.html')).toBe('docs');
    });

    it('classifies README files', () => {
      expect(classifyFilePath('README')).toBe('docs');
      expect(classifyFilePath('README.md')).toBe('docs');
    });

    it('classifies CHANGELOG files', () => {
      expect(classifyFilePath('CHANGELOG')).toBe('docs');
    });

    it('classifies LICENSE files', () => {
      expect(classifyFilePath('LICENSE')).toBe('docs');
    });

    it('classifies .txt files', () => {
      expect(classifyFilePath('notes.txt')).toBe('docs');
    });

    it('classifies .rst files', () => {
      expect(classifyFilePath('docs/index.rst')).toBe('docs');
    });
  });

  describe('configuration files', () => {
    it('classifies .json files', () => {
      expect(classifyFilePath('package.json')).toBe('config');
    });

    it('classifies .yaml files', () => {
      expect(classifyFilePath('config.yaml')).toBe('config');
    });

    it('classifies .yml files', () => {
      expect(classifyFilePath('docker-compose.yml')).toBe('config');
    });

    it('classifies .toml files', () => {
      expect(classifyFilePath('Cargo.toml')).toBe('config');
    });

    it('classifies .env files', () => {
      expect(classifyFilePath('.env')).toBe('config');
      expect(classifyFilePath('.env.local')).toBe('config');
    });

    it('classifies RC files', () => {
      expect(classifyFilePath('.eslintrc')).toBe('config');
      expect(classifyFilePath('.prettierrc')).toBe('config');
    });

    it('classifies .config.* files', () => {
      expect(classifyFilePath('vite.config.ts')).toBe('config');
      expect(classifyFilePath('jest.config.js')).toBe('config');
    });

    it('classifies tsconfig files', () => {
      expect(classifyFilePath('tsconfig.json')).toBe('config');
      expect(classifyFilePath('tsconfig.build.json')).toBe('config');
    });

    it('classifies Dockerfile', () => {
      expect(classifyFilePath('Dockerfile')).toBe('config');
    });

    it('classifies Makefile', () => {
      expect(classifyFilePath('Makefile')).toBe('config');
    });

    it('classifies lock files', () => {
      expect(classifyFilePath('package-lock.json')).toBe('config');
      expect(classifyFilePath('yarn.lock')).toBe('config');
    });
  });

  describe('implementation files', () => {
    it('classifies .ts files in src/', () => {
      expect(classifyFilePath('src/index.ts')).toBe('impl');
    });

    it('classifies .js files in lib/', () => {
      expect(classifyFilePath('lib/utils.js')).toBe('impl');
    });

    it('classifies .py files in src/', () => {
      expect(classifyFilePath('src/main.py')).toBe('impl');
    });

    it('classifies .rs files in src/', () => {
      expect(classifyFilePath('src/lib.rs')).toBe('impl');
    });

    it('classifies .go files', () => {
      expect(classifyFilePath('pkg/service.go')).toBe('impl');
    });

    it('classifies .tsx component files', () => {
      expect(classifyFilePath('src/components/Button.tsx')).toBe('impl');
    });
  });

  describe('priority handling', () => {
    it('prioritizes test over docs for .test.md files', () => {
      // While uncommon, test files take priority
      expect(classifyFilePath('src/readme.test.ts')).toBe('test');
    });

    it('prioritizes test over config for test config files', () => {
      expect(classifyFilePath('tests/fixtures/config.json')).toBe('test');
    });
  });

  describe('Windows path handling', () => {
    it('handles backslashes in paths', () => {
      expect(classifyFilePath('src\\foo.test.ts')).toBe('test');
      expect(classifyFilePath('docs\\guide.md')).toBe('docs');
    });
  });
});

describe('getPathAwareIntent', () => {
  it('returns write_test for test files', () => {
    expect(getPathAwareIntent('write', 'src/foo.test.ts')).toBe('write_test');
  });

  it('returns write_impl for implementation files', () => {
    expect(getPathAwareIntent('write', 'src/foo.ts')).toBe('write_impl');
  });

  it('returns write_docs for documentation files', () => {
    expect(getPathAwareIntent('write', 'docs/guide.md')).toBe('write_docs');
  });

  it('returns write_config for configuration files', () => {
    expect(getPathAwareIntent('write', 'package.json')).toBe('write_config');
  });

  it('returns edit_test for editing test files', () => {
    expect(getPathAwareIntent('edit', 'src/foo.test.ts')).toBe('edit_test');
  });

  it('returns edit_impl for editing implementation files', () => {
    expect(getPathAwareIntent('edit', 'src/foo.ts')).toBe('edit_impl');
  });
});

describe('mapToolToIntents with paths', () => {
  it('returns path-aware intent and base intent for Write with path', () => {
    const intents = mapToolToIntents({
      tool: 'Write',
      input: { path: 'src/foo.test.ts' },
    });
    expect(intents).toContain('write_test');
    expect(intents).toContain('write');
  });

  it('returns write_impl for implementation file writes', () => {
    const intents = mapToolToIntents({
      tool: 'Write',
      input: { path: 'src/index.ts' },
    });
    expect(intents).toContain('write_impl');
    expect(intents).toContain('write');
  });

  it('returns write_docs for documentation file writes', () => {
    const intents = mapToolToIntents({
      tool: 'Write',
      input: { path: 'README.md' },
    });
    expect(intents).toContain('write_docs');
    expect(intents).toContain('write');
  });

  it('returns write_config for config file writes', () => {
    const intents = mapToolToIntents({
      tool: 'Write',
      input: { path: 'package.json' },
    });
    expect(intents).toContain('write_config');
    expect(intents).toContain('write');
  });

  it('works with Edit tool', () => {
    const intents = mapToolToIntents({
      tool: 'Edit',
      input: { path: 'src/foo.test.ts' },
    });
    expect(intents).toContain('write_test');
    expect(intents).toContain('write');
  });

  it('works with file_path input key', () => {
    const intents = mapToolToIntents({
      tool: 'Write',
      input: { file_path: 'src/foo.ts' },
    });
    expect(intents).toContain('write_impl');
  });

  it('falls back to base intent when no path provided', () => {
    const intents = mapToolToIntents({ tool: 'Write' });
    expect(intents).toEqual(['write']);
  });
});
