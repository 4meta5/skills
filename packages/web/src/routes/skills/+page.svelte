<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Available Skills - Skills CLI</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-16">
	<h1 class="text-4xl font-bold text-gray-900 mb-4 text-balance">Available Skills</h1>
	<p class="text-xl text-gray-600 mb-12 text-pretty">
		Browse skills bundled with the Skills CLI. Install any of these with <code class="bg-gray-100 px-2 py-1 rounded text-sm">skills add &lt;name&gt;</code>
	</p>

	{#if data.skills.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500 mb-4">No skills found.</p>
			<a
				href="/docs/writing-skills"
				class="text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
			>
				Learn how to create skills
			</a>
		</div>
	{:else}
		<div class="grid gap-4">
			{#each data.skills as skill}
				<div class="p-6 bg-white border border-gray-200 rounded-xl">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h2 class="text-lg font-semibold text-gray-900 mb-1">{skill.name}</h2>
							<p class="text-gray-600 mb-3 text-pretty">{skill.description}</p>
							{#if skill.category}
								<span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
									{skill.category}
								</span>
							{/if}
						</div>
						<a
							href="https://github.com/4meta5/skills/tree/main/packages/skills-library/skills/{skill.name}"
							class="text-gray-400 hover:text-gray-600 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
							aria-label="View {skill.name} on GitHub"
							target="_blank"
							rel="noopener noreferrer"
						>
							<svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
							</svg>
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<div class="mt-12 pt-8 border-t border-gray-200">
		<a href="/" class="text-blue-600 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">
			&larr; Back to home
		</a>
	</div>
</div>
