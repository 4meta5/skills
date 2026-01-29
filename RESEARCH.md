# Skills Auto-Activation Research

Consolidated research on reliable skill activation for Claude Code.

**Date:** 2026-01-29
**Status:** Research Complete

---

## Executive Summary

**Problem:** Claude ignores skills ~50% of the time without enforcement. The current system relies on LLM reasoning to decide skill usage, which is inherently non-deterministic.

**Solution:** Layered architecture shifting control upstream (Router) and downstream (Middleware + Sandbox).

**Key insight:**
> The LLM should not decide IF it uses a tool; it should only populate PARAMETERS of a tool the system decided must be used.

This is the Auto-Detection -> Auto-Activation shift.

---

## SOTA 2025-2026

### AgentSpec (ICSE 2026)
- 90%+ unsafe execution prevention
- Millisecond overhead
- DSL for runtime constraints
- Source: https://arxiv.org/abs/2503.18666

### vLLM Iris (Jan 2026)
Semantic router with 6 signal types:

| Signal | Purpose |
|--------|---------|
| Domain | Broad category classification |
| Keyword | Fast regex matching (hard overrides) |
| Embedding | Semantic similarity |
| Factual | Grounding requirements |
| Feedback | User history |
| Preference | Personalization |

Key innovation: Plugin chain architecture. Keyword signals can short-circuit embedding checks.

- Source: https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html

### Moltbot EnforcementHooks

Patterns worth adopting:

| Pattern | Description |
|---------|-------------|
| Two-tier hooks | Plugin + internal, with priority |
| Eligibility checking | OS, bins, env, config requirements |
| Priority execution | System (100) > User (50) > Default (0) |
| Fault isolation | Errors caught per-hook, don't block others |
| Layered discovery | workspace > managed > bundled > extra |

---

## Scalability Analysis

### TypeScript Limits (Current)

| Skills | Latency | Status |
|--------|---------|--------|
| <50 | ~50ms | Works well |
| 50-100 | ~100ms | Noticeable, acceptable |
| 100-200 | ~200ms | Needs optimization |
| >200 | Degraded | Architectural change needed |

Current approach: transformers.js with WASM, Xenova/all-MiniLM-L6-v2 (384-dim).

### Rust Potential

- Native SIMD for dot product: 10x faster
- Parallel similarity via Rayon
- 200+ skills at <50ms feasible

### When to Switch to Rust

1. >100 skills in enforcement mode
2. Sub-50ms latency required
3. Embedding bottleneck proven (not assumed)

**Recommendation:** Defer until proven useful. Current TS approach handles expected scale.

---

## Architecture

### Recommended Stack (2026)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Router | Iris-style multi-signal | Keyword + embedding detection |
| State | XState | Workflow state machine |
| Middleware | hookable | Async interception |
| Sandbox | isolated-vm | Code isolation (NOT vm2) |
| Schema | Zod | Structured output validation |

### Why Not vm2

CVE-2023-XXXX series proved proxy-based architecture fundamentally insecure against prototype pollution. As of 2026, vm2 is dead technology. isolated-vm uses native V8 Isolate API with hard memory boundaries.

### Layer Architecture

```
USER PROMPT
    │
    ▼
┌─────────────────────────────────────┐
│ LAYER 1: SEMANTIC ROUTER            │
│                                     │
│ Input: 20+ installed skills         │
│ Method: Keyword (30%) + Embed (70%) │
│ Output: 3-5 relevant + enforcement  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ LAYER 2: SKILL ROUTER               │
│                                     │
│ Decisions:                          │
│   INVOKE: Inject Skill() directly   │
│   SUGGEST: Add CONSIDER_CALLING     │
│   NONE: No activation               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ LAYER 3: PERMISSION SANDBOX         │
│ (Enforcement Skills Only)           │
│                                     │
│ Skills: tdd, no-workarounds         │
│                                     │
│ States:                             │
│   BLOCKED: Read/Grep only           │
│   RED: Write test files only        │
│   GREEN: Full implementation        │
│   COMPLETE: All tools               │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ LAYER 4: USAGE TRACKER              │
│                                     │
│ Events: relevant, activated, ignored│
│ Output: Weekly report, dashboard    │
└─────────────────────────────────────┘
```

---

## Response Interception Gap

**Current:** Hooks inject prompts, cannot block responses.

**Options:**

| Option | Approach | Feasibility |
|--------|----------|-------------|
| A | MCP Server wrapper (intercepts API) | High effort, full control |
| B | Claude Code ResponseReceived hook | Feature request needed |
| C | Post-response validation only | Current state |

**Recommended:** Option C for now. Option A for production deployment requiring strict enforcement.

---

## Reliability by Approach

| Approach | Reliability | Notes |
|----------|-------------|-------|
| Single-skill hooks (keyword) | ~50% | Keyword collisions, high maintenance |
| Universal hook (delegate) | ~50% | Still LLM-dependent |
| Semantic router | ~75-85% | Keyword + embedding combined |
| Permission sandbox | ~95% | Restricts tools until requirements met |
| Semantic pre-filter | ~80% | Reduces skill catalog size |

**Recommendation:** Layered approach combining all.

---

## Skill Classification

| Type | Enforcement | Examples |
|------|-------------|----------|
| Workflow | BLOCKING | tdd, no-workarounds, dogfood-skills |
| Reference | Suggestive | security-analysis, suggest-tests |

Workflow skills require state machine enforcement. Reference skills work with suggestion mode.

---

## Integration Targets

### ~/OpenPawVet/web
- SvelteKit + TypeScript
- Test bed for scan recommendations
- Skill routing accuracy validation

### This Project (dogfooding)
- tdd, no-workarounds, dogfood-skills installed
- Self-hosting validation

---

## Sources

### Blog Posts
- [Claude Code Skills Don't Auto-Activate](https://scottspence.com/posts/claude-code-skills-dont-auto-activate) - Hook-based solution
- [Claude Agent Skills: Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Architecture analysis
- [vLLM Semantic Router v0.1 Iris](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html) - Multi-signal routing

### Documentation
- [Claude Code Sandboxing](https://code.claude.com/docs/en/sandboxing) - Permission isolation

### Research Papers
- [CELLMATE: Sandboxing Browser AI Agents](https://www.arxiv.org/pdf/2512.12594) - Semantic permission mapping
- [Tool-MVR](https://arxiv.org/html/2509.00482v1) - Reflection-empowered tool selection
- [AgentSpec](https://arxiv.org/abs/2503.18666) - Runtime agent specification

### Projects
- [llm-use](https://github.com/llm-use/llm-use) - Intelligent model routing
- [E2B](https://e2b.dev/) - AI agent sandboxing
- [isolated-vm](https://github.com/laverdet/isolated-vm) - V8 isolate sandboxing

### Internal
- `../moltbot` - Prioritized hook system reference
- `packages/skills-cli/` - Implementation
