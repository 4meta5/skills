<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.metadata.title} - Skills CLI Documentation</title>
	<meta name="description" content={data.metadata.description} />
</svelte:head>

<div class="max-w-3xl mx-auto px-6 py-16">
	<article class="prose">
		<data.content />
	</article>

	<div class="mt-12 pt-8 border-t border-gray-200 flex justify-between">
		<a href="/docs" class="text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
			&larr; Back to docs
		</a>
		<a href="/" class="text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
			Home
		</a>
	</div>
</div>
