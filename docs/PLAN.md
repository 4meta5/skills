# Skills CLI - Implementation Plan

Gaps identified in RESEARCH.md, organized for parallel subagent delegation.

**Rules:**
- Every task follows TDD (RED → GREEN → REFACTOR)
- After each wave, run `skills sync` to update external projects
- If sync fails, fix the CLI (no manual workarounds)

---

## Wave 1: High Priority (Parallel) ✓ COMPLETE

**Status:** All tasks complete, 637 tests passing, synced to external projects.

### Task 1.1: Exponential Backoff ✓

Add jitter and backoff to retry logic.

**File:** `src/middleware/backoff.ts`
**Test:** `src/middleware/backoff.test.ts`
**TDD:** Required
**Parallel:** Yes (with 1.2)
**Status:** Complete (13 tests)

```typescript
interface BackoffConfig {
  initialDelayMs: number;  // default 1000
  maxDelayMs: number;      // default 30000
  multiplier: number;      // default 2
  jitterMs: number;        // default 1000
}

function calculateDelay(attempt: number, config: BackoffConfig): number;
function shouldRetry(error: Error, attempt: number, max: number): boolean;
```

**Tests:**
- calculateDelay returns exponential values
- calculateDelay respects maxDelayMs cap
- calculateDelay adds jitter within range
- shouldRetry returns false for auth errors (401/403)
- shouldRetry returns true for 429/5xx

---

### Task 1.2: Enhanced Error Messages ✓

Improve rejection messages with specific details.

**File:** `src/middleware/error-messages.ts`
**Test:** `src/middleware/error-messages.test.ts`
**TDD:** Required
**Parallel:** Yes (with 1.1)
**Status:** Complete (9 tests)

```typescript
interface ValidationError {
  missingSkills: string[];
  foundSkills: string[];
  attemptNumber: number;
  maxAttempts: number;
}

function formatValidationError(error: ValidationError): string;
function formatRetryPrompt(error: ValidationError): string;
```

**Output format:**
```
VALIDATION FAILURE: Required skill invocation missing.

Missing: tdd, no-workarounds
Found: code-review
Attempt: 2/3

You MUST invoke:
- Skill(skill: "tdd")
- Skill(skill: "no-workarounds")
```

---

### Task 1.3: Sync Command Enhancement ✓

Fix sync to handle new skills (not just updates).

**File:** `src/commands/sync.ts`
**Test:** `src/commands/sync.test.ts`
**TDD:** Required
**Parallel:** Yes (with 1.1, 1.2)
**Status:** Complete (7 tests, includes bundled skill sync fix)

**Current behavior:** Only syncs skills that exist in target projects.
**Desired behavior:** Option to push new skills to tracked projects.

```typescript
interface SyncOptions {
  skillNames: string[];
  dryRun?: boolean;
  push?: boolean;  // NEW: install to projects that don't have it
}
```

**Tests:**
- sync --push installs skill to projects without it
- sync --push respects project's existing skills
- sync --push updates CLAUDE.md in target project

---

## Wave 1 Completion ✓

Completed 2026-01-29:

```bash
# 1. Run all tests
npm test -w @4meta5/skills-cli

# 2. Dogfood scan
./packages/skills-cli/bin/skills.js scan

# 3. Sync to external projects
./packages/skills-cli/bin/skills.js sync --all

# 4. Verify external projects updated
ls ~/OpenPawVet/web/.claude/skills/
ls ~/AG1337v2/BobaMatchSolutions/web/amarsingh.dev/.claude/skills/
```

**If sync fails:** BLOCKED. Fix the CLI using TDD, then retry.

---

## Wave 2: Medium Priority (Parallel) ✓ COMPLETE

**Status:** All tasks complete, 684 tests passing, synced to external projects.

### Task 2.1: Zod Schema Validation ✓

Add schema validation for tool call arguments.

**File:** `src/middleware/schema-validator.ts`
**Test:** `src/middleware/schema-validator.test.ts`
**TDD:** Required
**Parallel:** Yes (with 2.2)
**Depends:** Wave 1
**Status:** Complete (16 tests)

```typescript
import { z } from 'zod';

const SkillInvocationSchema = z.object({
  skill: z.string().min(1),
  args: z.string().optional(),
});

function validateToolCall(call: unknown): ValidationResult;
function formatSchemaError(error: z.ZodError): string;
```

**Tests:**
- Validates skill name is non-empty
- Rejects unknown fields
- Formats Zod errors as actionable messages

---

### Task 2.2: Skill Dependency Resolution ✓

Skills that depend on other skills.

**File:** `src/dependencies/resolver.ts`
**Test:** `src/dependencies/resolver.test.ts`
**TDD:** Required
**Parallel:** Yes (with 2.1)
**Depends:** Wave 1
**Status:** Complete (25 tests)

```typescript
interface SkillDependency {
  skillName: string;
  dependencies: string[];
}

function resolveDependencies(skill: string, installed: string[]): string[];
function detectMissingDependencies(skill: string, installed: string[]): string[];
```

SKILL.md extension:
```yaml
---
name: tdd
dependencies:
  - no-workarounds
---
```

**Tests:**
- Resolves transitive dependencies
- Detects missing dependencies on install
- Warns on remove if depended upon

---

### Task 2.3: Skill Conflict Detection ✓

Prevent conflicting skills.

**File:** `src/dependencies/conflicts.ts`
**Test:** `src/dependencies/conflicts.test.ts`
**TDD:** Required
**Parallel:** Yes (with 2.1, 2.2)
**Depends:** Wave 1
**Status:** Complete (6 tests)

```typescript
interface SkillConflict {
  skillName: string;
  conflicts: string[];
}

function detectConflicts(skill: string, installed: string[]): string[];
function blockInstallIfConflict(skill: string, installed: string[]): void;
```

SKILL.md extension:
```yaml
---
name: strict-tdd
conflicts:
  - loose-tdd
---
```

---

## Wave 2 Completion ✓

Completed 2026-01-29:

```bash
npm test -w @4meta5/skills-cli
./packages/skills-cli/bin/skills.js scan
./packages/skills-cli/bin/skills.js sync --all
```

---

## Wave 3: Low Priority (Sequential) ✓ COMPLETE

**Status:** All tasks complete, 732 tests passing, synced to external projects.

### Task 3.1: Dynamic Skill Evaluation Hook ✓

Read skills dynamically instead of hardcoded list.

**File:** `src/hooks/dynamic-eval.ts`
**Test:** `src/hooks/dynamic-eval.test.ts`
**TDD:** Required
**Depends:** Wave 2
**Status:** Complete (22 tests)

- Parse `.claude/skills/*/SKILL.md` at runtime
- Generate evaluation prompt from descriptions
- Cache parsed skills for performance

---

### Task 3.2: Structured Outputs Migration ✓

Replace regex with Claude structured outputs API.

**File:** `src/middleware/structured-detector.ts`
**Test:** `src/middleware/structured-detector.test.ts`
**TDD:** Required
**Depends:** Wave 2
**Status:** Complete (26 tests)

**Current:** Regex patterns to detect `Skill()` calls
**Desired:** Claude API with `anthropic-beta: structured-outputs-2025-11-13`

```typescript
const ToolCallSchema = z.object({
  action: z.enum(['invoke_skill', 'respond', 'request_info']),
  skill: z.string().optional(),
  response: z.string().optional(),
});
```

**Note:** Requires API key configuration.

---

## Wave 3 Completion ✓

Completed 2026-01-29:

```bash
npm test -w @4meta5/skills-cli  # 732 tests passing
./packages/skills-cli/bin/skills.js scan  # No new recommendations
./packages/skills-cli/bin/skills.js sync --all  # Synced 3521 projects
```

---

## Execution Graph

```
Wave 1 (Parallel):
┌───────┐  ┌───────┐  ┌───────┐
│  1.1  │  │  1.2  │  │  1.3  │
│Backoff│  │Errors │  │ Sync  │
└───┬───┘  └───┬───┘  └───┬───┘
    └──────────┼──────────┘
               ▼
         [Sync to projects]
               │
               ▼
Wave 2 (Parallel):
┌───────┐  ┌───────┐  ┌───────┐
│  2.1  │  │  2.2  │  │  2.3  │
│ Zod   │  │ Deps  │  │Conflict│
└───┬───┘  └───┬───┘  └───┬───┘
    └──────────┼──────────┘
               ▼
         [Sync to projects]
               │
               ▼
Wave 3 (Sequential):
┌───────┐
│  3.1  │
│Dynamic│
└───┬───┘
    │
    ▼
┌───────┐
│  3.2  │
│Struct │
└───┬───┘
    │
    ▼
         [Final sync]
```

---

## Subagent Delegation Format

For each task, spawn subagent with:

```
Task {N.M}: {Title}

TDD REQUIRED: RED → GREEN → REFACTOR

Files:
- Implementation: {path}
- Tests: {path}

Requirements:
{spec from above}

Commands:
- Test: npm test -w @4meta5/skills-cli -- --testNamePattern="{pattern}"

BLOCKED until Phase 1 (RED) shows failing test.
```

---

## External Project Sync

After each wave:

| Project | Path | Command |
|---------|------|---------|
| OpenPawVet | `~/OpenPawVet/web` | `skills sync --all` |
| amarsingh.dev | `~/AG1337v2/BobaMatchSolutions/web/amarsingh.dev` | `skills sync --all` |

**If sync fails:**
1. BLOCKED: FIX THE TOOL
2. Write failing test for the bug
3. Fix the CLI code
4. Verify sync works
5. Continue

---

## Success Metrics ✓ ALL COMPLETE

| Metric | Before | After Wave 3 |
|--------|--------|--------------|
| Tests | 599 | **732** |
| Retry has backoff | No | **Yes** |
| Error messages | Generic | **Detailed** |
| Sync pushes new skills | No | **Yes** |
| Schema validation | No | **Yes** |
| Structured outputs | No | **Yes** |
| Dynamic skill eval | No | **Yes** |
| Dependency resolution | No | **Yes** |
| Conflict detection | No | **Yes** |
