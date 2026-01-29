# Skills CLI - Implementation Plan

Tasks for Claude Code parallel subagent delegation.
TDD enforced: every implementation task requires RED phase first.

---

## Phase 4: Permission Sandbox (NOT STARTED)

Permission-based enforcement for workflow skills (tdd, no-workarounds).

### Task 4.1: Sandbox Policy Types
Define TypeScript types for sandbox policies.

- **File:** `src/sandbox/types.ts`
- **Test:** `src/sandbox/policy.test.ts`
- **TDD:** Required
- **Parallel:** Yes (with 4.2)

```typescript
interface SandboxPolicy {
  name: string;
  allowCommands: string[];
  denyCommands: string[];
  allowWrite: string[];  // glob patterns
  denyWrite: string[];
}

type WorkflowState = 'BLOCKED' | 'RED' | 'GREEN' | 'COMPLETE';
```

### Task 4.2: Policy Loader
Parse sandbox config from SKILL.md frontmatter.

- **File:** `src/sandbox/loader.ts`
- **Test:** `src/sandbox/loader.test.ts`
- **TDD:** Required
- **Parallel:** Yes (with 4.1)

Frontmatter extension:
```yaml
---
name: tdd
sandbox:
  state: BLOCKED
  profiles:
    BLOCKED:
      allowCommands: ["git status", "npm test"]
      allowWrite: ["**/*.test.ts", "**/*.spec.ts"]
    GREEN:
      allowCommands: ["*"]
      allowWrite: ["**/*"]
---
```

### Task 4.3: isolated-vm Integration
Create sandbox context from policy.

- **File:** `src/sandbox/isolate.ts`
- **Test:** `src/sandbox/isolate.test.ts`
- **TDD:** Required
- **Depends:** 4.1
- **Parallel:** No

Key functions:
- `createIsolate(policy: SandboxPolicy): Isolate`
- `executeInSandbox(code: string, context: object): Promise<any>`

### Task 4.4: Permission State Machine
Manage workflow state transitions.

- **File:** `src/sandbox/state-machine.ts`
- **Test:** `src/sandbox/state-machine.test.ts`
- **TDD:** Required
- **Depends:** 4.1, 4.3
- **Parallel:** No

States and transitions:
```
BLOCKED --[test written]--> RED
RED --[test passes]--> GREEN
GREEN --[refactor done]--> COMPLETE
COMPLETE --[new feature]--> BLOCKED
```

---

## Phase 5: Response Validation

Close the response interception gap.

### Task 5.1: API Research (No TDD)
Investigate MCP response interception options.

- **Output:** Update RESEARCH.md with findings
- **TDD:** Not required (research only)
- **Parallel:** Yes

Questions to answer:
1. Can MCP servers intercept client responses?
2. What hooks does Claude Code expose post-response?
3. Is there an SDK pattern for response middleware?

### Task 5.2: Response Validator Hook
Validate Skill() calls in Claude responses.

- **File:** `src/middleware/response-validator.ts`
- **Test:** `src/middleware/response-validator.test.ts`
- **TDD:** Required
- **Depends:** 5.1

Extend existing middleware:
```typescript
interface ResponseValidation {
  hasRequiredSkillCalls: boolean;
  missingSkills: string[];
  extraneousCalls: string[];
  suggestedRetryPrompt?: string;
}
```

### Task 5.3: Feedback Loop Hook
Generate retry message on non-compliance.

- **File:** `src/hooks/feedback-loop.sh`
- **Test:** `src/hooks/feedback-loop.test.ts`
- **TDD:** Required
- **Depends:** 5.2

Hook behavior:
1. Read response from stdin (if supported)
2. Validate against expected skill calls
3. Output retry prompt if non-compliant

---

## Integration Tasks

### Task I.1: OpenPawVet Integration
End-to-end validation with real project.

- **Location:** `~/OpenPawVet/web`
- **TDD:** Not required (integration test)
- **Parallel:** Yes

Steps:
1. Run `skills scan` in OpenPawVet
2. Install recommended skills
3. Track 5 Claude Code sessions
4. Generate activation rate report
5. Document findings in RESEARCH.md

### Task I.2: E2E Workflow Test
Complete flow validation.

- **File:** `src/e2e/workflow.test.ts`
- **TDD:** Required
- **Depends:** Phase 4 complete

Test flow:
```
prompt -> router -> middleware -> [mock Claude] -> validation -> retry
```

---

## Parallel Execution Graph

```
Phase 4:
┌───────┐  ┌───────┐
│  4.1  │  │  4.2  │  (parallel)
└───┬───┘  └───┬───┘
    │          │
    └────┬─────┘
         ▼
    ┌─────────┐
    │   4.3   │
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │   4.4   │
    └─────────┘

Phase 5:
┌───────┐
│  5.1  │  (research, parallel with 4.x)
└───┬───┘
    │
    ▼
┌───────┐
│  5.2  │
└───┬───┘
    │
    ▼
┌───────┐
│  5.3  │
└───────┘

Integration:
┌───────┐  ┌───────┐
│  I.1  │  │  I.2  │  (I.2 depends on Phase 4)
└───────┘  └───────┘
```

---

## TDD Enforcement

Every task marked "TDD Required":

1. **RED:** Write failing test first
2. **GREEN:** Implement minimal code to pass
3. **REFACTOR:** Clean up, tests still pass

**BLOCKED if RED phase skipped.**

Example workflow:
```bash
# 1. Write test
vim src/sandbox/policy.test.ts

# 2. Run test (must fail)
npm test -w @anthropic/skills-cli -- src/sandbox/policy.test.ts
# Expected: FAIL

# 3. Implement
vim src/sandbox/types.ts

# 4. Run test (must pass)
npm test -w @anthropic/skills-cli -- src/sandbox/policy.test.ts
# Expected: PASS

# 5. Refactor if needed
```

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Blocking skill activation | ~50% | >90% |
| Reference skill activation | ~80% | >85% |
| Router latency | ~50ms | <100ms |
| Test count | 392 | >450 |

---

## Medium Priority (Future)

### Skill Dependency Resolution
Skills that depend on other skills.

- Add `dependencies` field to SKILL.md
- Resolve on `skills add`
- Warn on `skills remove` if depended upon

### Skill Conflict Detection
Prevent conflicting skills.

- Add `conflicts` field to SKILL.md
- Block install if conflict exists
- `skills scan` excludes conflicting recommendations

### Dynamic skill-forced-eval Hook
Read skills dynamically instead of hardcoded list.

- Parse `.claude/skills/*/SKILL.md` at runtime
- Generate evaluation prompt from descriptions

---

## Low Priority (Backlog)

- `skills create <name>` - Scaffold new skill
- `skills validate [path]` - Validate SKILL.md format
- Remote skill registry - Central discovery mechanism
- Skill auto-update - Check for updates on scan
