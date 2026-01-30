<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Skills CLI - Claude Code Skills</title>
	<meta name="description" content="Discover and install skills for Claude Code" />
</svelte:head>

<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:ring-2 focus:ring-blue-500"
>
	Skip to main content
</a>

<div class="min-h-screen bg-white text-gray-900">
	<main id="main-content">
		{@render children()}
	</main>
</div>
