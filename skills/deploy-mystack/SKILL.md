---
name: deploy-mystack
description: |
  Deploy and maintain the "mystack" architecture: Svelte 5/SvelteKit frontend on
  Cloudflare Pages, Rust AWS Lambda backend (Function URL), Neon Postgres, and
  Google OAuth. Use when: deploying or updating any part of this stack,
  troubleshooting OAuth/CORS/preview-URL drift, rotating env vars/secrets, or
  verifying post-deploy health and admin access. Only use when the full stack
  is present (SvelteKit 2 or Svelte 5 + Cloudflare Pages + AWS Lambda +
  Neon Postgres + Google OAuth).
category: deployment
---

# Deploy MyStack

Keep deploy scope tight and repeatable. This skill standardizes deployments for:
- Frontend: Svelte 5 + SvelteKit on Cloudflare Pages
- Backend: Rust Axum on AWS Lambda (Function URL)
- Database: Neon Postgres
- Auth: Google OAuth (no auth framework)
- Shared secret: `INTERNAL_API_SECRET` on both services

Related component skills:
- `svelte5-cloudflare-pages`
- `rust-aws-lambda`
- `neon-postgres`
- `google-oauth`

## Required Inputs

- Latest Cloudflare Pages URL (preview or production)
- Pages project name
- Lambda function name + AWS region
- `INTERNAL_API_SECRET`, `DATABASE_URL`, `ADMIN_EMAIL`
- Google OAuth client ID/secret and allowlist access

## Non-Negotiable Rules

1. Treat the latest `wrangler pages deploy` URL as source of truth.
2. Validate OAuth redirect header after every deploy.
3. Update Google OAuth allowlists AND Lambda CORS to the latest URL.
4. No multiline shell commands; no smart quotes.
5. Lambda env updates must use `{"Variables": {...}}` wrapper.

## Workflow (High Level)

1. Deploy backend (full or CORS-only) as needed.
2. Deploy frontend with Wrangler.
3. Run OAuth header check.
4. Update Google OAuth allowlists and Lambda CORS for latest URL.
5. Verify admin via `/api/auth/session` response.

## References

- Read `references/deploy-playbook.md` for the full checklist, commands, and failure map.
- Read `references/stack-spec.md` for canonical env vars, config, and stack contracts.
- AWS Lambda Function URL CORS behavior:
  https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html?utm_source=openai
- Lambda CORS API reference:
  https://docs.aws.amazon.com/lambda/latest/api/API_Cors.html?utm_source=openai
- Cloudflare Pages Wrangler configuration:
  https://developers.cloudflare.com/pages/functions/wrangler-configuration/?utm_source=openai
- Cloudflare Pages known issues:
  https://developers.cloudflare.com/pages/platform/known-issues/?utm_source=openai
- Neon connection pooling guidance:
  https://neon.com/docs/connect/connection-pooling?utm_source=openai
- Neon driver/connection choice guide:
  https://neon.com/docs/connect/choose-connection?utm_source=openai
