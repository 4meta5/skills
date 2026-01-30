import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Accessibility tests for UI components
 * Tests verify that accessibility attributes are present in the source files
 */

const routesDir = join(__dirname);

function readSvelteFile(filename: string): string {
	return readFileSync(join(routesDir, filename), 'utf-8');
}

describe('Accessibility: Layout', () => {
	const layout = readSvelteFile('+layout.svelte');

	it('should have a skip link for keyboard navigation', () => {
		expect(layout).toContain('Skip to main content');
		expect(layout).toContain('href="#main-content"');
	});

	it('should have a main landmark with id', () => {
		expect(layout).toContain('id="main-content"');
		expect(layout).toMatch(/<main[^>]*id="main-content"/);
	});
});

describe('Accessibility: Homepage (+page.svelte)', () => {
	const homepage = readSvelteFile('+page.svelte');

	it('should have aria-hidden on decorative SVGs', () => {
		// All SVGs should have aria-hidden="true" for decorative icons
		const svgMatches = homepage.match(/<svg[^>]*>/g) || [];
		expect(svgMatches.length).toBeGreaterThan(0);

		for (const svg of svgMatches) {
			expect(svg).toContain('aria-hidden="true"');
		}
	});

	it('should have focus-visible states on interactive elements', () => {
		// Links should have focus-visible ring for keyboard users
		expect(homepage).toContain('focus-visible:');
	});

	it('should use text-balance on headings', () => {
		// h1 and h2 should have text-balance class
		expect(homepage).toMatch(/<h1[^>]*class="[^"]*text-balance/);
		expect(homepage).toMatch(/<h2[^>]*class="[^"]*text-balance/);
	});

	it('should use size-* for square elements instead of w-* h-*', () => {
		// Feature cards use 12x12 icons - should use size-12 not w-12 h-12
		expect(homepage).not.toMatch(/class="[^"]*w-12 h-12/);
		expect(homepage).toContain('size-12');
	});
});

describe('Accessibility: Skills page', () => {
	const skillsPage = readSvelteFile('skills/+page.svelte');

	it('should have aria-label on icon-only links', () => {
		// GitHub icon links need aria-label for screen readers
		expect(skillsPage).toContain('aria-label=');
	});

	it('should have aria-hidden on decorative SVGs', () => {
		const svgMatches = skillsPage.match(/<svg[^>]*>/g) || [];
		expect(svgMatches.length).toBeGreaterThan(0);

		for (const svg of svgMatches) {
			expect(svg).toContain('aria-hidden="true"');
		}
	});

	it('should have an empty state with a clear next action', () => {
		// Per baseline-ui: empty states must have one clear next action
		expect(skillsPage).toContain('No skills found');
	});
});

describe('Accessibility: Docs page', () => {
	const docsPage = readSvelteFile('docs/+page.svelte');

	it('should not use transition-all (performance issue)', () => {
		// baseline-ui: NEVER animate layout properties
		expect(docsPage).not.toContain('transition-all');
	});

	it('should have focus-visible states on links', () => {
		expect(docsPage).toContain('focus-visible:');
	});

	it('should use text-balance on headings', () => {
		expect(docsPage).toMatch(/<h1[^>]*class="[^"]*text-balance/);
	});
});

describe('Accessibility: Doc slug page', () => {
	const docSlugPage = readSvelteFile('docs/[slug]/+page.svelte');

	it('should not have empty $effect blocks (dead code)', () => {
		// Empty $effect does nothing - should be removed
		expect(docSlugPage).not.toMatch(/\$effect\(\s*\(\)\s*=>\s*\{[\s\n]*\/\/[^\}]*\}\s*\)/);
	});

	it('should have focus-visible states on links', () => {
		expect(docSlugPage).toContain('focus-visible:');
	});
});

describe('Accessibility: Global CSS (app.css)', () => {
	const appCss = readFileSync(join(routesDir, '../app.css'), 'utf-8');

	it('should have scroll-margin-top for prose headings', () => {
		expect(appCss).toContain('scroll-margin-top');
	});

	it('should have touch-action: manipulation for interactive elements', () => {
		expect(appCss).toContain('touch-action: manipulation');
	});
});
