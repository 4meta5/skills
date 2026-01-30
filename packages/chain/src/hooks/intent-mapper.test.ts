import { describe, it, expect } from 'vitest';
import {
  extractBashIntents,
  mapToolToIntents,
  findBlockedIntents,
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
