import type { DetectedTechnology, DetectionContext } from './types.js';

/**
 * Detect composite, stack-specific signals (no global tags).
 */
export function detectComposites(
  ctx: DetectionContext,
  tagSet: Set<string>
): DetectedTechnology[] {
  const composites: DetectedTechnology[] = [];

  const hasSvelteKit = tagSet.has('sveltekit') || tagSet.has('sveltekit2');
  const hasCloudflarePages = tagSet.has('cloudflare-pages');
  const hasLambda = tagSet.has('lambda');
  const hasNeon = tagSet.has('neon');
  const hasGoogleOauth =
    !!ctx.envVars?.GOOGLE_CLIENT_ID &&
    !!ctx.envVars?.GOOGLE_CLIENT_SECRET;

  if (hasSvelteKit && hasCloudflarePages && hasLambda && hasNeon && hasGoogleOauth) {
    composites.push({
      name: 'MyStack',
      category: 'deployment',
      confidence: 'high',
      evidence: 'Composite detection: sveltekit + cloudflare-pages + lambda + neon + google oauth',
      tags: ['mystack']
    });
  }

  return composites;
}
