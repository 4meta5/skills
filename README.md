# Skills CLI

A CLI tool for discovering, managing, and enforcing Claude Code skills.

## Installation

```bash
# From this repository (development)
npm install
npm run build -w @anthropic/skills-cli

# Run via bin
./packages/skills-cli/bin/skills.js --help
```

## Features

### Core Commands

| Command | Description |
|---------|-------------|
| `skills list` | List available skills from bundled/curated/registered sources |
| `skills show <name>` | Show skill details and content |
| `skills add <names...>` | Add skills to current project |
| `skills remove <names...>` | Remove skills from current project |
| `skills scan` | Analyze project and recommend skills |
| `skills init [path]` | Initialize project with skills |
| `skills sync` | Sync skills to all tracked projects |
| `skills stats` | Show skill usage statistics |
| `skills claudemd` | Manage CLAUDE.md skill references |
| `skills hook` | Manage Claude Code hooks |
| `skills projects` | Manage tracked project installations |

### Semantic Router (Phase 2)

The semantic router determines skill activation based on user prompts using:

1. **Keyword matching** - Fast regex patterns for known triggers
2. **Embedding similarity** - Local embeddings via transformers.js (Xenova/all-MiniLM-L6-v2)
3. **Combined scoring** - Weighted combination (30% keyword, 70% embedding)

**Activation Modes:**
- `IMMEDIATE` (score > 0.85): Force skill activation
- `SUGGESTION` (0.70-0.85): Recommend skills
- `CHAT` (< 0.70): No activation

**Files:**
- `src/router/router.ts` - Core routing logic
- `src/router/embeddings.ts` - Embedding generation and similarity
- `src/router/activate.ts` - Hook activation script
- `src/router/types.ts` - Type definitions
- `data/vector_store.json` - Pre-computed skill embeddings

### Middleware / Corrective Loop (Phase 3)

Enforcement middleware for skill activation compliance:

1. **Tool Detection** - Parses Claude responses to find `Skill()` calls
2. **Request Enhancement** - Injects MUST_CALL instructions for immediate mode
3. **Response Validation** - Accepts/rejects based on required tool calls
4. **Retry Logic** - Configurable retries with escalating prompts

**Files:**
- `src/middleware/types.ts` - Type definitions
- `src/middleware/middleware.ts` - Core middleware (detectToolCalls, createMiddleware)
- `src/middleware/corrective-loop.ts` - Retry orchestration (createCorrectiveLoop)
- `src/middleware/index.ts` - Module exports

**Usage:**
```typescript
import { createCorrectiveLoop } from '@anthropic/skills-cli/middleware';

const loop = createCorrectiveLoop({ maxRetries: 3 });
loop.initializeFromRouting(routingResult);

const result = await loop.processResponse(claudeResponse);
if (!result.accepted && loop.shouldRetry()) {
  const retryPrompt = loop.getRetryPrompt(originalPrompt, result.reason);
  // Send retryPrompt to Claude...
}
```

### Hooks

Pre-built hooks for Claude Code integration:

| Hook | Purpose |
|------|---------|
| `semantic-router` | Routes prompts to skills via embeddings |
| `skill-forced-eval` | Forces 3-step activation sequence |
| `usage-tracker` | Logs skill activation events |

**Install hooks:**
```bash
skills hook add semantic-router
skills hook add skill-forced-eval
skills hook add usage-tracker
skills hook list
```

### Usage Tracking (Phase 1)

Tracks skill activations for analytics:

```bash
# View statistics
skills stats

# Output includes:
# - Total activations by skill
# - Activation frequency over time
# - Mode distribution (immediate/suggestion/chat)
```

**Files:**
- `src/tracker/tracker.ts` - JSONL event logging
- `src/commands/stats.ts` - Statistics display

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SKILLS_VECTOR_STORE` | auto-detect | Path to vector_store.json |
| `SKILLS_IMMEDIATE_THRESHOLD` | 0.85 | Threshold for immediate activation |
| `SKILLS_SUGGESTION_THRESHOLD` | 0.70 | Threshold for suggestion mode |
| `SKILLS_OUTPUT_JSON` | false | Output JSON for middleware integration |

### Settings Files

- `~/.config/skills-cli/config.json` - Global configuration
- `~/.config/skills-cli/sources.json` - Registered skill sources
- `~/.config/skills-cli/installed.json` - Installed skills tracking
- `.claude/settings.local.json` - Project hook configuration

## Architecture

```
User Prompt
    ↓
[Semantic Router Hook] → Determines mode + required skills
    ↓
[Prompt Enhancement] → Injects MUST_CALL/CONSIDER_CALLING
    ↓
Claude generates response
    ↓
[Middleware (programmatic)] → Validates Skill() calls
    ├── Accepted → Pass through
    └── Rejected → Retry with enhanced prompt
```

## Testing

```bash
# Run all tests
npm test -w @anthropic/skills-cli

# Run specific test files
npx vitest run src/middleware/
npx vitest run src/router/

# Test counts:
# - middleware/middleware.test.ts: 19 tests
# - middleware/corrective-loop.test.ts: 15 tests
# - middleware/integration.test.ts: 13 tests
# - router/router.test.ts: 16 tests
# - router/embeddings.test.ts: 17 tests
# - router/activate.test.ts: 8 tests
# Total: 346 tests
```

## Development

```bash
# Build
npm run build -w @anthropic/skills-cli

# Watch mode
npm run dev -w @anthropic/skills-cli

# Dogfood (use the tool you're building)
./packages/skills-cli/bin/skills.js scan
./packages/skills-cli/bin/skills.js scan --all
```

## Known Limitations

1. **Middleware is programmatic only** - The corrective loop middleware provides APIs for response validation but is not automatically integrated into Claude Code's response pipeline. The hooks can inject prompts but cannot intercept responses.

2. **Vector store requires manual generation** - No CLI command exists to generate embeddings. The `data/vector_store.json` was created manually.

3. **skill-forced-eval hook is hardcoded** - The hook evaluates a fixed list of skills (tdd, no-workarounds, dogfood-skills) rather than dynamically reading installed skills.

See `PLAN.md` for detailed TODOs addressing these limitations.
