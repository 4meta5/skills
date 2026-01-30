<script lang="ts">
	const docs = [
		{
			slug: 'getting-started',
			title: 'Getting Started',
			description: 'Install the CLI and add your first skill'
		},
		{
			slug: 'cli-reference',
			title: 'CLI Reference',
			description: 'All commands with examples'
		},
		{
			slug: 'skill-format',
			title: 'Skill Format',
			description: 'SKILL.md spec and frontmatter fields'
		},
		{
			slug: 'writing-skills',
			title: 'Writing Skills',
			description: 'How to create your own skills'
		}
	];
</script>

<svelte:head>
	<title>Documentation - Skills CLI</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-bold text-gray-900 mb-4 text-balance">Documentation</h1>
	<p class="text-xl text-gray-600 mb-12 text-pretty">
		Learn how to use the Skills CLI to enhance your Claude Code workflow.
	</p>

	<div class="grid gap-4">
		{#each docs as doc}
			<a
				href="/docs/{doc.slug}"
				class="block p-6 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-[border-color,box-shadow] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
			>
				<h2 class="text-lg font-semibold text-gray-900 mb-1">{doc.title}</h2>
				<p class="text-gray-600 text-pretty">{doc.description}</p>
			</a>
		{/each}
	</div>

	<div class="mt-12 pt-8 border-t border-gray-200">
		<a href="/" class="text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
			&larr; Back to home
		</a>
	</div>
</div>
