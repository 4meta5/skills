import { describe, it, expect } from 'vitest';
import type { DetectionContext } from './types.js';
import { detectComposites } from './composites.js';

function createContext(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    projectPath: '/test/project',
    configFiles: [],
    ...overrides
  };
}

function makeTagSet(tags: string[]): Set<string> {
  return new Set(tags.map(t => t.toLowerCase()));
}

describe('Composite Detector', () => {
  it('emits mystack when all required signals are present', () => {
    const ctx = createContext({
      envVars: {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret'
      }
    });

    const tagSet = makeTagSet([
      'sveltekit2',
      'cloudflare-pages',
      'lambda',
      'neon'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(1);
    expect(result[0].tags).toContain('mystack');
  });

  it('does not emit mystack without sveltekit', () => {
    const ctx = createContext({
      envVars: {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret'
      }
    });

    const tagSet = makeTagSet([
      'svelte5',
      'cloudflare-pages',
      'lambda',
      'neon'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(0);
  });

  it('does not emit mystack without cloudflare pages', () => {
    const ctx = createContext({
      envVars: {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret'
      }
    });

    const tagSet = makeTagSet([
      'sveltekit',
      'lambda',
      'neon'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(0);
  });

  it('does not emit mystack without lambda', () => {
    const ctx = createContext({
      envVars: {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret'
      }
    });

    const tagSet = makeTagSet([
      'sveltekit',
      'cloudflare-pages',
      'neon'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(0);
  });

  it('does not emit mystack without neon', () => {
    const ctx = createContext({
      envVars: {
        GOOGLE_CLIENT_ID: 'id',
        GOOGLE_CLIENT_SECRET: 'secret'
      }
    });

    const tagSet = makeTagSet([
      'sveltekit',
      'cloudflare-pages',
      'lambda'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(0);
  });

  it('does not emit mystack without google oauth', () => {
    const ctx = createContext();

    const tagSet = makeTagSet([
      'sveltekit',
      'cloudflare-pages',
      'lambda',
      'neon'
    ]);

    const result = detectComposites(ctx, tagSet);

    expect(result).toHaveLength(0);
  });
});
