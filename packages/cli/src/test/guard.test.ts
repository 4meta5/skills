import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';

describe('test path guard', () => {
  it('throws when target is outside SKILLS_TEST_ROOT', async () => {
    const { assertTestSafeProjectPath } = await import('./guard.js');

    const outsidePath = join(process.cwd(), `skills-non-tmp-${Date.now()}`);
    expect(() => assertTestSafeProjectPath(outsidePath, 'write')).toThrow(/test mode/i);
  });

  it('allows target under SKILLS_TEST_ROOT', async () => {
    const { assertTestSafeProjectPath } = await import('./guard.js');

    const insidePath = join(tmpdir(), `skills-allowed-${Date.now()}`);
    expect(() => assertTestSafeProjectPath(insidePath, 'write')).not.toThrow();
  });
});
