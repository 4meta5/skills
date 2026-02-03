# Run Hints: ThinkInAIXYZ/deepchat

## Build Tool

`pnpm`

## Available Scripts

### test

```bash
pnpm run test
```

Command: `vitest`

### build

```bash
pnpm run build
```

Command: `pnpm run typecheck && electron-vite build`

### lint

```bash
pnpm run lint
```

Command: `oxlint .`

### dev

```bash
pnpm run dev
```

Command: `cross-env VITE_ENABLE_PLAYGROUND=true electron-vite dev --watch`

### start

```bash
pnpm run start
```

Command: `electron-vite preview`

### typecheck

```bash
pnpm run typecheck
```

Command: `pnpm run typecheck:node && pnpm run typecheck:web`

### prebuild

```bash
pnpm run prebuild
```

Command: `node scripts/fetch-provider-db.mjs`

### preinstall

```bash
pnpm run preinstall
```

Command: `npx only-allow pnpm`

### test:main

```bash
pnpm run test:main
```

Command: `vitest --config vitest.config.ts test/main`

### test:renderer

```bash
pnpm run test:renderer
```

Command: `vitest --config vitest.config.renderer.ts test/renderer`
