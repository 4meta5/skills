# Parallel Execution Patterns

This reference documents when and how to parallelize agent work.

## When to Parallelize

### Good Candidates

| Situation | Why Parallel? |
|-----------|---------------|
| Exploring multiple code areas | No dependencies between areas |
| Researching multiple options | Independent investigations |
| Implementing independent features | No shared state |
| Running tests and linting | Independent checks |
| Building multiple packages | Independent builds |

### Poor Candidates

| Situation | Why Sequential? |
|-----------|-----------------|
| Implementation depends on design | Need design first |
| Tests depend on implementation | Need code first |
| Refactoring shared code | Risk of conflicts |
| Database migrations | Order matters |
| Security review after changes | Need final code |

## Decision Framework

```
Is the task divisible?
├─ No → Run sequentially
└─ Yes → Are subtasks independent?
         ├─ No → Identify dependencies, pipeline or hybrid
         └─ Yes → Can results be combined?
                  ├─ No → Reconsider division
                  └─ Yes → Parallelize
```

## Patterns

### 1. Independent Exploration

**When:** Understanding codebase, initial research

**Structure:**
```
┌─ Agent a1: Area A ────┐
├─ Agent a2: Area B ────┼─> Combine results
└─ Agent a3: Area C ────┘
```

**Example:**
```
Task: Understand authentication system

Parallel:
  a1: Explore frontend auth (src/components/auth/)
  a2: Explore backend auth (src/api/auth/)
  a3: Explore auth tests (tests/auth/)

Combine:
  Synthesize findings into RESEARCH.md
```

### 2. Research Comparison

**When:** Evaluating options before decision

**Structure:**
```
┌─ Agent a1: Option A ──┐
├─ Agent a2: Option B ──┼─> Decision agent
└─ Agent a3: Option C ──┘
```

**Example:**
```
Task: Choose state management

Parallel:
  a1: Research Redux (pros, cons, examples)
  a2: Research Zustand (pros, cons, examples)
  a3: Research Jotai (pros, cons, examples)

Decide:
  Compare findings, recommend with rationale
```

### 3. Parallel Implementation

**When:** Building independent features

**Structure:**
```
┌─ Agent a1: Feature A ─┐
├─ Agent a2: Feature B ─┼─> Integration
└─ Agent a3: Feature C ─┘
```

**Example:**
```
Task: Build dashboard widgets

Parallel:
  a1: Implement UserStats widget
  a2: Implement RecentActivity widget
  a3: Implement Notifications widget

Integrate:
  Combine in Dashboard.tsx
```

### 4. Pipeline

**When:** Sequential transformation

**Structure:**
```
Research → Design → Implement → Test → Review
```

**Example:**
```
Task: Add new API endpoint

Sequential:
  a1: Research API patterns (output: RESEARCH.md)
  a2: Design endpoint (output: spec in docs/)
  a3: Implement endpoint (output: code)
  a4: Write tests (output: test files)
  a5: Review security (output: approval or fixes)
```

### 5. Hybrid

**When:** Mix of independent and dependent work

**Structure:**
```
     ┌─ a1 ─┐
     │      │
Start┼─ a2 ─┼─> a4 ─> a5
     │      │
     └─ a3 ─┘
```

**Example:**
```
Task: Implement OAuth with multiple providers

Phase 1 (parallel):
  a1: Research Google OAuth
  a2: Research GitHub OAuth
  a3: Design provider interface

Phase 2 (sequential, after phase 1):
  a4: Implement base OAuth

Phase 3 (parallel, after phase 2):
  a5: Implement Google provider
  a6: Implement GitHub provider

Phase 4 (sequential):
  a7: Integration tests
```

## Coordination Overhead

Consider overhead when deciding to parallelize:

| Agents | Overhead | Recommendation |
|--------|----------|----------------|
| 2 | Low | Usually worth it |
| 3-4 | Medium | Good for independent tasks |
| 5+ | High | Only for truly independent work |

## Conflict Avoidance

When agents might touch same files:

### Strategy 1: Area Isolation

Assign non-overlapping areas:
```
a1: src/features/auth/
a2: src/features/dashboard/
a3: src/features/settings/
```

### Strategy 2: Interface Contract

Define interfaces first, implement independently:
```
a1: Define interfaces in types.ts
--- wait ---
a2: Implement interface A
a3: Implement interface B
```

### Strategy 3: Sequential Hot Spots

Identify shared files, handle sequentially:
```
Parallel: Independent feature code
Sequential: Shared config, types, index files
```

## Example Coordination

**Task:** Add real-time notifications

**Analysis:**
- Research: independent (parallel)
- Backend: depends on research (wait)
- Frontend: depends on backend API (wait)
- Tests: depends on implementation (wait)

**Plan:**
```
Phase 1 (parallel):
  a1: Research SSE vs WebSocket
  a2: Research notification patterns

Phase 2 (parallel, after phase 1):
  a3: Implement backend SSE endpoint
  a4: Design notification types

Phase 3 (sequential, after a3):
  a5: Implement frontend listener

Phase 4 (parallel, after a5):
  a6: Write backend tests
  a7: Write frontend tests
```

## Metrics

Track to improve parallelization:

| Metric | Target |
|--------|--------|
| Wait time | Minimize |
| Conflicts | Zero |
| Context loss | Minimal |
| Total duration | Less than sequential |

## Notes

- Start conservative (2-3 agents)
- Document dependencies explicitly
- Use AGENTS.md for coordination
- Prefer clear isolation over clever sharing
- Sequential is fine when dependencies exist
