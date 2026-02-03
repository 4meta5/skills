# Run Hints: liyupi/ai-guide

## Available Scripts

### generate:sidebar

```bash
npm run generate:sidebar
```

Command: `node ./.vuepress/scripts/generateSidebar.js`

### generate:readme

```bash
npm run generate:readme
```

Command: `node ./.vuepress/scripts/genReadme.js`

### getMdNumber

```bash
npm run getMdNumber
```

Command: `node ./.vuepress/scripts/getMdNumber.js`

### docs:dev

```bash
npm run docs:dev
```

Command: `vuepress dev .`

### pre-docs:build

```bash
npm run pre-docs:build
```

Command: `npm run generate:sidebar ./AI && npm run generate:readme ./AI`

### docs:build

```bash
npm run docs:build
```

Command: `vuepress build .`

### serve

```bash
npm run serve
```

Command: `serve ./.vuepress/dist`
