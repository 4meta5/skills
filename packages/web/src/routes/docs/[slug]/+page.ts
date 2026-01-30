import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Component } from 'svelte';

interface DocMetadata {
	title: string;
	description: string;
}

interface DocModule {
	default: Component;
	metadata: DocMetadata;
}

const docs: Record<string, () => Promise<DocModule>> = import.meta.glob(
	'/src/content/docs/*.md',
	{ eager: false }
) as Record<string, () => Promise<DocModule>>;

export const load: PageLoad = async ({ params }) => {
	const path = `/src/content/docs/${params.slug}.md`;

	if (!(path in docs)) {
		error(404, `Documentation page "${params.slug}" not found`);
	}

	const doc = await docs[path]();

	return {
		content: doc.default,
		metadata: doc.metadata
	};
};

export function entries() {
	return [
		{ slug: 'getting-started' },
		{ slug: 'cli-reference' },
		{ slug: 'skill-format' },
		{ slug: 'writing-skills' }
	];
}
