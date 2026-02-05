---
name: svelte5-cloudflare-pages
description: |
  Deploy Svelte 5 / SvelteKit apps to Cloudflare Pages with Wrangler. Use when
  configuring Pages builds, preview/branch behavior, and environment/secrets.
category: deployment
---

# Svelte 5 on Cloudflare Pages

## Required Inputs

- Cloudflare Pages project name
- Target branch and environment (preview vs production)
- Required secrets and build output path

## Workflow (High Level)

1. Confirm the build output directory and Pages config for the project.
2. Verify preview vs production branch settings match the intended deploy target.
3. Set required secrets in Pages and re-deploy with Wrangler.
4. Validate the deployed URL and environment-specific behavior.

## Guardrails

- Treat the latest `wrangler pages deploy` URL as canonical for preview.
- Avoid unsupported config keys in `wrangler.toml` for Pages.

## References

- Cloudflare Pages Wrangler configuration:
  https://developers.cloudflare.com/pages/functions/wrangler-configuration/?utm_source=openai
- Cloudflare Pages known issues (if deploys fail unexpectedly):
  https://developers.cloudflare.com/pages/platform/known-issues/?utm_source=openai
