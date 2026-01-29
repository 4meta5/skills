import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Detect programming languages used in the project
 */
export async function detectLanguages(ctx: DetectionContext): Promise<DetectedTechnology[]> {
  const languages: DetectedTechnology[] = [];

  // TypeScript detection
  if (ctx.packageJson) {
    const deps = {
      ...ctx.packageJson.dependencies,
      ...ctx.packageJson.devDependencies
    };

    if (deps['typescript'] || ctx.configFiles.includes('tsconfig.json')) {
      const version = deps['typescript']?.replace(/[\^~]/, '');
      languages.push({
        name: 'TypeScript',
        category: 'language',
        confidence: 'high',
        version,
        evidence: deps['typescript'] ? 'package.json typescript dependency' : 'tsconfig.json',
        tags: ['typescript', 'ts', 'javascript', 'js']
      });
    } else if (deps['@types/node'] || Object.keys(deps).some(k => k.startsWith('@types/'))) {
      // Has type definitions, likely TypeScript
      languages.push({
        name: 'TypeScript',
        category: 'language',
        confidence: 'medium',
        evidence: '@types/* dependencies in package.json',
        tags: ['typescript', 'ts', 'javascript', 'js']
      });
    }

    // JavaScript (if no TypeScript detected)
    if (!languages.some(l => l.name === 'TypeScript') && ctx.packageJson.name) {
      languages.push({
        name: 'JavaScript',
        category: 'language',
        confidence: 'high',
        evidence: 'package.json present',
        tags: ['javascript', 'js']
      });
    }
  }

  // Rust detection
  if (ctx.cargoToml) {
    const version = ctx.cargoToml.package?.version;
    languages.push({
      name: 'Rust',
      category: 'language',
      confidence: 'high',
      version,
      evidence: 'Cargo.toml',
      tags: ['rust', 'rs', 'cargo']
    });
  }

  // Python detection
  if (ctx.pyProjectToml) {
    languages.push({
      name: 'Python',
      category: 'language',
      confidence: 'high',
      evidence: 'pyproject.toml',
      tags: ['python', 'py']
    });
  } else if (ctx.configFiles.includes('requirements.txt')) {
    languages.push({
      name: 'Python',
      category: 'language',
      confidence: 'high',
      evidence: 'requirements.txt',
      tags: ['python', 'py']
    });
  } else if (ctx.configFiles.includes('setup.py')) {
    languages.push({
      name: 'Python',
      category: 'language',
      confidence: 'high',
      evidence: 'setup.py',
      tags: ['python', 'py']
    });
  }

  // Go detection
  if (ctx.configFiles.includes('go.mod')) {
    languages.push({
      name: 'Go',
      category: 'language',
      confidence: 'high',
      evidence: 'go.mod',
      tags: ['go', 'golang']
    });
  }

  return languages;
}
