# Svelte5 Cloudflare Playbook

## Golden Path (Worker service)

1. Build
```bash
npm run build
```

2. Set/update secret
```bash
npx wrangler secret put GOOGLE_APPS_SCRIPT_URL --name <worker-name>
```

3. Deploy SvelteKit cloudflare output
```bash
npx wrangler deploy .svelte-kit/cloudflare/_worker.js --name <worker-name> --assets .svelte-kit/cloudflare
```

4. Smoke test
```bash
curl -i -X POST 'https://<worker>.workers.dev/api/waitlist' \
  -H 'Origin: https://<worker>.workers.dev' \
  -d 'name=Smoke Test' \
  -d 'email=smoke@example.com' \
  --data-urlencode 'interests=["1-1 Training"]'
```

Expected: `HTTP 200` and body `{"ok":true}`.

## Common Failures

### 1) `Project does not exist` using `wrangler pages secret put`

- Root cause: using Pages command against Worker service.
- Detect:
```bash
npx wrangler pages project list
npx wrangler deployments list --name <worker-name>
```
- Fix: for Worker service, use `wrangler secret put --name <worker-name>`.

### 2) `Missing entry-point to Worker script`

- Root cause: deploy command missing `main` argument for generated worker.
- Fix:
```bash
npx wrangler deploy .svelte-kit/cloudflare/_worker.js --name <worker-name> --assets .svelte-kit/cloudflare
```

### 3) `Cross-site POST form submissions are forbidden`

- Root cause: cross-site form protection triggered on direct POST without proper origin context.
- Fix: use same-origin frontend request to `/api/waitlist` and/or include matching `Origin` for synthetic tests.

### 4) Browser shows `Script function not found: doGet`

- Root cause: Apps Script only implements `doPost` and URL opened with GET.
- Fix: add `doGet` health response or test with POST.

### 5) Waitlist says success but nothing written upstream

- Root cause: API treats upstream logical errors as success.
- Fix: parse upstream JSON when present and fail on explicit error status.

## Security Defaults

- Never use `no-cors` to suppress errors.
- Keep secrets in Cloudflare secret store.
- Keep input validation server-side.
- Use honeypot and strict field bounds.
