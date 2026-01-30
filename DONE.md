# Skills CLI - Implementation Status

**732 tests passing** | Phases 1-5 + Waves 1-3 complete

## Summary

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Usage Tracker | Complete | JSONL logging, `skills stats` |
| 2. Semantic Router | Complete | Keyword + embedding scoring |
| 3. Middleware | Complete | Corrective loop, MUST_CALL injection |
| 4. Sandbox | Complete | TDD state machine, policy enforcement |
| 5. Response Validation | Complete | Feedback loop, retry prompts |
| Wave 1 | Complete | Backoff, error messages, sync --push |
| Wave 2 | Complete | Zod validation, dependencies, conflicts |
| Wave 3 | Complete | Dynamic eval, structured outputs |

---

## Phase 4: Permission Sandbox

TDD-specific sandbox with policy-based enforcement.

**Components:**
- `sandbox/types.ts` - TDDPhase enum, SandboxPolicy, SandboxConfig
- `sandbox/loader.ts` - Parse sandbox config from SKILL.md frontmatter
- `sandbox/isolate.ts` - Command/write checking against policies
- `sandbox/state-machine.ts` - XState machine for BLOCKED → RED → GREEN → COMPLETE

**State Transitions:**
```
BLOCKED --[TEST_WRITTEN]--> RED
RED --[TEST_PASSED]--> GREEN
GREEN --[REFACTOR_DONE]--> COMPLETE
COMPLETE --[NEW_FEATURE]--> BLOCKED
```

**Tests:** 127 passing (types, loader, isolate, state-machine)

---

## Phase 5: Response Validation

Validates Claude responses for required skill calls.

**Components:**
- `middleware/response-validator.ts` - Detect missing skills, generate retry prompts
- `hooks/feedback-loop.ts` - TypeScript validation logic
- `hooks/feedback-loop.sh` - Shell hook for CLI usage

**Exit Codes:**
| Code | Meaning |
|------|---------|
| 0 | Response compliant |
| 1 | Non-compliant, retry prompt on stdout |
| 2 | Error (invalid input) |

**Tests:** 41 passing (response-validator, feedback-loop)

---

## Phase 1: Usage Tracker

JSONL event logging to `~/.claude/usage.jsonl`.

**Events:** prompt_submitted, skill_activated, session_start

**Commands:**
```bash
skills stats              # View all statistics
skills stats --skill tdd  # Filter by skill
skills stats --since 7d   # Filter by time
```

---

## Phase 2: Semantic Router

Iris architecture: keyword (30%) + embedding (70%) scoring.

| Mode | Score | Behavior |
|------|-------|----------|
| IMMEDIATE | > 0.85 | Force activation via MUST_CALL |
| SUGGESTION | 0.70-0.85 | Recommend via CONSIDER_CALLING |
| CHAT | < 0.70 | No activation |

**Stack:** transformers.js, Xenova/all-MiniLM-L6-v2, 384-dim embeddings

---

## Phase 3: Middleware

Corrective loop with configurable retries.

**Flow:**
1. Tool detection (regex-based Skill() parsing)
2. Request enhancement (MUST_CALL injection)
3. Response validation (accept/reject)
4. Retry orchestration (escalating prompts)

---

## Commands

| Command | Description |
|---------|-------------|
| `skills scan` | Analyze project, recommend skills |
| `skills scan --all` | Install all HIGH confidence |
| `skills list` | List skills from all sources |
| `skills add <names>` | Install skills to project |
| `skills remove <names>` | Remove skills from project |
| `skills sync` | Sync skills to tracked projects |
| `skills sync --push` | Push skills to all tracked projects |
| `skills stats` | Display usage statistics |
| `skills embed` | Generate skill embeddings |
| `skills evaluate <prompt>` | Test routing for a prompt |

---

## E2E Integration

Full workflow test at `src/e2e/workflow.test.ts`.

**Coverage:**
- Load sandbox policy from SKILL.md
- TDD phase transitions
- Command/write policy checking
- Response validation with mock responses
- Feedback loop hook execution

**Tests:** 17 passing

---

## Wave 1: Retry Improvements

Exponential backoff, enhanced error messages, and sync --push.

**Components:**
- `middleware/backoff.ts` - Exponential backoff with jitter
- `middleware/error-messages.ts` - Detailed validation failure messages
- `commands/sync.ts` - Added --push flag for new skill installation

**Backoff Config:**
```typescript
interface BackoffConfig {
  initialDelayMs: number;  // default 1000
  maxDelayMs: number;      // default 30000
  multiplier: number;      // default 2
  jitterMs: number;        // default 1000
}
```

**Tests:** 38 passing (backoff, error-messages, sync)

---

## Wave 2: Schema & Dependencies

Zod schema validation and skill dependency/conflict resolution.

**Components:**
- `middleware/schema-validator.ts` - Zod-based tool call validation
- `dependencies/resolver.ts` - Transitive dependency resolution
- `dependencies/conflicts.ts` - Skill conflict detection

**Dependency Resolution:**
```typescript
// Resolves A → B → C as [C, B] (installation order)
resolveDependencies('tdd', installed, graph);
detectMissingDependencies('tdd', installed, graph);
getDependentsOf('no-workarounds', graph);
```

**Conflict Detection:**
```typescript
// Blocks install if conflicts exist
detectConflicts('strict-tdd', ['loose-tdd'], skillsDir);
blockInstallIfConflict('strict-tdd', installed, skillsDir);
```

**Tests:** 47 passing (schema-validator, resolver, conflicts)

---

## Wave 3: Dynamic Evaluation

Dynamic skill loading and structured output detection.

**Components:**
- `hooks/dynamic-eval.ts` - Runtime skill loading with caching
- `middleware/structured-detector.ts` - Zod-based tool call detection

**Dynamic Evaluation:**
```typescript
loadSkillsForEvaluation({ skillsDir: '.claude/skills' });
generateEvaluationPrompt(skills);
getCachedSkills(config);  // TTL-based caching
```

**Structured Detection:**
```typescript
parseStructuredResponse(jsonResponse);
detectSkillInvocations(actions);
isValidToolCall(action);
```

**Tests:** 48 passing (dynamic-eval, structured-detector)

---

## Test Summary

| Area | Tests |
|------|-------|
| Sandbox (types, loader, isolate, state-machine) | 127 |
| Response Validation | 21 |
| Feedback Loop | 20 |
| E2E Workflow | 17 |
| Router | 54 |
| Middleware (incl. backoff, error-messages, schema, structured) | 111 |
| Dependencies (resolver, conflicts) | 31 |
| Hooks (incl. dynamic-eval) | 42 |
| Tracker | 19 |
| Commands (incl. sync --push) | 60+ |
| Other | 250 |
| **Total** | **732** |
