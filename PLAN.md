# Project Plan

Single source of truth for all project planning.

## Current Sprint

### Package: chain

Skill chaining system with declarative YAML-based profiles.

**Phase 4: Profile Auto-Selection** ✅
- [x] Prompt to profile matching (regex scoring)
- [x] Auto-activation in PreToolUse hook
- [x] `--auto` flag to disable auto-selection
- [x] Persist profile selection on first hook invocation

**Phase 5: Integration + Polish**
- [ ] `chain doc --profile X` command
- [x] Add `chain validate` to CI/pre-commit
- [ ] Update workflow-orchestrator skill to reference chain system
- [ ] Migration guide from skill-based to chain-based workflows
- [x] Create README.md for the package

### Package: cli

Skills CLI enhancements.

- [ ] Add skill update command for version bumps
- [ ] Improve semantic matching accuracy

### Documentation

- [x] Updated skill provenance for upstream skills (Trail of Bits, Claudeception)
- [x] Updated README with chain system documentation
- [x] Reorganized skills into single flat table with origin column
- [x] Added skill update documentation

### Package: web

Website improvements.

- [ ] Add skill search functionality
- [ ] Create skill detail pages
- [ ] Add skill submission flow
- [ ] Improve mobile responsiveness

## Backlog

### Skill Library Expansion
- [ ] Add more language-specific skills (Python, Rust, Go)
- [ ] Add CI/CD skills (GitHub Actions, CircleCI)
- [ ] Add database skills (Postgres, MongoDB patterns)
- [ ] Add API design skills (REST, GraphQL)

### Infrastructure
- [ ] Set up automated skill testing
- [ ] Create skill quality metrics
- [ ] Add skill usage analytics dashboard

## Completed

### 2026-01-31

**Chain Package: Phase 4 + Phase 5 Progress**
- [x] Profile matcher with regex scoring (matchProfileToPrompt)
- [x] Auto-activation in PreToolUse hook when prompt provided
- [x] `--prompt` and `--no-auto` CLI flags for hook-pre-tool-use
- [x] Session persistence on first hook invocation
- [x] Comprehensive README.md for chain package
- [x] `chain validate` added to pre-commit hook
- [x] Fixed TDD write blocking (dogfooding found circular dependency)
- [x] Tests: 212 passing (was 189)

**Communication Skills**
- [x] Created imessage-tone skill for iMessage communication
- [x] Two-mode system: owner (direct, honest) vs others (approval required, casual)
- [x] Abbreviation rules, punctuation rules, non-needy tone
- [x] Added self-identification prefix to prevent self-reply loops
- [x] Created bluebubbles-setup skill for iMessage integration
- [x] Covers Full Disk Access, Cloudflare tunnels, webhook config
- [x] Documents critical config rules (open policy requires wildcard)
- [x] Added both skills to README.md Skills Library table

### 2026-01-30

**doc-maintenance Skill Fix**
- [x] Fixed doc-maintenance skill to use root PLAN.md (consolidated)
- [x] Added markdown-writer chaining to doc-maintenance skill
- [x] Added package-level PLAN.md consolidation instructions
- [x] Created doc-maintenance skill content tests (4 tests)
- [x] Consolidated all PLAN.md files into root PLAN.md
- [x] Simplified: moved PLAN.md to root (convention over configuration)

**Chain Package: Phases 0-3.5**
- [x] Package structure with package.json, tsconfig.json
- [x] Zod schemas for SkillSpec, ProfileSpec, SessionState
- [x] Example chains/skills.yaml with 8 skills
- [x] Example chains/profiles.yaml with 3 profiles
- [x] `chain validate` command
- [x] CapabilityGraph with nodes=skills, edges=provides/requires
- [x] Topological sort with cycle detection
- [x] Conflict detection
- [x] Tie-breaking: risk (asc), cost (asc), name (alpha)
- [x] `chain resolve --profile <name>` command
- [x] `chain explain --profile <name>` command
- [x] `chain mermaid --profile <name>` command
- [x] SessionState type and file format
- [x] StateManager (create/load/save/clear)
- [x] EvidenceChecker (file exists, marker regex, command exit code)
- [x] `chain activate --profile <name>` command
- [x] `chain status` command
- [x] `chain clear` command
- [x] Intent mapper (tool to intents like write/commit/deploy)
- [x] PreToolUse hook logic
- [x] Stop hook logic
- [x] Denial message formatting with checklists
- [x] getCurrentSkill() in StateManager
- [x] getSkillGuidance() function
- [x] PreToolUse outputs guidance even when allowed
- [x] Updated status command with next step
- [x] `chain next` command
- [x] Fixed CLI command naming (hook-pre-tool-use, hook-stop)
- [x] Dogfooding setup with PreToolUse hook

**Tests:** 189 passing

**Workflow Skill Bundle**
- [x] Create workflow orchestrator skill
- [x] Create project-init skill for scaffolding
- [x] Create doc-maintenance skill for auto-updates
- [x] Create gitignore-hygiene skill
- [x] Create agent-orchestration skill
- [x] Create research-to-plan skill
- [x] Create templates (CLAUDE.md, README.md, PLAN.md, RESEARCH.md, AGENTS.md)
- [x] Create reference documentation

**Documentation Updates**
- [x] Update README.md with complete skill list
- [x] Add web package documentation
- [x] Document Svelte/SvelteKit skills

**Skills CLI: Wave 1-3**
- [x] Exponential backoff with jitter (13 tests)
- [x] Enhanced error messages (9 tests)
- [x] Sync command enhancement (7 tests)
- [x] Zod schema validation (16 tests)
- [x] Skill dependency resolution (25 tests)
- [x] Skill conflict detection (6 tests)
- [x] Dynamic skill evaluation hook (22 tests)
- [x] Structured outputs migration (26 tests)

**CLI Tests:** 796 passing (including 4 new doc-maintenance skill tests)

### Earlier

- [x] Initial skills-cli implementation
- [x] Project analysis and tech stack detection
- [x] Skill scanning and recommendations
- [x] Skill installation from sources
- [x] Bundled skill library (tdd, no-workarounds, etc.)
- [x] Svelte/SvelteKit skill collection
- [x] Accessibility and UI quality skills
- [x] Frontend design skills
- [x] Add skill validation command
- [x] Support skill bundles (multiple skills in one package)
- [x] Fixed nested skill discovery in loadSkillsFromDirectory

## Blocked

None currently.

## Notes

- Test skills (test-skill-*) are for CLI testing. Clean with `skills hygiene clean -r --confirm`.
- Some skills are marked _temp_ pending proper naming.
- Chain package has 212 tests. CLI package has 796 tests.
