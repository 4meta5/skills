# Integration Analysis: 4-Layer Architecture

**Date:** 2026-01-31
**Status:** Analysis for discussion

## Current State

### Layer 1: Semantic Router (`packages/cli/src/router/`)
- Keyword matching (30% weight) + embedding similarity (70% weight)
- Three activation modes: `immediate` (>0.85), `suggestion` (0.70-0.85), `chat` (<0.70)
- **Status:** Implemented, tested

### Layer 2: Skill Router/Middleware (`packages/cli/src/middleware/`)
- Detects `Skill()` calls in responses
- Injects requirements: `[MUST_CALL: Skill(X)]` for immediate mode
- Corrective loop with exponential backoff
- **Status:** Implemented, tested

### Layer 3: Permission Sandbox/Chain (`packages/chain/`)
- Capability-based skill resolution (DAG)
- Tool blocking via PreToolUse hook
- Session state persistence
- Profile auto-selection from prompt
- **Status:** Phases 0-4 complete, 212 tests

### Layer 4: Usage Tracker
- JSONL logging exists
- `skills stats` command
- **Status:** Partial

### OpenClaw Hook Infrastructure (`openclaw-source/src/hooks/`, `src/plugins/`)
- Event-driven: `command`, `session`, `agent`, `gateway` events
- Priority-based execution (system > user > default)
- Plugin hooks with typed events: `BeforeToolCall`, `AfterToolCall`, etc.
- Fault isolation per-hook

---

## The Gap: Layers Are Disconnected

```
Current:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Router     │     │ Middleware  │     │   Chain     │
│  (detect)   │     │ (enforce    │     │ (block      │
│             │     │  Skill()    │     │  tools)     │
│             │     │  calls)     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      ↓                   ↓                   ↓
  determines          rejects if         blocks tools
  mode                Skill() not        until caps
                      called             satisfied

  NOT CONNECTED - they don't talk to each other
```

**Problems:**
1. Router determines `immediate` mode but chain doesn't use it
2. Middleware enforces `Skill()` calls but chain blocks tool intents
3. No unified session state between layers
4. Skills can be skipped if only one layer is active

---

## Integration Options

### Option A: Middleware Calls Chain

```
Router → Middleware → Chain

Flow:
1. Router scores prompt → determines mode
2. If immediate: Middleware injects [MUST_CALL]
3. If Skill() detected: Middleware calls chain activate
4. Chain starts blocking tools until workflow complete
```

**Pros:** Keeps layers separate, clear responsibility
**Cons:** Multiple hops, chain only activates after first Skill() call

### Option B: Chain Consumes Router Directly

```
Router → Chain (with middleware built-in)

Flow:
1. Router scores prompt → determines profile
2. Chain auto-activates profile based on router output
3. Chain handles both blocking AND skill enforcement
```

**Pros:** Unified, simpler mental model
**Cons:** Chain becomes larger, more complex

### Option C: Event Bus (OpenClaw-style)

```
Events:
  prompt:received → Router emits skill:matched
  skill:matched → Chain activates profile
  tool:requested → Chain checks permissions
  skill:invoked → Chain updates state
```

**Pros:** Decoupled, extensible, matches OpenClaw patterns
**Cons:** More infrastructure, coordination complexity

---

## Making All Skills Blocking

**Goal:** Skills shouldn't be ignorable guidance. They should enforce their requirements.

### Current Reality

| Skill Type | Current Enforcement | Ignored Rate |
|------------|---------------------|--------------|
| Workflow (tdd, no-workarounds) | Tool blocking via chain | ~5% |
| Reference (suggest-tests) | Just guidance | ~50% |

### Approach: Turn Every Skill Into a Workflow

1. Every skill defines `capabilities_required` (even if just `skill_acknowledged`)
2. Every skill defines `tool_policy.deny_until`
3. Chain enforces: can't proceed until skill requirements met

**Example for suggest-tests (currently reference):**

```yaml
# Before: just guidance, often ignored
- name: suggest-tests
  provides: [test_recommendations]
  requires: []
  tool_policy: {}  # Nothing enforced

# After: blocking until acknowledged
- name: suggest-tests
  provides: [test_recommendations]
  requires: []
  tool_policy:
    deny_until:
      write:
        until: test_recommendations
        reason: "Review test suggestions before implementation"
```

**Problem:** This blocks ALL writes until capability satisfied. Need smarter blocking.

---

## Language-Agnostic Path Filtering

**Current problem:** TDD blocks "write" but can't distinguish test files from impl files.

**Requirement:** Filter by file path pattern, but don't hardcode language (`.test.ts` is TypeScript-specific).

### Option 1: Configurable Path Patterns

```yaml
tool_policy:
  deny_until:
    write:
      until: test_written
      reason: "Write test first"
      except_patterns:
        - "**/*.test.*"
        - "**/*.spec.*"
        - "**/test/**"
        - "**/tests/**"
        - "**/__tests__/**"
```

**Pros:** Covers most languages
**Cons:** Still somewhat hardcoded

### Option 2: Capability-Based File Classification

```yaml
# The skill declares what file types it produces
- name: tdd
  provides: [test_written]
  artifacts:
    test_file:
      type: file_exists
      patterns:
        - "**/*.test.*"
        - "**/*.spec.*"
        - "**/test_*"
        - "**/tests/**"
```

Chain uses artifact patterns to determine if a write is "test-related" vs "impl-related".

**Pros:** Skill defines its own patterns, language-agnostic
**Cons:** More complex artifact schema

### Option 3: Intent Subdivision

```
Intents:
  write_test → allowed in RED phase
  write_impl → blocked in RED phase
  write_docs → always allowed

Intent detection:
  Write to *.test.* → write_test
  Write to *.spec.* → write_test
  Write to **/test/** → write_test
  Write to src/** → write_impl
  Write to docs/** → write_docs
```

**Pros:** Clean separation of intents
**Cons:** Pattern detection still needed

---

## MCP vs Plugins vs Hooks

### MCP (Model Context Protocol)

**What:** Standard protocol for LLM tool integration. Skills could be MCP resources.

**Pros:**
- Industry standard
- Works across LLM providers
- Tooling ecosystem

**Cons:**
- Requires MCP server
- More infrastructure
- Overhead for simple skills

**Best for:** Tools that need external state, APIs, complex logic

### OpenClaw Plugins

**What:** Plugin packages with hooks for lifecycle events.

**Pros:**
- Full control over agent behavior
- Typed events (BeforeToolCall, AfterToolCall)
- Priority ordering
- Fault isolation

**Cons:**
- OpenClaw-specific
- Requires plugin packaging

**Best for:** Deep integration, custom enforcement logic

### Claude Code Hooks

**What:** Shell scripts run on PreToolUse, PostToolUse, Stop events.

**Pros:**
- Simple (just shell scripts)
- Works with vanilla Claude Code
- Can call chain CLI

**Cons:**
- Limited to exit code + stdout/stderr
- No typed events
- Harder to share state

**Best for:** Simple enforcement, portability

### Recommendation

Use layered approach:
1. **Claude Code hooks** for broad compatibility (chain CLI)
2. **OpenClaw plugins** when available (deeper integration)
3. **MCP** for external tool integration (future)

---

## Open Questions

1. **How should router results flow to chain?** Direct call? Event? Shared state?

2. **Should all skills block, or only workflow skills?** Blocking everything might be too aggressive.

3. **How to handle multi-language projects?** Test patterns differ by language.

4. **What's the right granularity for blocking?** Per-file? Per-intent? Per-capability?

5. **Should enforcement happen at prompt time or tool time?** Prompt injection vs tool blocking.

---

## Next Steps (Proposal)

1. **Design integration protocol** - How layers communicate
2. **Implement path-aware intent mapping** - Language-agnostic patterns
3. **Add blocking to reference skills** - Configurable per-skill
4. **Test with real project** - Dogfood on this repo
5. **Document architecture** - Update root README

---

## References

- RESEARCH.md - SOTA analysis
- OpenClaw hooks: `/src/hooks/`, `/src/plugins/`
- Chain package: `packages/chain/`
- CLI router: `packages/cli/src/router/`
- CLI middleware: `packages/cli/src/middleware/`
