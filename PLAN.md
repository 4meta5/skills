# Skills CLI - Development Plan

## Completed Phases

### Phase 1: Usage Tracker ✅
- `skills stats` command
- JSONL event logging (`src/tracker/tracker.ts`)
- Metrics aggregation

### Phase 2: Semantic Router ✅
- 38+ tests passing
- `src/router/embeddings.ts` - transformers.js integration
- `src/router/router.ts` - keyword + embedding scoring
- `src/router/activate.ts` - CLI activation script with JSON output
- `data/vector_store.json` - 13 skills, 384-dim embeddings
- Hooks: `semantic-router.sh`

### Phase 3: Interception Middleware ✅
- 47 tests passing
- `src/middleware/types.ts` - Type definitions
- `src/middleware/middleware.ts` - Tool detection, request/response processing
- `src/middleware/corrective-loop.ts` - Retry orchestration
- `src/middleware/integration.test.ts` - End-to-end tests
- Integration with `router/activate.ts` for MUST_CALL injection

---

## Outstanding TODOs

### HIGH PRIORITY

#### 1. Vector Store Generation Command
**Status:** NOT IMPLEMENTED
**Impact:** Users cannot generate embeddings for their skills

The `data/vector_store.json` was manually created. Need a command to generate it.

**Implementation:**
```bash
skills embed [--output <path>] [--model <name>]
```

**Files to create:**
- `src/commands/embed.ts` - CLI command
- `src/commands/embed.test.ts` - Tests

**Requirements:**
1. Scan `.claude/skills/` for all installed skills
2. Read SKILL.md frontmatter (name, description)
3. Extract trigger examples from skill content
4. Generate embeddings using transformers.js
5. Write to vector_store.json

**Code location:** See `src/router/embeddings.ts` for embedding generation

---

#### 2. Dynamic skill-forced-eval Hook
**Status:** HARDCODED
**Impact:** Hook only evaluates 3 fixed skills

Current hook hardcodes:
```bash
- tdd: Trigger = implementing features...
- no-workarounds: Trigger = building tools...
- dogfood-skills: Trigger = completing features...
```

**Implementation:**
1. Read installed skills from `.claude/skills/`
2. Parse SKILL.md frontmatter for triggers/description
3. Generate dynamic evaluation list

**Files to modify:**
- `src/commands/hook.ts` - Template generation
- `.claude/hooks/skill-forced-eval.sh` - Dynamic content

**Alternative approach:**
- Create a `skills evaluate` command that outputs the prompt
- Hook calls this command instead of using heredoc

---

#### 3. Response Interception for Claude Code
**Status:** ARCHITECTURAL GAP
**Impact:** Corrective loop cannot automatically reject non-compliant responses

The middleware (`createCorrectiveLoop`) exists but requires programmatic integration. Claude Code hooks can only inject prompts, not intercept responses.

**Options:**

**Option A: MCP Server Integration**
- Create MCP server that wraps Claude API
- Server intercepts responses before returning to user
- Implements corrective loop at API level

**Option B: Claude Code Hook Enhancement**
- Request/propose `ResponseReceived` hook to Claude Code team
- Hook would allow response validation before display

**Option C: Agent SDK Integration**
- Use Claude Agent SDK for programmatic control
- SDK would use middleware directly
- See: `createCorrectiveLoop().runCycle()`

**Recommended:** Option C for immediate use, Option A for production

---

### MEDIUM PRIORITY

#### 4. Skill Source Auto-Update
**Status:** PARTIAL
**Impact:** Skills don't auto-update when sources change

```bash
skills update [skill-name]  # Exists but needs enhancement
```

**Enhancements needed:**
- Check for updates on `skills scan`
- Show update available indicator
- `skills update --all` to update everything

---

#### 5. Skill Dependency Resolution
**Status:** NOT IMPLEMENTED
**Impact:** Skills that depend on other skills not handled

Example: `tdd` skill might require `unit-test-workflow` skill.

**Implementation:**
- Add `dependencies` field to SKILL.md frontmatter
- Resolve dependencies on `skills add`
- Warn on `skills remove` if other skills depend on it

---

#### 6. Skill Conflict Detection
**Status:** NOT IMPLEMENTED
**Impact:** Conflicting skills can be installed together

Example: `svelte4-components` and `svelte5-runes` conflict.

**Implementation:**
- Add `conflicts` field to SKILL.md frontmatter
- Warn/block on `skills add` if conflict exists
- `skills scan` should not recommend conflicting skills

---

### LOW PRIORITY

#### 7. Skill Templates
**Status:** PARTIAL
**Impact:** Creating new skills is manual

```bash
skills create <name>  # Not implemented
```

Would create SKILL.md template with proper frontmatter.

---

#### 8. Skill Validation
**Status:** NOT IMPLEMENTED
**Impact:** Invalid SKILL.md files not caught

```bash
skills validate [path]  # Not implemented
```

Would validate:
- Required frontmatter fields
- Valid category values
- Markdown syntax
- No broken references

---

#### 9. Remote Skill Registry
**Status:** NOT IMPLEMENTED
**Impact:** No central discovery mechanism

Currently skills are discovered via:
- Bundled skills
- Curated sources (hardcoded)
- Manual source registration

Future: Central registry with search, ratings, downloads.

---

## File Structure Reference

```
packages/skills-cli/
├── bin/
│   └── skills.js              # CLI entry point
├── data/
│   └── vector_store.json      # Pre-computed embeddings
├── src/
│   ├── commands/
│   │   ├── add.ts             # skills add
│   │   ├── claudemd.ts        # skills claudemd
│   │   ├── hook.ts            # skills hook
│   │   ├── init.ts            # skills init
│   │   ├── projects.ts        # skills projects
│   │   ├── remove.ts          # skills remove
│   │   ├── scan.ts            # skills scan
│   │   ├── stats.ts           # skills stats
│   │   └── sync.ts            # skills sync
│   ├── detector/
│   │   └── index.ts           # Project analysis
│   ├── middleware/
│   │   ├── types.ts           # Type definitions
│   │   ├── middleware.ts      # Core middleware
│   │   ├── corrective-loop.ts # Retry logic
│   │   └── index.ts           # Exports
│   ├── router/
│   │   ├── types.ts           # Type definitions
│   │   ├── embeddings.ts      # Embedding generation
│   │   ├── router.ts          # Routing logic
│   │   └── activate.ts        # Hook script
│   ├── tracker/
│   │   └── tracker.ts         # Event logging
│   ├── config.ts              # Configuration management
│   ├── claudemd.ts            # CLAUDE.md utilities
│   ├── curated-sources.ts     # Hardcoded sources
│   ├── git.ts                 # Git operations
│   ├── matcher.ts             # Skill matching
│   ├── registry.ts            # Skill registry
│   └── index.ts               # CLI main
└── README.md
```

---

## Testing Checklist

Before implementing new features:

1. [ ] Write failing tests first (TDD RED)
2. [ ] Implement minimal code to pass (TDD GREEN)
3. [ ] Refactor if needed (TDD REFACTOR)
4. [ ] Run `npm test -w @anthropic/skills-cli`
5. [ ] Run `./packages/skills-cli/bin/skills.js scan` (dogfood)
6. [ ] Verify 346+ tests pass

---

## Session Handoff Notes

### What Works
- Semantic router detects skills with high accuracy (keyword + embedding)
- Hooks inject MUST_CALL instructions on immediate mode
- Middleware can validate responses programmatically
- All 346 tests pass

### What Doesn't Work (Yet)
- Automatic response rejection (architectural limitation)
- Dynamic skill list in forced-eval hook
- Embedding generation from CLI

### Key Files to Understand
1. `src/router/router.ts` - How scoring works
2. `src/middleware/corrective-loop.ts` - How retry works
3. `src/commands/hook.ts` - How hooks are installed
4. `.claude/hooks/skill-forced-eval.sh` - The hardcoded prompt

### Quick Start for Next Session
```bash
cd /Users/amar/skillex/skills

# Build
npm run build -w @anthropic/skills-cli

# Test
npm test -w @anthropic/skills-cli

# Dogfood
./packages/skills-cli/bin/skills.js scan

# Start implementing a TODO
# 1. Activate tdd skill
# 2. Write failing test
# 3. Implement
# 4. Run skills scan when done
```
