# Focus: ThinkInAIXYZ/deepchat

## Entrypoints

- **README.md** (mcp-server): Priority entrypoint for mcp-server

## Scope Roots

- `src/`
- `lib/`

## Files

Total: 47 files

### src/main/presenter/agentPresenter/
- src/main/presenter/agentPresenter/events.ts (0.0 KB)
- src/main/presenter/agentPresenter/types.ts (0.2 KB)
- src/main/presenter/agentPresenter/index.ts (17.1 KB)

### src/main/lib/textsplitters/document/
- src/main/lib/textsplitters/document/index.ts (0.0 KB)
- src/main/lib/textsplitters/document/document.ts (1.2 KB)

### src/main/lib/textsplitters/
- src/main/lib/textsplitters/index.ts (0.4 KB)
- src/main/lib/textsplitters/text_splitter.ts (18.6 KB)

### src/main/
- src/main/env.d.ts (0.4 KB)
- src/main/eventbus.ts (4.1 KB)
- src/main/index.ts (5.6 KB)
- src/main/events.ts (12.3 KB)
- src/main/contextMenuHelper.ts (12.8 KB)

### src/main/lib/
- src/main/lib/system.ts (0.6 KB)
- src/main/lib/redact.ts (3.5 KB)
- src/main/lib/watermark.ts (4.8 KB)
- src/main/lib/terminalHelper.ts (6.3 KB)
- src/main/lib/svgSanitizer.ts (8.2 KB)
- src/main/lib/scrollCapture.ts (10.5 KB)
- src/main/lib/runtimeHelper.ts (12.7 KB)

### src/main/presenter/agentPresenter/acp/
- src/main/presenter/agentPresenter/acp/mcpTransportFilter.ts (0.6 KB)
- src/main/presenter/agentPresenter/acp/acpCapabilities.ts (0.7 KB)
- src/main/presenter/agentPresenter/acp/index.ts (1.1 KB)
- src/main/presenter/agentPresenter/acp/types.ts (1.5 KB)
- src/main/presenter/agentPresenter/acp/mcpConfigConverter.ts (1.6 KB)
- src/main/presenter/agentPresenter/acp/commandProcessTracker.ts (1.7 KB)
- src/main/presenter/agentPresenter/acp/acpSessionPersistence.ts (2.5 KB)
- src/main/presenter/agentPresenter/acp/acpMessageFormatter.ts (3.3 KB)
- src/main/presenter/agentPresenter/acp/acpFsHandler.ts (4.0 KB)
- src/main/presenter/agentPresenter/acp/acpTerminalManager.ts (6.7 KB)
- ... and 8 more

### src/main/presenter/
- src/main/presenter/notifactionPresenter.ts (2.2 KB)
- src/main/presenter/trayPresenter.ts (2.2 KB)
- src/main/presenter/proxyConfig.ts (6.2 KB)
- src/main/presenter/anthropicOAuth.ts (6.5 KB)
- src/main/presenter/githubCopilotOAuth.ts (8.2 KB)
- src/main/presenter/shortcutPresenter.ts (9.7 KB)
- src/main/presenter/index.ts (15.4 KB)
- src/main/presenter/oauthPresenter.ts (17.5 KB)
- src/main/presenter/githubCopilotDeviceFlow.ts (19.7 KB)
- src/main/presenter/tabPresenter.ts (35.7 KB)

## Run Hints

Build tool: `pnpm`

| Script | Command |
|--------|---------|
| test | `vitest` |
| build | `pnpm run typecheck && electron-vite build` |
| lint | `oxlint .` |
| dev | `cross-env VITE_ENABLE_PLAYGROUND=true electron-vite dev --watch` |
| start | `electron-vite preview` |
| typecheck | `pnpm run typecheck:node && pnpm run typecheck:web` |
| prebuild | `node scripts/fetch-provider-db.mjs` |
| preinstall | `npx only-allow pnpm` |
| test:main | `vitest --config vitest.config.ts test/main` |
| test:renderer | `vitest --config vitest.config.renderer.ts test/renderer` |
