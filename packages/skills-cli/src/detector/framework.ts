import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Parse a semver version string and extract major version
 */
function parseMajorVersion(version: string): number | null {
  const match = version.replace(/[\^~]/, '').match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detect frameworks used in the project
 */
export async function detectFrameworks(ctx: DetectionContext): Promise<DetectedTechnology[]> {
  const frameworks: DetectedTechnology[] = [];

  if (!ctx.packageJson) {
    return frameworks;
  }

  const deps = {
    ...ctx.packageJson.dependencies,
    ...ctx.packageJson.devDependencies
  };

  // Svelte detection
  if (deps['svelte']) {
    const version = deps['svelte'];
    const majorVersion = parseMajorVersion(version);
    const isSvelte5 = majorVersion !== null && majorVersion >= 5;

    frameworks.push({
      name: isSvelte5 ? 'Svelte 5' : 'Svelte',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json svelte@${version}`,
      tags: isSvelte5
        ? ['svelte', 'svelte5', 'runes', 'frontend']
        : ['svelte', 'frontend']
    });
  }

  // SvelteKit detection
  if (deps['@sveltejs/kit']) {
    const version = deps['@sveltejs/kit'];
    const majorVersion = parseMajorVersion(version);
    const isSvelteKit2 = majorVersion !== null && majorVersion >= 2;

    frameworks.push({
      name: isSvelteKit2 ? 'SvelteKit 2' : 'SvelteKit',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json @sveltejs/kit@${version}`,
      tags: isSvelteKit2
        ? ['sveltekit', 'sveltekit2', 'svelte', 'fullstack']
        : ['sveltekit', 'svelte', 'fullstack']
    });
  }

  // React detection
  if (deps['react']) {
    const version = deps['react'];
    const majorVersion = parseMajorVersion(version);

    frameworks.push({
      name: majorVersion && majorVersion >= 18 ? 'React 18+' : 'React',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json react@${version}`,
      tags: ['react', 'frontend']
    });
  }

  // Next.js detection
  if (deps['next']) {
    const version = deps['next'];
    const majorVersion = parseMajorVersion(version);

    let name = 'Next.js';
    const tags = ['nextjs', 'next', 'react', 'fullstack'];

    if (majorVersion !== null) {
      if (majorVersion >= 14) {
        name = 'Next.js 14+';
        tags.push('nextjs14', 'app-router', 'server-components');
      } else if (majorVersion >= 13) {
        name = 'Next.js 13+';
        tags.push('nextjs13', 'app-router');
      }
    }

    frameworks.push({
      name,
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json next@${version}`,
      tags
    });
  }

  // Vue detection
  if (deps['vue']) {
    const version = deps['vue'];
    const majorVersion = parseMajorVersion(version);

    frameworks.push({
      name: majorVersion && majorVersion >= 3 ? 'Vue 3' : 'Vue',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json vue@${version}`,
      tags: ['vue', 'frontend']
    });
  }

  // Nuxt detection
  if (deps['nuxt']) {
    const version = deps['nuxt'];
    const majorVersion = parseMajorVersion(version);

    frameworks.push({
      name: majorVersion && majorVersion >= 3 ? 'Nuxt 3' : 'Nuxt',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json nuxt@${version}`,
      tags: ['nuxt', 'vue', 'fullstack']
    });
  }

  // Angular detection
  if (deps['@angular/core']) {
    const version = deps['@angular/core'];

    frameworks.push({
      name: 'Angular',
      category: 'framework',
      confidence: 'high',
      version: version.replace(/[\^~]/, ''),
      evidence: `package.json @angular/core@${version}`,
      tags: ['angular', 'frontend']
    });
  }

  // Express detection
  if (deps['express']) {
    frameworks.push({
      name: 'Express',
      category: 'framework',
      confidence: 'high',
      version: deps['express'].replace(/[\^~]/, ''),
      evidence: `package.json express`,
      tags: ['express', 'nodejs', 'backend', 'api']
    });
  }

  // Fastify detection
  if (deps['fastify']) {
    frameworks.push({
      name: 'Fastify',
      category: 'framework',
      confidence: 'high',
      version: deps['fastify'].replace(/[\^~]/, ''),
      evidence: `package.json fastify`,
      tags: ['fastify', 'nodejs', 'backend', 'api']
    });
  }

  // Hono detection (often used with Cloudflare)
  if (deps['hono']) {
    frameworks.push({
      name: 'Hono',
      category: 'framework',
      confidence: 'high',
      version: deps['hono'].replace(/[\^~]/, ''),
      evidence: `package.json hono`,
      tags: ['hono', 'cloudflare', 'workers', 'backend', 'api', 'edge']
    });
  }

  // Astro detection
  if (deps['astro']) {
    frameworks.push({
      name: 'Astro',
      category: 'framework',
      confidence: 'high',
      version: deps['astro'].replace(/[\^~]/, ''),
      evidence: `package.json astro`,
      tags: ['astro', 'static', 'frontend']
    });
  }

  // Remix detection
  if (deps['@remix-run/node'] || deps['@remix-run/react']) {
    const version = deps['@remix-run/node'] || deps['@remix-run/react'];
    frameworks.push({
      name: 'Remix',
      category: 'framework',
      confidence: 'high',
      version: version?.replace(/[\^~]/, ''),
      evidence: `package.json @remix-run/*`,
      tags: ['remix', 'react', 'fullstack']
    });
  }

  return frameworks;
}
