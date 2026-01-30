---
name: workflow
description: |
  Project workflow orchestration. Use when: (1) starting new projects,
  (2) completing tasks that need documentation updates, (3) coordinating
  parallel agent work, (4) converting research into plans. Chains with
  tdd, no-workarounds, and dogfood-skills automatically.
category: development
---

# Workflow Orchestrator

Unified workflow management for Claude Code projects. This skill coordinates documentation updates, project scaffolding, agent orchestration, and skill chaining.

## Quick Reference

| Task | Skill | Trigger |
|------|-------|---------|
| Start new project | project-init | "create project", "scaffold", "initialize" |
| Update docs after work | doc-maintenance | Task completion, feature added |
| Coordinate agents | agent-orchestration | Complex multi-part tasks |
| Clean gitignore | gitignore-hygiene | After commits, new file types |
| Research to plan | research-to-plan | SOTA research, planning phase |

## Sub-Skills

This bundle contains five sub-skills:

### project-init
Scaffolds new projects with standard structure. Creates CLAUDE.md, README.md, PLAN.md, RESEARCH.md, AGENTS.md, and .gitignore.

**Invoke:** `/workflow project-init [project-name]`

### doc-maintenance
Automatically updates PLAN.md and README.md after task completion. Marks completed items, adds discovered work, updates feature docs.

**Invoke:** `/workflow docs` or automatically after task completion

### agent-orchestration
Coordinates parallel agent execution with context handoff. Updates AGENTS.md with agent status and results.

**Invoke:** `/workflow agents [task-description]`

### gitignore-hygiene
Maintains gitignore patterns and cleans cached files. Scans for common unwanted files and suggests additions.

**Invoke:** `/workflow gitignore` or automatically after commits

### research-to-plan
Converts SOTA research into executable plans. Searches web for validation, writes RESEARCH.md, generates PLAN.md tasks.

**Invoke:** `/workflow research [topic]`

## Skill Chaining

This skill automatically chains with other skills:

### workflow + tdd
**When:** Bug fix during workflow
**Action:** Activate TDD, follow RED then GREEN then REFACTOR

### workflow + no-workarounds
**When:** Tool failure during workflow
**Action:** Fix the tool, do not work around

### workflow + dogfood-skills
**When:** Feature completion
**Action:** Run `skills scan`, install recommendations

### workflow + claudeception
**When:** Non-obvious solution discovered
**Action:** Extract as new skill

### workflow + doc-maintenance
**When:** Any task completion
**Action:** Update PLAN.md and README.md

## Standard Project Structure

```
project/
├── CLAUDE.md           # Project guidance for Claude
├── README.md           # User-facing documentation
├── PLAN.md             # Remaining work tracker
├── RESEARCH.md         # Investigation notes
├── AGENTS.md           # Agent coordination
├── .gitignore          # Comprehensive patterns
└── .claude/
    └── skills/         # Project-specific skills
```

## Templates

Templates are available in the `templates/` directory:
- CLAUDE.md.template
- README.md.template
- PLAN.md.template
- RESEARCH.md.template
- AGENTS.md.template

## When to Use

**Use project-init when:**
- Starting a new project from scratch
- User says "create", "scaffold", "initialize"

**Use doc-maintenance when:**
- Completing any task
- Adding a new feature
- Fixing a bug
- Refactoring code

**Use agent-orchestration when:**
- Task has parallelizable subtasks
- Need to explore multiple areas simultaneously
- Coordinating research and implementation

**Use gitignore-hygiene when:**
- After making commits
- New file types appear (build artifacts, logs)
- Before pushing to remote

**Use research-to-plan when:**
- Starting a new feature with unknowns
- Need SOTA validation
- Converting research notes to actionable tasks

## Rationalizations (Do Not Skip)

| Rationalization | Why It's Wrong | Required Action |
|-----------------|----------------|-----------------|
| "I'll update docs later" | Later never comes | Update now |
| "Small change, no docs needed" | Small changes accumulate | Update PLAN.md |
| "Agents are overkill" | Parallel work saves time | Consider orchestration |
| "Gitignore is fine" | Hidden files get committed | Run hygiene check |
| "I know the research" | Knowledge cutoff may be stale | Validate with web search |

## References

For detailed guidance, see:
- [file-structure.md](references/file-structure.md) - Standard project layouts
- [context-handoff.md](references/context-handoff.md) - Agent communication patterns
- [parallel-patterns.md](references/parallel-patterns.md) - When to parallelize
