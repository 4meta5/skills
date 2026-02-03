# Run Hints: continuedev/continue

## Available Scripts

### tsc:watch

```bash
npm run tsc:watch
```

Command: `concurrently -n gui,vscode,core,binary -c cyan,magenta,yellow,green "npm run tsc:watch:gui" "npm run tsc:watch:vscode" "npm run tsc:watch:core" "npm run tsc:watch:binary"`

### tsc:watch:gui

```bash
npm run tsc:watch:gui
```

Command: `tsc --project gui/tsconfig.json --watch --noEmit --pretty`

### tsc:watch:vscode

```bash
npm run tsc:watch:vscode
```

Command: `tsc --project extensions/vscode/tsconfig.json --watch --noEmit --pretty`

### tsc:watch:core

```bash
npm run tsc:watch:core
```

Command: `tsc --project core/tsconfig.json --watch --noEmit --pretty`

### tsc:watch:binary

```bash
npm run tsc:watch:binary
```

Command: `tsc --project binary/tsconfig.json --watch --noEmit --pretty`

### format

```bash
npm run format
```

Command: `prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore --ignore-path .prettierignore`

### format:check

```bash
npm run format:check
```

Command: `prettier --check "**/*.{js,jsx,ts,tsx,json,css,md}" --ignore-path .gitignore --ignore-path .prettierignore`

### prepare

```bash
npm run prepare
```

Command: `husky`
