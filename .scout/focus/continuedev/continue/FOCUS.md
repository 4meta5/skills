# Focus: continuedev/continue

## Entrypoints

- **README.md** (skill): Priority entrypoint for skill
- **.husky/pre-commit** (hook): Priority entrypoint for hook

## Scope Roots

- `src/`
- `lib/`
- `skills/`
- `.husky/`

## Files

Total: 1 files

### skills/cn-check/
- skills/cn-check/SKILL.md (5.6 KB)

## Run Hints

| Script | Command |
|--------|---------|
| tsc:watch | `concurrently -n gui,vscode,core,binary -c cyan,magenta,yellow,green "npm run tsc:watch:gui" "npm run tsc:watch:vscode" "npm run tsc:watch:core" "npm run tsc:watch:binary"` |
| tsc:watch:gui | `tsc --project gui/tsconfig.json --watch --noEmit --pretty` |
| tsc:watch:vscode | `tsc --project extensions/vscode/tsconfig.json --watch --noEmit --pretty` |
| tsc:watch:core | `tsc --project core/tsconfig.json --watch --noEmit --pretty` |
| tsc:watch:binary | `tsc --project binary/tsconfig.json --watch --noEmit --pretty` |
| format | `prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore --ignore-path .prettierignore` |
| format:check | `prettier --check "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore --ignore-path .prettierignore` |
| prepare | `husky` |
