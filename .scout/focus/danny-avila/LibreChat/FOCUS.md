# Focus: danny-avila/LibreChat

## Entrypoints

- **.husky/pre-commit** (hook): Priority entrypoint for hook
- **README.md** (hook): Priority entrypoint for hook

## Scope Roots

- `src/`
- `lib/`
- `.husky/`

## Files

Total: 2 files

### .husky/
- .husky/lint-staged.config.js (0.1 KB)

### src/tests/
- src/tests/oidc-integration.test.ts (15.8 KB)

## Run Hints

| Script | Command |
|--------|---------|
| lint | `eslint "{,!(node_modules|venv)/**/}*.{js,jsx,ts,tsx}"` |
| update | `node config/update.js` |
| add-balance | `node config/add-balance.js` |
| set-balance | `node config/set-balance.js` |
| list-balances | `node config/list-balances.js` |
| user-stats | `node config/user-stats.js` |
| rebuild:package-lock | `node config/packages` |
| reinstall | `node config/update.js -l -g` |
| b:reinstall | `bun config/update.js -b -l -g` |
| reinstall:docker | `node config/update.js -d -g` |
