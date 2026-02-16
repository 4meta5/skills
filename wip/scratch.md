# Scratchpad

Append-only prompt pattern log. Schema: date, short name, pattern snippet, source, tags, status, targets (optional).

Status lifecycle: `new` -> `triaged` -> `proposed` -> `approved` -> `applied` (or `rejected` at any stage).

---

## Entries

### 2026-02-15 | verify-before-trust

**Pattern:** Do not trust summary by default; verify against source artifacts.

**Source:** manual
**Tags:** review, audit
**Status:** new

---

### 2026-02-15 | rick-rubin-review

**Pattern:** Review Claude implementation with `rick-rubin` moderate scope defense (prompt E).

**Source:** manual
**Tags:** review, scope
**Status:** new

---

### 2026-02-15 | fix-no-shortcuts

**Pattern:** Fix issues as prescribed without shortcuts. No workarounds, no skipped steps.

**Source:** manual
**Tags:** discipline, work
**Status:** new

---

### 2026-02-15 | plan-with-scope

**Pattern:** Plan next steps with scope discipline. Use rick-rubin prompt A or B before committing to implementation.

**Source:** manual
**Tags:** plan, scope
**Status:** new

---

### 2026-02-15 | fresh-eyes-cracks

**Pattern:** Fresh-eyes high-level tech debt crack detection. Use Planning mode before implementation, Reflection mode after fixes.

**Source:** manual
**Tags:** review, tech-debt
**Status:** new

---

### 2026-02-15 | sota-simplicity

**Pattern:** Research SOTA simplicity conventions before broader refactors. Prefer boring, deterministic, grep-friendly workflows.

**Source:** manual
**Tags:** plan, research
**Status:** new

---

### 2026-02-15 | shared-parsing-eval

**Pattern:** Evaluate ergonomic shared parsing/library extraction without forced publish. Local-path workflows preferred.

**Source:** manual
**Tags:** plan, architecture
**Status:** new

---

### 2026-02-15 | codex-sota-interview

**Pattern:** Please interview me in a way that shares SOTA conventions related to any open questions or suggestions with multiple options so we can choose the right ones and incorporate them into a tightly scoped plan for Claude Code to implement the fixes.

**Source:** manual
**Tags:** review, codex, plan
**Status:** new
