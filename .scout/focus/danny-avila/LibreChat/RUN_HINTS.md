# Run Hints: danny-avila/LibreChat

## Available Scripts

### lint

```bash
npm run lint
```

Command: `eslint "{,!(node_modules|venv)/**/}*.{js,jsx,ts,tsx}"`

### update

```bash
npm run update
```

Command: `node config/update.js`

### add-balance

```bash
npm run add-balance
```

Command: `node config/add-balance.js`

### set-balance

```bash
npm run set-balance
```

Command: `node config/set-balance.js`

### list-balances

```bash
npm run list-balances
```

Command: `node config/list-balances.js`

### user-stats

```bash
npm run user-stats
```

Command: `node config/user-stats.js`

### rebuild:package-lock

```bash
npm run rebuild:package-lock
```

Command: `node config/packages`

### reinstall

```bash
npm run reinstall
```

Command: `node config/update.js -l -g`

### b:reinstall

```bash
npm run b:reinstall
```

Command: `bun config/update.js -b -l -g`

### reinstall:docker

```bash
npm run reinstall:docker
```

Command: `node config/update.js -d -g`
