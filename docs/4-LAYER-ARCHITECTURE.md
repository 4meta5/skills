# 4-Layer Architecture for Coding Agents

> Summary of research on Event-Driven Architectures for autonomous coding agents, mapped to the skills/chain project.

## Executive Summary

The research proposes a 4-layer architecture for coding agents:

| Layer | Purpose | Key Technologies |
|-------|---------|------------------|
| **1. Connectivity** | Tool/resource access | MCP, LSP |
| **2. Cognitive** | State, memory, orchestration | Blackboard, LangGraph, XState |
| **3. Execution** | Routing, sandboxing | Semantic Router, containers |
| **4. Governance** | Verification, policy, HITL | OPA, test discovery, interrupts |

**Core insight:** Avoid the "distributed monolith" trap. Use Event-Driven Architecture (EDA) where components emit events rather than call each other directly.

---

## Layer Mapping: Research → Our Implementation

### Layer 1: Connectivity (MCP/LSP)

**Research says:** Use Model Context Protocol for standardized tool access, LSP for code intelligence.

**Our current state:** 
- Chain package has tool hooks (PreToolUse, Stop)
- Direct tool blocking via intent classification
- No MCP yet (not needed until we have 5+ external integrations)

**Verdict:** ✅ Skip for now. Our hook system works. Adopt MCP when we need portability across hosts/models.

---

### Layer 2: Cognitive/Orchestration

**Research says:** Use Blackboard pattern for collaborative state, LangGraph for cyclical workflows, XState for FSM control.

**Our current state:**
- ✅ Chain DAG with capability resolution
- ✅ Session state persistence (`.chain-state.json`)
- ✅ Profile matching and auto-activation
- ✅ Skill chaining with dependency resolution

**Verdict:** ✅ We have this. Chain package IS our orchestration layer. Don't add LangGraph unless we need multi-agent cyclic workflows beyond current FSM.

---

### Layer 3: Execution (Routing)

**Research says:** Use semantic routing (vector similarity) to classify intent before invoking LLM.

**Our current state:**
- ✅ Semantic Router with embeddings + keywords (packages/cli/src/router/)
- ✅ Profile matcher with regex patterns (packages/chain/src/resolver/profile-matcher.ts)
- ✅ Intent mapper with path-aware classification (write_test, write_impl, etc.)
- ✅ Enforcement tiers (hard/soft/none)
- 🔧 **Gap identified:** Router and Chain weren't connected → **FIXED in Phase 6.1**

**Verdict:** ✅ Core routing exists. Phase 6.1 connected the layers via `ChainActivator` and `createChainIntegration()`.

---

### Layer 4: Governance (Verification)

**Research says:** Polyglot test discovery, policy-as-code (OPA), human-in-the-loop interrupts.

**Our current state:**
- ✅ TDD skill with tool blocking
- ✅ Enforcement tiers for graduated control
- ❌ No polyglot test discovery (hardcoded `npm test`)
- ❌ No OPA (not needed yet)
- ❌ No formal HITL (we have `strictness: advisory` but no interrupt/resume)

**Verdict:** 🔧 **Polyglot test discovery is the highest-value next step.** OPA/HITL only when we need compliance or destructive action approvals.

---

## What We Should Adopt (Prioritized)

### Phase 1: ✅ DONE - Fix the Integration Gap
- `RouteDecision` type with request_id, mode, candidates
- `ChainActivator.activate(decision)` with idempotency
- `createChainIntegration()` bridges router → chain
- Path-aware intents (write_test vs write_impl)
- Enforcement tiers (hard/soft/none)

### Phase 2: NEXT - Polyglot Test Discovery
From the research's governance layer - genuinely valuable and not complex.

**Heuristics to implement:**

```yaml
# JavaScript/TypeScript
jest:
  detect: package.json scripts contain "jest" OR jest.config.* exists
  patterns: ["**/__tests__/**/*.[jt]s?(x)", "**/*.{test,spec}.[jt]s?(x)"]
  command: "npm test" or "npx jest"

vitest:
  detect: vite.config.* OR vitest.config.* exists
  patterns: ["**/*.{test,spec}.{js,ts,jsx,tsx}"]
  command: "npx vitest run"

mocha:
  detect: .mocharc.* OR test script contains "mocha"
  patterns: ["test/**/*.js"]
  command: "npm test" or "npx mocha"

# Python
pytest:
  detect: pytest.ini OR pyproject.toml [tool.pytest] OR tox.ini
  patterns: ["test_*.py", "*_test.py"]
  command: "pytest" or "python -m pytest"
  discovery: "pytest --collect-only -q"

# Go
go_test:
  detect: go.mod exists
  patterns: ["**/*_test.go"]
  command: "go test ./..."
  json: "go test -json ./..."

# Rust
cargo_test:
  detect: Cargo.toml exists
  patterns: ["tests/*.rs", "src/**/*_test.rs", "#[test] in source"]
  command: "cargo test"

# Java
junit:
  detect: pom.xml OR build.gradle
  patterns: ["**/Test*.java", "**/*Test.java"]
  command: "mvn test" or "gradle test"
```

**Use case:** TDD skill can auto-detect test runner and patterns instead of assuming `npm test`.

### Phase 3: LATER - Event Bus (only with fan-out)

**Trigger:** Multiple independent consumers need the same events (security scanner, linter, test runner running in parallel).

**Approach:**
- Start with in-process pub/sub, not Kafka
- Keep payload types stable (reuse RouteDecision, ActivationResult)
- Replace direct calls with event dispatcher

### Phase 4: ONLY IF NEEDED - MCP/OPA/HITL

| Technology | Adopt When |
|------------|------------|
| **MCP** | 5+ external tools with bespoke integrations, or need cross-host/model portability |
| **OPA** | Policy managed by non-devs, compliance requirements, multiple teams |
| **HITL interrupts** | Agent performs destructive actions (push to main, delete files, spend money) |

---

## Key Takeaways

1. **The research is directionally correct** but over-scoped for our current stage
2. **We already have most of the architecture** - just needed to connect the layers
3. **Polyglot test discovery** is the highest-value item to adopt next
4. **Don't add infrastructure until you hit concrete triggers**

## Architecture Comparison

```
Research's 4-Layer Model          Our Implementation
═══════════════════════════════════════════════════════════════
Layer 4: Governance               ✅ Enforcement tiers
         - Verification           🔧 Test discovery (TODO)
         - Policy (OPA)           ❌ Not needed yet
         - HITL                   ❌ Not needed yet

Layer 3: Execution                ✅ Semantic Router
         - Routing                ✅ Profile Matcher  
         - Sandbox                ✅ Claude Code sandbox

Layer 2: Cognitive                ✅ Chain DAG + Resolver
         - State                  ✅ SessionState persistence
         - Orchestration          ✅ Capability resolution

Layer 1: Connectivity             ✅ Tool hooks (PreToolUse)
         - MCP                    ❌ Not needed yet
         - LSP                    ❌ Not needed yet
```

---

## References

See original research document for full citations. Key sources:
- RT Insights: "Why Agentic AI Needs Event-Driven Architecture"
- Model Context Protocol specification
- LangGraph documentation
- XState documentation
- Pytest/Jest/Go testing conventions
