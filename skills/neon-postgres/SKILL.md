---
name: neon-postgres
description: |
  Configure Neon Postgres connections for serverless workloads. Use when
  selecting pooled vs direct connections, setting pooled URLs, and avoiding
  connection exhaustion.
category: database
---

# Neon Postgres

## Required Inputs

- Neon project connection string(s)
- Whether the runtime is serverless or long-lived
- Pooler (pgbouncer) settings and limits

## Workflow (High Level)

1. Choose pooled vs direct connection based on runtime.
2. Use the pooler connection string for serverless environments.
3. Apply connection limits and verify pooler behavior in production.
4. Validate database connectivity and error rates post-deploy.

## Guardrails

- Prefer pooled connections for serverless runtimes.
- Avoid opening many direct connections in ephemeral environments.

## Curated Skill Reference

This skill complements the curated `neon-vercel-postgres` skill from the
`jezweb/claude-skills` repository. Use it for deeper Neon-specific guidance:
https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres

## Landmines To Avoid

- Connection pool exhaustion: use the pooled connection string for serverless.
  https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres
- TCP connections unsupported in serverless runtimes: use Neon serverless driver.
  https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres
- Node v20 transaction + `Promise.all` issues: run sequentially inside transactions.
  https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres
- `process is not defined` in edge runtimes: avoid Node-only APIs or use compatible runtimes.
  https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres

## References

- Curated Neon skill (`neon-vercel-postgres`):
  https://tessl.io/skills/github/jezweb/claude-skills/neon-vercel-postgres
- Neon connection pooling guidance:
  https://neon.com/docs/connect/connection-pooling?utm_source=openai
- Neon driver/connection choice guide:
  https://neon.com/docs/connect/choose-connection?utm_source=openai
