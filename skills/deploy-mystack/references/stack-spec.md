# Stack Spec (MyStack)

## Architecture Pattern

- Frontend: Svelte 5 + SvelteKit on Cloudflare Pages
- Backend: Rust Axum on AWS Lambda (Function URL)
- Database: Neon Postgres
- Auth: Google OAuth via frontend server routes
- Service-to-service guard: shared `INTERNAL_API_SECRET`

## Mandatory Rules

- Keep `INTERNAL_API_SECRET` identical on Lambda and Cloudflare.
- Never include `OPTIONS` in Lambda Function URL CORS `AllowMethods`.
- Use only straight ASCII quotes (`"`), not smart quotes.
- Never rely on trailing `\` command continuations for copy/paste.
- After every `wrangler pages deploy`, treat the newly printed preview URL as source of truth until validated.
- Do not call OAuth fixed until `/api/auth/google/start` shows the current deploy URL in `redirect_uri` and Google allowlists include it.
- For Pages config, include `pages_build_output_dir`; do not use unsupported `[assets]` block.

## Env Vars

Lambda:
- `DATABASE_URL`
- `ADMIN_EMAIL`
- `INTERNAL_API_SECRET`

Cloudflare Pages secrets:
- `LAMBDA_URL` (no trailing slash preferred)
- `INTERNAL_API_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Canonical Wrangler Config

```toml
name = "<pages-project-name>"
compatibility_date = "2026-02-04"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"
```

## Session/Auth Contract

- Browser session cookie: `session_id`
- Proxy header: `X-Session-Id`
- Server validates session via `/api/auth/session` and returns `{ user, isAdmin }`.

## Admin Access

- Admin status is decided only by Lambda (`/api/auth/session`).
- If admin fails, inspect that response before changing anything else.
