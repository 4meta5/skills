#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
FAIL=0

say_ok() { printf "[OK] %s\n" "$1"; }
say_warn() { printf "[WARN] %s\n" "$1"; }
say_fail() { printf "[FAIL] %s\n" "$1"; FAIL=1; }

cd "$ROOT"

if rg -n "@sveltejs/adapter-cloudflare" svelte.config.js >/dev/null 2>&1; then
  say_ok "Cloudflare adapter configured in svelte.config.js"
else
  say_fail "svelte.config.js is not using @sveltejs/adapter-cloudflare"
fi

if rg -n '"@sveltejs/adapter-cloudflare"' package.json >/dev/null 2>&1; then
  say_ok "package.json includes @sveltejs/adapter-cloudflare"
else
  say_fail "package.json missing @sveltejs/adapter-cloudflare"
fi

if [ -f "src/routes/api/waitlist/+server.ts" ]; then
  say_ok "waitlist API route exists"
  if rg -n "export const prerender = false;" src/routes/api/waitlist/+server.ts >/dev/null 2>&1; then
    say_ok "waitlist API route prerender disabled"
  else
    say_warn "waitlist API route prerender flag missing"
  fi
else
  say_warn "waitlist API route not found (ok if this project has no waitlist)"
fi

if [ -f ".env.example" ] && rg -n "GOOGLE_APPS_SCRIPT_URL=" .env.example >/dev/null 2>&1; then
  say_ok ".env.example documents GOOGLE_APPS_SCRIPT_URL"
else
  say_warn "GOOGLE_APPS_SCRIPT_URL missing from .env.example"
fi

if [ -f ".svelte-kit/cloudflare/_worker.js" ]; then
  say_ok "SvelteKit Cloudflare output present"
else
  say_warn "Build output missing (.svelte-kit/cloudflare/_worker.js). Run: npm run build"
fi

if command -v npx >/dev/null 2>&1; then
  say_ok "npx available"
else
  say_fail "npx not found"
fi

printf "\nRecommended deploy command (Worker service):\n"
printf "npx wrangler deploy .svelte-kit/cloudflare/_worker.js --name <worker-name> --assets .svelte-kit/cloudflare\n"

if [ "$FAIL" -eq 1 ]; then
  exit 1
fi
