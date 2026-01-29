# Skills CLI - Implementation Status

**392 tests passing** | Phases 1-3 complete | Phase 4 (Sandbox) not started

## Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Usage Tracker | COMPLETE | JSONL logging, `skills stats` |
| 2. Semantic Router | COMPLETE | Keyword + embedding scoring, hook activation |
| 3. Middleware | COMPLETE | Corrective loop, MUST_CALL injection |
| 4. Sandbox | NOT STARTED | Permission-based enforcement |

---

## Phase 1: Usage Tracker

JSONL event logging to `~/.claude/usage.jsonl`.

**Events captured:**
- `prompt_submitted` - User prompt with timestamp
- `skill_activated` - Skill invocation with mode (immediate/suggestion)
- `session_start` - Session initialization

**Files:**
- `src/tracker/tracker.ts` - Event logging
- `src/tracker/types.ts` - Type definitions
- `src/commands/stats.ts` - Statistics display

**Commands:**
```bash
skills stats              # View all statistics
skills stats --skill tdd  # Filter by skill
skills stats --since 7d   # Filter by time
```

---

## Phase 2: Semantic Router

"Iris" architecture: keyword (30%) + embedding (70%) scoring.

**Activation modes:**

| Mode | Score | Behavior |
|------|-------|----------|
| IMMEDIATE | > 0.85 | Force skill activation via MUST_CALL |
| SUGGESTION | 0.70-0.85 | Recommend skills via CONSIDER_CALLING |
| CHAT | < 0.70 | No activation |

**Technical stack:**
- transformers.js with Xenova/all-MiniLM-L6-v2
- 384-dimension embeddings
- Cosine similarity via dot product

**Files:**
- `src/router/router.ts` - Routing logic (keyword + embedding scoring)
- `src/router/embeddings.ts` - Local embedding generation
- `src/router/activate.ts` - Hook activation script with JSON output
- `src/router/types.ts` - Type definitions
- `data/vector_store.json` - Pre-computed embeddings (13 skills)

**Commands:**
```bash
skills embed              # Generate embeddings for installed skills
skills evaluate <prompt>  # Test routing for a prompt
```

**Tests:** 38+ passing (router.test.ts, embeddings.test.ts, activate.test.ts)

---

## Phase 3: Middleware

Corrective loop with configurable retries.

**Components:**
1. **Tool Detection** - Regex-based `Skill()` call detection
2. **Request Enhancement** - MUST_CALL injection for immediate mode
3. **Response Validation** - Accept/reject based on required calls
4. **Retry Orchestration** - Escalating prompts up to max retries

**Files:**
- `src/middleware/middleware.ts` - Core functions (detectToolCalls, processResponse)
- `src/middleware/corrective-loop.ts` - createCorrectiveLoop factory
- `src/middleware/hooks.ts` - Hookable integration
- `src/middleware/types.ts` - Type definitions

**API usage:**
```typescript
import { createCorrectiveLoop } from '@anthropic/skills-cli/middleware';

const loop = createCorrectiveLoop({ maxRetries: 3 });
loop.initializeFromRouting(routingResult);

const result = await loop.processResponse(response);
if (!result.accepted && loop.shouldRetry()) {
  const retry = loop.getRetryPrompt(original, result.reason);
}
```

**Tests:** 47+ passing (middleware.test.ts, corrective-loop.test.ts, integration.test.ts, hooks.test.ts)

---

## Commands (16 total)

| Command | Status | Description |
|---------|--------|-------------|
| `skills list` | Working | List skills from all sources |
| `skills show <name>` | Working | Display skill details |
| `skills add <names...>` | Working | Install skills to project |
| `skills remove <names...>` | Working | Remove skills from project |
| `skills scan` | Working | Analyze project, recommend skills |
| `skills scan --all` | Working | Install all HIGH confidence |
| `skills init [path]` | Working | Initialize project with skills |
| `skills sync` | Working | Sync skills to tracked projects |
| `skills stats` | Working | Display usage statistics |
| `skills claudemd` | Working | Manage CLAUDE.md skill references |
| `skills hook list` | Working | List installed hooks |
| `skills hook add <name>` | Working | Install a hook |
| `skills hook remove <name>` | Working | Remove a hook |
| `skills projects` | Working | Manage tracked projects |
| `skills embed` | Working | Generate skill embeddings |
| `skills evaluate <prompt>` | Working | Test routing for a prompt |

---

## Architecture

```
User Prompt
    │
    ▼
┌─────────────────────────────┐
│ SEMANTIC ROUTER (Hook)      │
│                             │
│ 1. Keyword match (30%)      │
│ 2. Embedding sim (70%)      │
│ 3. Combined score           │
│                             │
│ Output: mode + skills       │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ MIDDLEWARE (Programmatic)   │
│                             │
│ If IMMEDIATE:               │
│   Inject MUST_CALL          │
│                             │
│ If SUGGESTION:              │
│   Inject CONSIDER_CALLING   │
└─────────────────────────────┘
    │
    ▼
Claude Code generates response
    │
    ▼
┌─────────────────────────────┐
│ RESPONSE VALIDATION         │
│ (API integration only)      │
│                             │
│ detectToolCalls()           │
│ processResponse()           │
│ shouldRetry()               │
└─────────────────────────────┘
```

---

## Known Gaps

### Response Interception (Architectural)
Hooks can inject prompts but cannot block/reject responses. The middleware provides validation APIs, but integration requires:
- MCP Server wrapper (intercepts API calls), or
- Claude Code ResponseReceived hook (feature request), or
- Direct Agent SDK integration

### Dynamic Skill Evaluation
The `skill-forced-eval` hook evaluates a hardcoded list of skills. Dynamic reading of installed skills would require parsing SKILL.md files at runtime.

### Phase 4 Not Started
Permission-based sandbox using isolated-vm and ceLLMate-style policies remains unimplemented.

---

## Test Summary

| Area | Tests | File |
|------|-------|------|
| Router | 16 | router.test.ts |
| Embeddings | 17 | embeddings.test.ts |
| Activate | 8 | activate.test.ts |
| Middleware | 19 | middleware.test.ts |
| Corrective Loop | 15 | corrective-loop.test.ts |
| Integration | 13 | integration.test.ts |
| Hooks | 4 | hooks.test.ts |
| Tracker | 11 | tracker.test.ts |
| Stats | 8 | stats.test.ts |
| Other | 281 | Various |
| **Total** | **392** | |

Run tests:
```bash
npm test -w @anthropic/skills-cli
```
