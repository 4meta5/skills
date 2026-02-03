# Focus: liyupi/ai-guide

## Entrypoints

- **README.md** (library): Priority entrypoint for library

## Scope Roots

- `src/`
- `lib/`

## Files

Total: 0 files

## Run Hints

| Script | Command |
|--------|---------|
| generate:sidebar | `node ./.vuepress/scripts/generateSidebar.js` |
| generate:readme | `node ./.vuepress/scripts/genReadme.js` |
| getMdNumber | `node ./.vuepress/scripts/getMdNumber.js` |
| docs:dev | `vuepress dev .` |
| pre-docs:build | `npm run generate:sidebar ./AI && npm run generate:readme ./AI` |
| docs:build | `vuepress build .` |
| serve | `serve ./.vuepress/dist` |
