<script lang="ts">
	const installCommand = 'npm i -g @4meta5/skills-cli';
	const scanCommand = 'npx @4meta5/skills-cli scan';
	const addCommand = 'npx @4meta5/skills-cli add tdd';
</script>

<svelte:head>
	<title>Skills CLI - Claude Code Skills</title>
</svelte:head>

<!-- Hero Section -->
<section class="px-6 py-24 text-center max-w-4xl mx-auto">
	<h1 class="text-5xl font-bold tracking-tight text-gray-900 mb-6 text-balance">
		Skills for Claude Code
	</h1>
	<p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto text-pretty">
		Discover, install, and share reusable skills that enhance Claude's capabilities in your projects.
	</p>

	<div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
		<code class="bg-gray-900 text-green-400 px-6 py-3 rounded-lg font-mono text-sm">
			{installCommand}
		</code>
		<a
			href="https://github.com/4meta5/skills"
			class="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
			target="_blank"
			rel="noopener noreferrer"
		>
			<svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
				<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
			</svg>
			GitHub
		</a>
	</div>
</section>

<!-- Features Section -->
<section class="px-6 py-16 bg-gray-50">
	<div class="max-w-5xl mx-auto">
		<h2 class="text-3xl font-bold text-center text-gray-900 mb-12 text-balance">
			What You Get
		</h2>

		<div class="grid md:grid-cols-3 gap-8">
			<div class="bg-white p-6 rounded-xl shadow-sm">
				<div class="size-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-blue-600" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Discover Skills</h3>
				<p class="text-gray-600 text-pretty">
					Scan your project and get smart recommendations for skills that match your stack.
				</p>
			</div>

			<div class="bg-white p-6 rounded-xl shadow-sm">
				<div class="size-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-green-600" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Install Instantly</h3>
				<p class="text-gray-600 text-pretty">
					Add skills to your project with one command. No configuration needed.
				</p>
			</div>

			<div class="bg-white p-6 rounded-xl shadow-sm">
				<div class="size-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
					<svg class="w-6 h-6 text-purple-600" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 mb-2">Open Source</h3>
				<p class="text-gray-600 text-pretty">
					MIT licensed and community driven. Create and share your own skills.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Quick Start Section -->
<section class="px-6 py-16">
	<div class="max-w-3xl mx-auto">
		<h2 class="text-3xl font-bold text-center text-gray-900 mb-8 text-balance">
			Quick Start
		</h2>

		<div class="bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
			<div class="text-gray-400 mb-2"># Scan your project for recommended skills</div>
			<div class="text-green-400 mb-4">$ {scanCommand}</div>

			<div class="text-gray-400 mb-2"># Add a skill to your project</div>
			<div class="text-green-400">$ {addCommand}</div>
		</div>

		<div class="mt-8 text-center">
			<a
				href="/docs"
				class="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded"
			>
				Read the documentation
				<svg class="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
				</svg>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<footer class="px-6 py-8 border-t border-gray-200">
	<div class="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
		<div class="text-gray-500 text-sm">
			MIT License
		</div>
		<div class="flex gap-6">
			<a href="/docs" class="text-gray-600 hover:text-gray-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">Docs</a>
			<a href="/skills" class="text-gray-600 hover:text-gray-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded">Skills</a>
			<a href="https://github.com/4meta5/skills" class="text-gray-600 hover:text-gray-900 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded" target="_blank" rel="noopener noreferrer">GitHub</a>
		</div>
	</div>
</footer>
