# Scratchpad

Append-only prompt pattern log. Schema: date, short name, pattern snippet, source, tags, status, targets (optional).

Status lifecycle: `new` -> `triaged` -> `proposed` -> `approved` -> `applied` (or `rejected` at any stage).

---

## Entries

### 2026-02-15 | verify-before-trust

**Pattern:** Do not trust summaries; verify every claim against primary source artifacts before proceeding.

**Source:** manual
**Tags:** review, audit
**Status:** new

---

### 2026-02-15 | rick-rubin-review

**Pattern:** Review the Claude implementation using the rick-rubin moderate-scope defense (prompt E) to detect overreach and unnecessary complexity.

**Source:** manual
**Tags:** review, scope
**Status:** new

---

### 2026-02-15 | fix-no-shortcuts

**Pattern:** Resolve issues exactly as prescribed; prohibit shortcuts, workarounds, or skipped steps.

**Source:** manual
**Tags:** discipline, work
**Status:** new

---

### 2026-02-15 | plan-with-scope

**Pattern:** Define next steps with strict scope discipline; run rick-rubin prompt A or B before approving implementation.

**Source:** manual
**Tags:** plan, scope
**Status:** new

---

### 2026-02-15 | fresh-eyes-cracks

**Pattern:** Perform high-level tech debt crack detection with fresh-eyes analysis; use Planning mode before implementation and Reflection mode after fixes.

**Source:** manual
**Tags:** review, tech-debt
**Status:** new

---

### 2026-02-15 | sota-simplicity

**Pattern:** Research current SOTA simplicity conventions before major refactors; favor boring, deterministic, grep-friendly workflows.

**Source:** manual
**Tags:** plan, research
**Status:** new

---

### 2026-02-15 | shared-parsing-eval

**Pattern:** Assess shared parsing or library extraction ergonomics without forced publishing; prioritize local-path workflows.

**Source:** manual
**Tags:** plan, architecture
**Status:** new

---

### 2026-02-15 | codex-sota-interview

**Pattern:** Conduct a structured interview that surfaces SOTA conventions, open questions, and alternative options, then synthesize a tightly scoped implementation plan for Claude Code.

**Source:** manual
**Tags:** review, codex, plan
**Status:** new
