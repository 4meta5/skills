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

---

## Phase 5: Response Validation Research

**Date:** 2026-01-29
**Focus:** API response validation middleware patterns for LLM tool call enforcement

### Current Implementation Analysis

The existing middleware in `packages/skills-cli/src/middleware/` implements:

1. **Tool Call Detection** (`middleware.ts`): Regex-based detection of `Skill()` calls in responses
2. **State Tracking** (`types.ts`): Maintains retry count, required tools, and activation mode
3. **Corrective Loop** (`corrective-loop.ts`): Orchestrates retry logic with configurable thresholds

**Gaps Identified:**
- No exponential backoff (fixed retry count only)
- No schema validation of tool call arguments
- Detection relies on text parsing rather than structured output
- No jitter to prevent synchronized retry storms

---

### Patterns Reviewed

#### Pattern 1: Structured Output Validation (Claude API)

As of December 2025, Claude supports [structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) via constrained decoding. Two modes available:

| Mode | Use Case | Implementation |
|------|----------|----------------|
| JSON Outputs | Data extraction, report generation | `output_format` parameter |
| Strict Tool Use | Guaranteed schema validation | `strict: true` on tool definitions |

**Key insight:** Constrained decoding compiles JSON schema into grammar, restricting token generation during inference. This is fundamentally more reliable than post-hoc regex parsing.

**Caveats:**
- Requires `anthropic-beta: structured-outputs-2025-11-13` header
- Safety refusals override schema compliance (200 status but non-conforming response)
- Complex/nested schemas may hit "too complex" errors

**Source:** [Claude Structured Outputs Blog](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform)

---

#### Pattern 2: Exponential Backoff with Jitter

Standard algorithm from [AWS Best Practices](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/):

```
wait_time = min(((2^n) + random_ms), max_backoff)
```

Where:
- `n` = attempt number (starts at 0)
- `random_ms` = random value in [0, 1000]
- `max_backoff` = cap to prevent unbounded waits (typically 30-60 seconds)

**Why jitter matters:** Prevents "thundering herd" when multiple clients retry simultaneously after synchronized failure.

**Implementation libraries:**
- TypeScript: [p-retry](https://www.npmjs.com/package/p-retry), native fetch retry
- .NET: [Polly](https://github.com/App-vNext/Polly)
- Java: [Resilience4j](https://resilience4j.readme.io/)

**When to retry:**
- 408 Request Timeout
- 429 Rate Limited
- 5XX Server Errors
- Schema validation failures (LLM can self-correct)

**When NOT to retry:**
- 401/403 Authentication errors
- 400 Bad Request (client error)
- Safety refusals (won't change on retry)

**Source:** [Baeldung Exponential Backoff with Jitter](https://www.baeldung.com/resilience4j-backoff-jitter)

---

#### Pattern 3: Feedback Loop Error Correction

Research on LLM self-correction shows nuanced results:

| Feedback Type | Effectiveness | Notes |
|---------------|---------------|-------|
| Self-evaluation (prompted LLM) | Low | Only works for tasks "exceptionally suited" |
| External tool feedback | High | Reliable for schema validation |
| Fine-tuned correction | High | Requires training |

**Key finding from [MIT TACL Survey](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00713/125177/):**
> No prior work demonstrates successful self-correction with feedback from prompted LLMs, except for tasks exceptionally suited for self-correction.

**Implication:** Schema validation errors ARE well-suited for self-correction because:
1. Error is deterministic and specific
2. Correct format is explicitly specified
3. LLM has full context of what was wrong

**The "Accuracy-Correction Paradox":** Weaker models (66% accuracy) achieve 1.6x higher intrinsic correction rates than stronger models (94% accuracy). This suggests our retry mechanism should work well because:
- We're correcting format errors, not reasoning errors
- The error feedback is concrete and actionable

**Source:** [When Can LLMs Actually Correct Their Own Mistakes](https://aclanthology.org/2024.tacl-1.78/)

---

#### Pattern 4: Zod Schema Validation Pipeline

Best practice from [Zod + LLM integration](https://github.com/dzhng/zod-gpt):

```typescript
// 1. Define schema with descriptions (steers model)
const ToolCallSchema = z.object({
  tool: z.literal("Skill").describe("The tool to invoke"),
  skill: z.string().describe("Skill name from available skills"),
  args: z.string().optional().describe("Optional arguments")
});

// 2. Use safeParse for graceful error handling
const result = ToolCallSchema.safeParse(response);

// 3. On failure, feed error back to LLM
if (!result.success) {
  const errorFeedback = formatZodError(result.error);
  // Include errorFeedback in retry prompt
}
```

**Why `.safeParse()` over `.parse()`:**
- Returns discriminated union instead of throwing
- Provides structured error with path information
- Enables programmatic error message construction

**Source:** [Zod TypeScript Validation](https://zod.dev/)

---

#### Pattern 5: LangChain RetryOutputParser

[LangChain's retry mechanism](https://python.langchain.com/api_reference/langchain/output_parsers/langchain.output_parsers.retry.RetryOutputParser.html):

```python
from langchain.output_parsers.retry import RetryWithErrorOutputParser

parser = RetryWithErrorOutputParser(
    parser=base_parser,
    retry_chain=retry_chain,
    max_retries=3
)
```

**Key features:**
- `retry_if_exception_type`: Filter which exceptions trigger retry
- `wait_exponential_jitter`: Built-in backoff with jitter
- `stop_after_attempt`: Maximum retry count

**LangGraph enhancement:** Validation function binding allows custom validators beyond schema matching, with automatic retry on failure.

**Source:** [LangChain Complex Data Extraction](https://langchain-ai.github.io/langgraph/tutorials/extraction/retries/)

---

#### Pattern 6: Vercel AI SDK Tool Repair

[AI SDK's experimental_repairToolCall](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling):

**Error types provided:**
- `InvalidToolArgumentsError`: Schema validation failure
- `ToolExecutionError`: Runtime execution failure
- `ToolCallRepairError`: Repair attempt failure

**Durable agents (AI SDK 6):** Each tool execution becomes a retryable, observable step. Combined with Restate integration, provides:
- Automatic retry of transient errors
- State persistence across failures
- Observability of each step

**Source:** [Vercel AI SDK 6 Blog](https://vercel.com/blog/ai-sdk-6)

---

### Recommendations

#### 1. Migrate to Structured Outputs (HIGH PRIORITY)

Replace regex-based tool call detection with Claude's structured output mode:

```typescript
// Current: regex parsing
const SKILL_CALL_PATTERNS = [
  /Skill\s*\(\s*skill\s*[=:]\s*["']([a-zA-Z0-9_-]+)["']/gi,
  // ...
];

// Recommended: structured output with Zod
const ToolCallSchema = z.object({
  action: z.enum(["invoke_skill", "respond", "request_info"]),
  skill: z.string().optional(),
  response: z.string().optional()
});

// Use with anthropic-beta: structured-outputs-2025-11-13
```

**Benefits:**
- Eliminates parsing errors
- Type-safe at compile and runtime
- Model constrained to valid output shapes

---

#### 2. Implement Exponential Backoff with Jitter (MEDIUM PRIORITY)

Enhance `CorrectiveLoopOptions` with backoff configuration:

```typescript
interface CorrectiveLoopOptions {
  maxRetries?: number;
  backoff?: {
    initialDelayMs: number;  // e.g., 1000
    maxDelayMs: number;      // e.g., 30000
    multiplier: number;      // e.g., 2
    jitterMs: number;        // e.g., 1000
  };
  // ... existing options
}

function calculateDelay(attempt: number, config: BackoffConfig): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.multiplier, attempt),
    config.maxDelayMs
  );
  const jitter = Math.random() * config.jitterMs;
  return exponentialDelay + jitter;
}
```

---

#### 3. Enhance Error Feedback Messages (MEDIUM PRIORITY)

Current rejection template is generic:
```
COMPLIANCE ERROR: You MUST call Skill({tools}). Attempt {attempt}/{max}.
```

Recommended enhancement:
```
VALIDATION FAILURE: Required skill invocation missing.

Missing skills: {missingTools}
Found in response: {foundTools}
Attempt: {attempt}/{max}

You MUST invoke these skills using the Skill tool:
{missingTools.map(s => `- Skill(skill: "${s}")`)}

Do not proceed with implementation until all required skills are invoked.
```

---

#### 4. Add Schema Validation Layer (LOW PRIORITY for now)

When tool arguments matter (beyond just skill name):

```typescript
const SkillInvocationSchema = z.object({
  skill: z.string().min(1),
  args: z.string().optional(),
}).refine(
  data => KNOWN_SKILLS.includes(data.skill),
  { message: "Unknown skill name" }
);
```

This becomes relevant when skills accept structured arguments.

---

#### 5. Consider Durable Execution (FUTURE)

For production deployments requiring strong guarantees:
- Integrate with durable execution framework (Temporal, Restate)
- Each skill invocation becomes a retryable step
- State persisted across failures
- Full observability of correction attempts

**Trade-off:** Significant complexity increase. Only warranted for mission-critical workflows.

---

### Implementation Notes

#### Backward Compatibility

The current `createMiddleware()` and `createCorrectiveLoop()` APIs should remain stable. Enhancements should be opt-in via options:

```typescript
// Existing usage continues to work
const loop = createCorrectiveLoop({ maxRetries: 3 });

// New features opt-in
const loop = createCorrectiveLoop({
  maxRetries: 3,
  backoff: { initialDelayMs: 1000, maxDelayMs: 30000, multiplier: 2, jitterMs: 500 },
  useStructuredOutput: true,  // requires Claude API key
  validationSchema: SkillInvocationSchema,
});
```

#### Testing Strategy

1. **Unit tests:** Mock Claude responses, verify retry logic
2. **Property tests:** Randomized response shapes, verify schema validation
3. **Integration tests:** Real Claude API with intentionally malformed prompts

#### Migration Path

1. Phase 5.1 (Current): Research complete
2. Phase 5.2: Add exponential backoff with jitter
3. Phase 5.3: Integrate Zod schema validation
4. Phase 5.4: Migrate to structured outputs (requires API integration)
5. Phase 5.5: Add observability/metrics for correction rates

---

### Sources

- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Claude Structured Outputs Blog](https://claude.com/blog/structured-outputs-on-the-claude-developer-platform)
- [AWS Retry with Backoff Pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html)
- [AWS Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [Baeldung Exponential Backoff with Jitter](https://www.baeldung.com/resilience4j-backoff-jitter)
- [When Can LLMs Actually Correct Their Own Mistakes - MIT TACL](https://direct.mit.edu/tacl/article/doi/10.1162/tacl_a_00713/125177/)
- [LLM Self-Correction Papers Collection](https://github.com/ryokamoi/llm-self-correction-papers)
- [Mechanical Orchard: LLM Validation](https://www.mechanical-orchard.com/insights/llm-toolkit-validation-is-all-you-need)
- [Zod Documentation](https://zod.dev/)
- [zod-gpt: Structured LLM Outputs](https://github.com/dzhng/zod-gpt)
- [LangChain RetryOutputParser](https://python.langchain.com/api_reference/langchain/output_parsers/langchain.output_parsers.retry.RetryOutputParser.html)
- [LangChain Complex Data Extraction with Retries](https://langchain-ai.github.io/langgraph/tutorials/extraction/retries/)
- [Vercel AI SDK Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling)
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6)
- [The Anatomy of Tool Calling in LLMs](https://martinuke0.github.io/posts/2026-01-07-the-anatomy-of-tool-calling-in-llms-a-deep-dive/)
- [Stop Parsing LLMs with Regex](https://dev.to/dthompsondev/llm-structured-json-building-production-ready-ai-features-with-schema-enforced-outputs-4j2j)
