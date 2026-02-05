# Deploy Playbook (MyStack)

Use this checklist for every deploy. Replace placeholders with your project values.

## Post-Deploy Checklist (Must Run Every Time)

1. Capture the latest Pages URL from `wrangler pages deploy` output.
2. Run OAuth header check:

```bash
curl -sI "https://<latest-pages-url>/api/auth/google/start?redirect=%2Fchat" | rg -i '^location:'
```

3. Confirm `client_id` ends with `.apps.googleusercontent.com`.
4. Confirm `redirect_uri` uses the latest Pages URL.
5. Update Google OAuth allowlists for the latest URL.
6. Update Lambda CORS for the latest URL:

```bash
export PROD_ORIGIN="https://<latest-pages-url>"
./scripts/deploy-lambda.sh --cors-only
```

7. Verify admin status from `/api/auth/session` if admin access is required.

## Quick Commands (Copy/Paste Safe)

Run one line at a time. No trailing `\`. Use straight quotes only.

### Check OAuth redirect header

```bash
curl -sI "https://<latest-pages-url>/api/auth/google/start?redirect=%2Fchat" | rg -i '^location:'
```

### Update Lambda CORS for latest Pages URL

```bash
export PROD_ORIGIN="https://<latest-pages-url>"
./scripts/deploy-lambda.sh --cors-only
```

### Fix ADMIN_EMAIL in Lambda env (safe, preserves other vars)

```bash
AWS_PAGER="" aws lambda get-function-configuration --function-name <lambda-function-name> --region us-east-1 --query "Environment.Variables" --output json > lambda-env.json
```

```bash
jq -s '{"Variables": (.[0] | .ADMIN_EMAIL="admin@example.com")}' lambda-env.json > lambda-env.fixed.json
```

```bash
AWS_PAGER="" aws lambda update-function-configuration --function-name <lambda-function-name> --region us-east-1 --environment file://lambda-env.fixed.json
```

## Deployment Workflow

### 1. Backend full deploy

```bash
cd <repo-root>
export DATABASE_URL="..."
export ADMIN_EMAIL="..."
export INTERNAL_API_SECRET="..."
./scripts/deploy-lambda.sh
```

### 2. Backend CORS-only update (common recovery)

```bash
cd <repo-root>
export FUNCTION_NAME="<lambda-function-name>"
export AWS_REGION="us-east-1"
export PROD_ORIGIN="https://<latest-pages-preview-or-prod-domain>"
./scripts/deploy-lambda.sh --cors-only
```

### 3. Frontend manual deploy

```bash
cd <repo-root>
wrangler login
wrangler pages project create <pages-project-name> --production-branch main
wrangler pages secret put LAMBDA_URL --project-name <pages-project-name>
wrangler pages secret put INTERNAL_API_SECRET --project-name <pages-project-name>
wrangler pages secret put GOOGLE_CLIENT_ID --project-name <pages-project-name>
wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name <pages-project-name>
npm run build
wrangler pages deploy .svelte-kit/cloudflare --project-name <pages-project-name> --branch main
```

## OAuth Validation Loop (Critical)

After each deploy:

```bash
curl -sI "https://<latest-pages-url>/api/auth/google/start?redirect=%2Fchat" | rg -i '^location:'
```

Verify:
- `client_id=...apps.googleusercontent.com`
- `redirect_uri=https://<latest-pages-url>/api/auth/google/callback` (encoded in header)

Then update Google OAuth app with exact current URL:
- Authorized JavaScript origins:
  - `https://<latest-pages-url>`
  - `https://<stable-pages-url>` (recommended)
  - `http://localhost:5173` (if local dev needed)
- Authorized redirect URIs:
  - `https://<latest-pages-url>/api/auth/google/callback`
  - `https://<stable-pages-url>/api/auth/google/callback`
  - `http://localhost:5173/api/auth/google/callback` (if local dev needed)

Wait 1-3 minutes, then retest sign-in.

## Repeated Mistakes To Avoid

- Using an old preview URL after a new Wrangler deploy.
- Updating Google OAuth for yesterday's domain instead of today's deploy URL.
- Setting `GOOGLE_CLIENT_ID` to the wrong credential type.
- Leaving trailing slash in `LAMBDA_URL` when proxy code is not slash-safe.
- Declaring success before running the header verification command.
- Breaking shell commands with smart quotes or multiline JSON wrapping.
- Updating Lambda env without `{ "Variables": { ... } }` wrapper.
- Assuming admin UI logic is frontend-only; it is enforced in Lambda.

## Failure Mode Quickmap

- `ValidationException` on `cors.allowMethods`:
  - Remove `OPTIONS`.
- `Invalid JSON` on `--cors`:
  - Use `file://...` JSON file or `--cors-only` helper script.
- `dquote>` prompt:
  - `Ctrl+C`, rerun one command per line, ASCII quotes only.
- Pages config error (`assets` unsupported):
  - Remove `[assets]` in `wrangler.toml`.
- Google `invalid_client`:
  - Re-set Pages Google secrets, redeploy, re-verify header.
- Google `redirect_uri_mismatch`:
  - Add exact callback URI for latest deployed domain.
- OAuth callback ends in `404 Request failed`:
  - Check lambda proxy URL joining and `LAMBDA_URL` formatting.
- Admin account unexpectedly denied:
  - Verify deployed Lambda `ADMIN_EMAIL` value with AWS CLI.
  - Ensure email matching is normalized (trim + lowercase) on backend checks.

Quick verification command:

```bash
aws lambda get-function-configuration --function-name <lambda-function-name> --region us-east-1 --query 'Environment.Variables.ADMIN_EMAIL' --output text
```
