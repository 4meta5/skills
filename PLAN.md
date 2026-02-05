# Project Plan

Single source of truth for all project planning.

## Current Sprint: Layer Integration

**Problem:** Router, Middleware, and Chain all work independently. They don't share state.
Router determines `immediate` mode but Chain doesn't use it. Skills get ignored ~50%.

**Solution:** Option A with Option C-shaped APIs. Direct calls now, event bus later.
Chain owns session state. Tool-time enforcement is truth. Prompt-time is optimization.

### Phase 6: Integration Spine (HIGH PRIORITY)

**6.1: RouteDecision + Chain Activation** ✅
- [x] Define `RouteDecision` payload type (request_id, session_id, mode, candidates, selected_profile)
- [x] Define `ActivationResult` type for activation responses
- [x] Add `ChainActivator.activate(decision)` API with idempotency by request_id
- [x] Add `createRouteDecision()` helper for building decisions
- [x] Add `chain activate-route` CLI command for router integration
- [x] Chain state shows active enforcement immediately after routing (before any Skill() call)
- [x] Tests: 17 new tests for ChainActivator, 13 for RouteDecision types
- [x] Middleware calls activate when router mode is `immediate` or `suggestion`
- [x] Added `createChainIntegration()` for router→chain bridging
- [x] Updated `createCorrectiveLoop()` to accept optional chainIntegration
- [x] Made `initializeFromRouting()` async to support chain activation
- [x] Tests: 9 new chain-integration tests, 805 total CLI tests passing

**6.2: Intent Mapping (Unblock Smarter Blocking)** ✅
- [x] Define canonical intents: write_test, write_impl, write_docs, write_config, edit_test, edit_impl, etc.
- [x] Implement path-based intent classifier in chain (language-agnostic patterns)
- [x] Update deny rules to target intents not raw tools
- [x] Default patterns: `**/{test,tests,__tests__}/**`, `**/*.{test,spec}.*`, etc.
- [x] Tests: TDD RED allows `foo.test.ts`, blocks `src/foo.ts` (6 new integration tests)

**6.3: Enforcement Tiers** ✅
- [x] Add `tier: hard | soft | none` to skill schema (EnforcementTier enum)
- [x] Define HIGH_IMPACT_INTENTS (write_impl, commit, push, deploy, delete)
- [x] Define LOW_IMPACT_INTENTS (write_test, write_docs, write_config)
- [x] Hard: block all denied intents (default behavior)
- [x] Soft: block high-impact intents only, allow low-impact ones
- [x] None: guidance only, no blocking
- [x] filterBlockedByTier() and getCurrentTier() helpers
- [x] Tests: 10 new tier enforcement tests
- [x] Total: 310 chain tests passing (was 269)
- [ ] Add `skill_declined:<name>` capability for explicit decline (deferred)

**6.4: Polyglot Test Discovery** ✅
- [x] detectTestRunner() - returns primary test runner for a project
- [x] detectAllTestRunners() - returns all detected runners sorted by confidence
- [x] `chain detect-runner` CLI command (--path, --all, --json)
- [x] Supported: cargo, go, pytest, vitest, jest, mocha, npm fallback
- [x] Detection by config files and content patterns
- [x] Workspace detection for Cargo.toml
- [x] SkillSpecInput type and createSkillSpec() helper for partial definitions
- [x] Tests: 329 passing (+19 new)

**6.5: Unified Session State** ✅
- [x] Add `chain session-explain --session <id>` (returns why blocked)
- [x] Add `chain get-state --session <id>` (programmatic)
- [x] `extractShortReason()` for deterministic short block reasons
- [x] `UsageTracker` records: decision, activation, blocks, retries, completions
- [x] JSONL persistence to `.chain-usage.jsonl`
- [x] `getStats()` for session analytics
- [x] Middleware integration: ChainIntegration tracks all events
- [x] trackBlock(), trackRetry(), trackCompletion() methods
- [x] Tests: 350 chain + 812 CLI passing

**6.6: Event Bus**
- Deferred to later phase. See [Deferred](#deferred) section.

### Phase 5: Integration + Polish (Deferred)

- [ ] `chain doc --profile X` command
- [x] Add `chain validate` to CI/pre-commit
- [ ] Update workflow-orchestrator skill to reference chain system
- [ ] Migration guide from skill-based to chain-based workflows
- [x] Create README.md for the package

### Package: cli

Skills CLI enhancements.

- [x] Add slop detection to sync/add commands (prevents test-skill-* from being synced)
- [ ] Add skill update command for version bumps
- [ ] Improve semantic matching accuracy

### Package: web
- Deferred. See [Deferred](#deferred) section.

## Architectural Decisions

**AD-1: Option A with Option C-shaped APIs**
- Direct calls now (middleware → chain), event bus later
- Avoids god object (Option B) and premature infrastructure (Option C)
- Keep payloads stable so swap is mechanical

**AD-2: Chain owns session state**
- Single source of truth for active enforcement
- Router/middleware read and activate through chain
- No parallel state in middleware

**AD-3: Tool-time enforcement is truth**
- Prompt-time injection (MUST_CALL) is optimization
- Chain PreToolUse is the only guaranteed enforcement point
- Skill() calls are state transitions, not the enforcement mechanism

**AD-4: Intent-based blocking**
- Canonical intents: write_test, write_impl, write_docs, etc.
- Path patterns determine intent (language-agnostic)
- Deny rules target intents, not raw tool names

**AD-5: Three enforcement tiers**
- Hard: blocks until capability (workflow skills)
- Soft: blocks high-impact until ack (reference skills)
- None: guidance only (informational skills)

**AD-6: Scope cut for core loop focus**
- Semantic router hook is opt-in (install via `skills hook add semantic-router`)
- Response validation is a library function available via hooks; not enabled by default
- Embedding models: CLI uses @xenova/transformers as direct dependency; semantic-matcher uses hash fallback when embeddings unavailable
- Core loop: scan → install → auto-evaluate → enforce workflow
- Deferred: event bus, web package, analytics dashboard, large skill catalog

## Backlog

### Infrastructure
- [ ] Set up automated skill testing
- [ ] Create skill quality metrics

## Deferred

Items explicitly deferred to focus on the core loop (scan → install → auto-evaluate → enforce workflow).

### Event Bus (Phase 6.6)
- [ ] Replace direct calls with internal event dispatcher
- [ ] Keep payloads same (prompt:received, skill:matched, tool:requested)
- [ ] Same behavior, pluggable integrations
- [ ] Trigger: need parallel consumers (security scanner, linter, test runner)

### Web Package / Skills Site
- [ ] Add skill search functionality
- [ ] Create skill detail pages
- [ ] Add skill submission flow
- [ ] Improve mobile responsiveness

### Large Skill Catalog Expansion
- [ ] Add more language-specific skills (Python, Rust, Go)
- [ ] Add CI/CD skills (GitHub Actions, CircleCI)
- [ ] Add database skills (Postgres, MongoDB patterns)
- [ ] Add API design skills (REST, GraphQL)

### Analytics Dashboard
- [ ] Add skill usage analytics dashboard (beyond JSONL)

### Advanced Features
- [ ] MCP integration
- [ ] OPA policy engine
- [ ] Human-in-the-loop (HITL) workflows

## Completed

### 2026-02-05

**Documentation Update**
- [x] Updated README skills list with deploy-mystack, rick-rubin, component skills, and npm-publish

### 2026-02-03

**Fix claudemd-sync ENOENT Bug (packages/skills)**
- [x] Fixed path resolution in bundled.ts (probes 4, 3, 2 levels up from dist/src)
- [x] Added lazy loading with cache (skills load only on getBundledSkill() call)
- [x] Minimal API: only getBundledSkill() and listBundledSkillNames() exported
- [x] Tests updated for lazy loading verification

### 2026-02-02

**Slop Detection in Sync/Add Commands**
- [x] Added `isSlop()` function to hygiene module (detects test-skill-*, timestamped, _temp_ patterns)
- [x] Sync command now skips slop skills with warning message
- [x] Add command now skips slop skills with warning message
- [x] Updated test suite to use non-slop naming convention (sync-test-skill-* with short random suffix)
- [x] Cleaned 76 test-skill-* directories from affected project (amarsingh.dev)
- [x] Cleaned 76 stale CLAUDE.md references from affected project
- [x] Cleaned 16 stale CLAUDE.md references from packages/cli
- [x] Tests: 821 CLI tests passing, 5 new tests for isSlop() and slop detection

### 2026-02-01

**Modular Architecture Refactoring**
- [x] Extract @4meta5/skill-loader package (28 tests)
- [x] Extract @4meta5/project-detector package (29 tests)
- [x] Extract @4meta5/semantic-matcher package (72 tests)
- [x] Extract @4meta5/workflow-enforcer package (69 tests)
- [x] Update @4meta5/skills to depend on @4meta5/skill-loader
- [x] Update @4meta5/skills-cli to depend on all 4 new packages
- [x] Update root package.json build order
- [x] All 1,404 tests passing across all packages

### 2026-01-31

**Chain Package: Phase 6.1 - RouteDecision + Chain Activation**
- [x] RouteDecision type with request_id, session_id, mode, candidates, selected_profile
- [x] ActivationResult type with activated, session_id, is_new, idempotent flags
- [x] ChainActivator class with activate(decision) API
- [x] Idempotency via request_id caching (LRU eviction at 1000 entries)
- [x] createRouteDecision() helper function
- [x] `chain activate-route` CLI command with --decision JSON and --query/--mode flags
- [x] Exported from main package index
- [x] Tests: 30 new tests (17 activator + 13 types)
- [x] Total: 242 tests passing

**Chain Package: Phase 6.2 - Path-Aware Intent Mapping**
- [x] Extended ToolIntent enum with path-aware variants (write_test, write_impl, write_docs, write_config, edit_*)
- [x] Implemented classifyFilePath() with language-agnostic patterns
- [x] Added getPathAwareIntent() for intent classification
- [x] Updated mapToolToIntents to return both path-aware and base intents
- [x] Added 51 new tests for file classification (test/docs/config/impl patterns)
- [x] Added 6 new integration tests for PreToolUse path-aware blocking
- [x] Updated TDD skill config to use write_impl instead of write
- [x] Updated README with path-aware intents documentation
- [x] Tests: 269 passing (was 212)

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

- Test skills (test-skill-*) are now blocked from sync/add commands. The test suite uses `sync-test-skill-*` with short random suffixes to avoid triggering slop detection.
- Some skills are marked _temp_ pending proper naming.
- Test counts: chain 350, cli 821, skill-loader 28, project-detector 29, semantic-matcher 72, workflow-enforcer 69, skills 26, web 18. Total: 1,413.
