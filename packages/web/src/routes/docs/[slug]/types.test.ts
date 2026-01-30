import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Type safety tests for doc slug page
 *
 * The issue: doc.default is typed as `unknown` in +page.ts, but used as a
 * Svelte component in +page.svelte. TypeScript correctly complains.
 *
 * The fix: Properly type the mdsvex module using Svelte's Component type.
 */

const routesDir = join(__dirname);

describe('Doc slug page type safety', () => {
	it('should have DocModule.default typed as Component, not unknown', () => {
		const pageTs = readFileSync(join(routesDir, '+page.ts'), 'utf-8');

		// The default export should be typed as a Svelte Component, not unknown
		// This ensures TypeScript is happy when we use <data.content /> in the template
		expect(pageTs).not.toMatch(/default:\s*unknown/);
		expect(pageTs).toContain('Component');
	});

	it('should import Component type from svelte', () => {
		const pageTs = readFileSync(join(routesDir, '+page.ts'), 'utf-8');

		// Must import the Component type to properly type the mdsvex output
		expect(pageTs).toMatch(/import.*Component.*from\s+['"]svelte['"]/);
	});
});
