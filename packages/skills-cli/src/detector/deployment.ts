import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Detect deployment targets used in the project
 */
export async function detectDeployment(ctx: DetectionContext): Promise<DetectedTechnology[]> {
  const deployment: DetectedTechnology[] = [];

  // Cloudflare Workers detection
  if (ctx.configFiles.includes('wrangler.toml') || ctx.configFiles.includes('wrangler.json')) {
    deployment.push({
      name: 'Cloudflare Workers',
      category: 'deployment',
      confidence: 'high',
      evidence: ctx.configFiles.includes('wrangler.toml') ? 'wrangler.toml' : 'wrangler.json',
      tags: ['cloudflare', 'workers', 'edge', 'serverless']
    });
  }

  // Check for Cloudflare packages in dependencies
  if (ctx.packageJson) {
    const deps = {
      ...ctx.packageJson.dependencies,
      ...ctx.packageJson.devDependencies
    };

    // Cloudflare adapter or worker types
    if (deps['@cloudflare/workers-types'] || deps['wrangler']) {
      if (!deployment.some(d => d.name === 'Cloudflare Workers')) {
        deployment.push({
          name: 'Cloudflare Workers',
          category: 'deployment',
          confidence: 'medium',
          evidence: 'package.json cloudflare dependencies',
          tags: ['cloudflare', 'workers', 'edge', 'serverless']
        });
      }
    }

    // Cloudflare D1 (edge database)
    if (deps['@cloudflare/d1']) {
      deployment.push({
        name: 'Cloudflare D1',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json @cloudflare/d1',
        tags: ['cloudflare', 'd1', 'database', 'edge']
      });
    }

    // Cloudflare R2 (object storage)
    if (deps['@cloudflare/r2']) {
      deployment.push({
        name: 'Cloudflare R2',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json @cloudflare/r2',
        tags: ['cloudflare', 'r2', 'storage', 'edge']
      });
    }

    // SvelteKit Cloudflare adapter
    if (deps['@sveltejs/adapter-cloudflare'] || deps['@sveltejs/adapter-cloudflare-workers']) {
      if (!deployment.some(d => d.name === 'Cloudflare Workers')) {
        deployment.push({
          name: 'Cloudflare Workers',
          category: 'deployment',
          confidence: 'high',
          evidence: 'package.json @sveltejs/adapter-cloudflare',
          tags: ['cloudflare', 'workers', 'edge', 'serverless', 'sveltekit']
        });
      }
    }

    // AWS CDK detection
    if (deps['aws-cdk'] || deps['aws-cdk-lib']) {
      deployment.push({
        name: 'AWS CDK',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json aws-cdk dependency',
        tags: ['aws', 'cdk', 'infrastructure', 'iac']
      });
    }

    // AWS Lambda detection
    if (deps['@aws-sdk/client-lambda'] || deps['aws-lambda']) {
      deployment.push({
        name: 'AWS Lambda',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json AWS Lambda dependencies',
        tags: ['aws', 'lambda', 'serverless']
      });
    }

    // Vercel detection
    if (deps['vercel'] || deps['@vercel/node']) {
      deployment.push({
        name: 'Vercel',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json vercel dependencies',
        tags: ['vercel', 'serverless', 'edge']
      });
    }

    // Netlify detection
    if (deps['netlify-cli'] || deps['@netlify/functions']) {
      deployment.push({
        name: 'Netlify',
        category: 'deployment',
        confidence: 'high',
        evidence: 'package.json netlify dependencies',
        tags: ['netlify', 'serverless', 'jamstack']
      });
    }
  }

  // AWS CDK config file detection
  if (ctx.configFiles.includes('cdk.json')) {
    if (!deployment.some(d => d.name === 'AWS CDK')) {
      deployment.push({
        name: 'AWS CDK',
        category: 'deployment',
        confidence: 'high',
        evidence: 'cdk.json',
        tags: ['aws', 'cdk', 'infrastructure', 'iac']
      });
    }
  }

  // AWS SAM detection
  if (ctx.configFiles.includes('sam.yaml') ||
      ctx.configFiles.includes('samconfig.toml') ||
      ctx.configFiles.includes('template.yaml')) {
    deployment.push({
      name: 'AWS SAM',
      category: 'deployment',
      confidence: 'high',
      evidence: ctx.configFiles.find(f =>
        f === 'sam.yaml' || f === 'samconfig.toml' || f === 'template.yaml'
      ) || 'SAM config file',
      tags: ['aws', 'sam', 'serverless', 'lambda']
    });
  }

  // Vercel config file detection
  if (ctx.configFiles.includes('vercel.json')) {
    if (!deployment.some(d => d.name === 'Vercel')) {
      deployment.push({
        name: 'Vercel',
        category: 'deployment',
        confidence: 'high',
        evidence: 'vercel.json',
        tags: ['vercel', 'serverless', 'edge']
      });
    }
  }

  // Netlify config file detection
  if (ctx.configFiles.includes('netlify.toml')) {
    if (!deployment.some(d => d.name === 'Netlify')) {
      deployment.push({
        name: 'Netlify',
        category: 'deployment',
        confidence: 'high',
        evidence: 'netlify.toml',
        tags: ['netlify', 'serverless', 'jamstack']
      });
    }
  }

  // Docker detection
  if (ctx.configFiles.includes('Dockerfile') || ctx.configFiles.includes('docker-compose.yml')) {
    deployment.push({
      name: 'Docker',
      category: 'deployment',
      confidence: 'high',
      evidence: ctx.configFiles.includes('Dockerfile') ? 'Dockerfile' : 'docker-compose.yml',
      tags: ['docker', 'containers']
    });
  }

  // Kubernetes detection
  if (ctx.configFiles.some(f => f.endsWith('.k8s.yaml') || f.endsWith('.k8s.yml'))) {
    deployment.push({
      name: 'Kubernetes',
      category: 'deployment',
      confidence: 'high',
      evidence: 'Kubernetes manifest files',
      tags: ['kubernetes', 'k8s', 'containers']
    });
  }

  return deployment;
}
