#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT="$SKILL_DIR/references/state.json"

cd "$ROOT"

WRANGLER_VERSION=""
if command -v npx >/dev/null 2>&1; then
  WRANGLER_VERSION="$(npx --yes wrangler --version 2>/dev/null | tr -d '\n' || true)"
fi

node - "$ROOT" "$OUT" "$WRANGLER_VERSION" << 'NODE'
const fs = require('fs');
const crypto = require('crypto');

const root = process.argv[2];
const out = process.argv[3];
const wranglerVersion = process.argv[4] || '';

const pkgPath = `${root}/package.json`;
const svelteConfigPath = `${root}/svelte.config.js`;
const waitlistPath = `${root}/src/routes/api/waitlist/+server.ts`;

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const deps = pkg.devDependencies || {};

function sha256(path) {
  if (!fs.existsSync(path)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

const state = {
  updated_at_utc: new Date().toISOString(),
  tooling: {
    sveltekit: deps['@sveltejs/kit'] || null,
    adapter_cloudflare: deps['@sveltejs/adapter-cloudflare'] || null,
    vite: deps['vite'] || null,
    wrangler_cli: wranglerVersion || null
  },
  fingerprints: {
    svelte_config_sha256: sha256(svelteConfigPath),
    waitlist_api_sha256: sha256(waitlistPath)
  },
  deploy: {
    worker_entry: '.svelte-kit/cloudflare/_worker.js',
    assets_dir: '.svelte-kit/cloudflare',
    worker_secret_key: 'GOOGLE_APPS_SCRIPT_URL'
  }
};

fs.writeFileSync(out, JSON.stringify(state, null, 2) + '\n');
console.log(`Updated ${out}`);
NODE
