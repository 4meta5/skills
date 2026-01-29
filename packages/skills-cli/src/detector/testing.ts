import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Detect testing frameworks used in the project
 */
export async function detectTesting(ctx: DetectionContext): Promise<DetectedTechnology[]> {
  const testing: DetectedTechnology[] = [];

  // JavaScript/TypeScript testing frameworks
  if (ctx.packageJson) {
    const deps = {
      ...ctx.packageJson.dependencies,
      ...ctx.packageJson.devDependencies
    };

    // Vitest detection
    if (deps['vitest']) {
      testing.push({
        name: 'Vitest',
        category: 'testing',
        confidence: 'high',
        version: deps['vitest'].replace(/[\^~]/, ''),
        evidence: 'package.json vitest',
        tags: ['vitest', 'testing', 'unit-testing', 'vite']
      });
    } else if (ctx.configFiles.includes('vitest.config.ts') ||
               ctx.configFiles.includes('vitest.config.js')) {
      testing.push({
        name: 'Vitest',
        category: 'testing',
        confidence: 'high',
        evidence: 'vitest.config.*',
        tags: ['vitest', 'testing', 'unit-testing', 'vite']
      });
    }

    // Jest detection
    if (deps['jest']) {
      testing.push({
        name: 'Jest',
        category: 'testing',
        confidence: 'high',
        version: deps['jest'].replace(/[\^~]/, ''),
        evidence: 'package.json jest',
        tags: ['jest', 'testing', 'unit-testing']
      });
    } else if (ctx.configFiles.includes('jest.config.js') ||
               ctx.configFiles.includes('jest.config.ts') ||
               ctx.configFiles.includes('jest.config.mjs')) {
      testing.push({
        name: 'Jest',
        category: 'testing',
        confidence: 'high',
        evidence: 'jest.config.*',
        tags: ['jest', 'testing', 'unit-testing']
      });
    }

    // Mocha detection
    if (deps['mocha']) {
      testing.push({
        name: 'Mocha',
        category: 'testing',
        confidence: 'high',
        version: deps['mocha'].replace(/[\^~]/, ''),
        evidence: 'package.json mocha',
        tags: ['mocha', 'testing', 'unit-testing']
      });
    }

    // Playwright detection
    if (deps['@playwright/test'] || deps['playwright']) {
      testing.push({
        name: 'Playwright',
        category: 'testing',
        confidence: 'high',
        version: (deps['@playwright/test'] || deps['playwright'])?.replace(/[\^~]/, ''),
        evidence: 'package.json playwright',
        tags: ['playwright', 'testing', 'e2e', 'integration']
      });
    } else if (ctx.configFiles.includes('playwright.config.ts') ||
               ctx.configFiles.includes('playwright.config.js')) {
      testing.push({
        name: 'Playwright',
        category: 'testing',
        confidence: 'high',
        evidence: 'playwright.config.*',
        tags: ['playwright', 'testing', 'e2e', 'integration']
      });
    }

    // Cypress detection
    if (deps['cypress']) {
      testing.push({
        name: 'Cypress',
        category: 'testing',
        confidence: 'high',
        version: deps['cypress'].replace(/[\^~]/, ''),
        evidence: 'package.json cypress',
        tags: ['cypress', 'testing', 'e2e', 'integration']
      });
    } else if (ctx.configFiles.includes('cypress.config.ts') ||
               ctx.configFiles.includes('cypress.config.js')) {
      testing.push({
        name: 'Cypress',
        category: 'testing',
        confidence: 'high',
        evidence: 'cypress.config.*',
        tags: ['cypress', 'testing', 'e2e', 'integration']
      });
    }

    // Testing Library detection
    if (deps['@testing-library/react'] ||
        deps['@testing-library/svelte'] ||
        deps['@testing-library/vue']) {
      const library = deps['@testing-library/react'] ? 'React' :
                     deps['@testing-library/svelte'] ? 'Svelte' : 'Vue';
      testing.push({
        name: `Testing Library (${library})`,
        category: 'testing',
        confidence: 'high',
        evidence: `package.json @testing-library/${library.toLowerCase()}`,
        tags: ['testing-library', 'testing', 'unit-testing', library.toLowerCase()]
      });
    }

    // Storybook detection (for component testing)
    if (deps['@storybook/react'] ||
        deps['@storybook/svelte'] ||
        deps['@storybook/vue3'] ||
        deps['storybook']) {
      testing.push({
        name: 'Storybook',
        category: 'testing',
        confidence: 'high',
        evidence: 'package.json storybook',
        tags: ['storybook', 'testing', 'component-testing', 'documentation']
      });
    }
  }

  // Rust testing (Cargo test is built-in)
  if (ctx.cargoToml) {
    testing.push({
      name: 'Cargo Test',
      category: 'testing',
      confidence: 'high',
      evidence: 'Cargo.toml (built-in)',
      tags: ['cargo', 'rust', 'testing', 'unit-testing']
    });
  }

  // Python testing
  if (ctx.pyProjectToml || ctx.configFiles.includes('requirements.txt')) {
    // Check for pytest in pyproject.toml
    const poetryDeps = ctx.pyProjectToml?.tool?.poetry;
    const hasPytest = poetryDeps?.dependencies?.['pytest'] ||
                      poetryDeps?.['dev-dependencies']?.['pytest'];

    if (hasPytest || ctx.configFiles.includes('pytest.ini') ||
        ctx.configFiles.includes('pyproject.toml')) {
      testing.push({
        name: 'Pytest',
        category: 'testing',
        confidence: hasPytest ? 'high' : 'medium',
        evidence: hasPytest ? 'pyproject.toml pytest' : 'pytest.ini or pyproject.toml',
        tags: ['pytest', 'python', 'testing', 'unit-testing']
      });
    }
  }

  // Go testing (built-in)
  if (ctx.configFiles.includes('go.mod')) {
    testing.push({
      name: 'Go Test',
      category: 'testing',
      confidence: 'high',
      evidence: 'go.mod (built-in)',
      tags: ['go', 'golang', 'testing', 'unit-testing']
    });
  }

  return testing;
}
