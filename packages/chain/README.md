# @4meta5/chain

Declarative skill chaining for Claude Code workflows.

## Overview

Chain enforces development workflows through capability-based skill resolution. Define what capabilities are required for a task (like `test_written`, `test_green`), and Chain automatically:

1. **Matches prompts to profiles** - Detects task type from your prompt
2. **Resolves skill chains** - Finds skills that provide required capabilities
3. **Enforces tool gates** - Blocks tools until capabilities are satisfied
4. **Tracks progress** - Persists session state across invocations

## Quick Start

```bash
# Install
npm install @4meta5/chain

# Validate your configuration
chain validate

# Manually activate a profile
chain activate bug-fix

# Check current session status
chain status

# Use in Claude Code hooks (auto-activates based on prompt)
chain hook-pre-tool-use --tool '{"tool":"Write"}' --prompt "fix the login bug"
```

## Configuration

Chain uses two YAML files in a `chains/` directory:

### chains/skills.yaml

Defines available skills and what they provide:

```yaml
version: "1.0"

skills:
  - name: tdd
    skill_path: .claude/skills/tdd
    provides: [test_written, test_green, test_refactored]
    requires: []
    conflicts: []
    risk: low
    cost: low
    artifacts: ["**/*.test.ts"]
    tool_policy:
      deny_until:
        write_impl:
          until: test_written
          reason: "RED phase: Write failing test first"
        commit:
          until: test_green
          reason: "GREEN phase: Tests must pass"
```

### chains/profiles.yaml

Defines workflow profiles and their requirements:

```yaml
version: "1.0"

default_profile: permissive

profiles:
  - name: bug-fix
    description: TDD workflow for bug fixes
    match: [fix, bug, broken, error, failing test]
    capabilities_required: [test_written, test_green, test_refactored]
    strictness: strict
    priority: 10
    completion_requirements:
      - name: tests_pass
        type: command_success
        command: npm test

  - name: permissive
    description: No enforcement
    match: []
    capabilities_required: []
    strictness: permissive
    priority: 0
```

## How It Works

### Profile Matching

When you use `--prompt`, Chain matches your prompt to profiles using regex patterns:

```bash
# "fix the login bug" matches bug-fix profile (contains "fix" and "bug")
chain hook-pre-tool-use --tool '{"tool":"Write"}' --prompt "fix the login bug"
```

Higher scores (more pattern matches) win. On ties, higher priority wins.

### Capability Resolution

Chain builds a DAG of skills based on capabilities:

```
Required: test_written, test_green
    ↓
Resolution:
  1. tdd provides [test_written, test_green] → selected
    ↓
Chain: [tdd]
```

Skills can have requirements (`requires: [X]`), which Chain resolves recursively.

### Tool Gating

Skills define what tools are blocked until capabilities are satisfied:

```yaml
tool_policy:
  deny_until:
    write:
      until: test_written
      reason: "Write failing test first (TDD RED)"
```

When the hook runs, it checks if the tool's intent is blocked:

```bash
$ chain hook-pre-tool-use --tool '{"tool":"Write"}'
CHAIN ENFORCEMENT: BLOCKED

Intent: write
Reason: Write failing test first (TDD RED)
```

### Path-Aware Intents

Chain supports fine-grained blocking based on file paths. Instead of blocking all writes, you can target specific file categories:

| Intent | Description | Example Files |
|--------|-------------|---------------|
| `write_test` | Writing test files | `*.test.ts`, `*.spec.js`, `tests/` |
| `write_impl` | Writing implementation files | `src/*.ts`, `lib/*.js` |
| `write_docs` | Writing documentation | `*.md`, `docs/`, `README` |
| `write_config` | Writing configuration | `*.json`, `*.yaml`, `.env` |

**TDD Example:** Block implementation writes until tests exist, but always allow writing tests:

```yaml
tool_policy:
  deny_until:
    write_impl:
      until: test_written
      reason: "TDD RED: Write a failing test first"
    commit:
      until: test_green
      reason: "TDD GREEN: Tests must pass"
```

With this config:
- `Write` to `src/index.ts` → **blocked** (write_impl)
- `Write` to `src/index.test.ts` → **allowed** (write_test)
- `Write` to `README.md` → **allowed** (write_docs)

**Fallback behavior:** If you block the base `write` intent, it blocks all file writes regardless of category. Path-aware intents provide finer control when needed.

### Session Persistence

Chain stores session state in `.chain-state.json`:

```json
{
  "session_id": "auto-1234567890",
  "profile_id": "bug-fix",
  "chain": ["tdd"],
  "capabilities_required": ["test_written", "test_green"],
  "capabilities_satisfied": [],
  "blocked_intents": {
    "write": "Write failing test first (TDD RED)"
  }
}
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `chain validate` | Validate skills.yaml and profiles.yaml |
| `chain resolve <profile>` | Show skill chain for a profile |
| `chain explain <profile>` | Explain why each skill was selected |
| `chain mermaid <profile>` | Generate Mermaid diagram |
| `chain activate <profile>` | Start a workflow session |
| `chain activate-route` | Activate from RouteDecision (router integration) |
| `chain status` | Show current session status |
| `chain next` | Show next skill and guidance |
| `chain clear` | Clear current session |
| `chain hook-pre-tool-use` | PreToolUse hook for Claude Code |
| `chain hook-stop` | Stop hook for Claude Code |

### Hook Options

```bash
chain hook-pre-tool-use \
  --tool '{"tool":"Write","input":{"path":"src/foo.ts"}}' \
  --prompt "fix the login bug" \  # Optional: enables auto-activation
  --no-auto                       # Optional: disable auto-activation
  --cwd /path/to/project          # Optional: working directory
```

## Programmatic API

```typescript
import {
  ChainActivator,
  createRouteDecision,
  PreToolUseHook,
  matchProfileToPrompt,
  resolve,
  loadConfig,
} from '@4meta5/chain';

// Load configuration
const config = await loadConfig('/path/to/project');

// === Router Integration ===
// Activate from a RouteDecision (for middleware integration)
const activator = new ChainActivator(cwd, config.skills, config.profiles);

const decision = createRouteDecision(
  'req-123',                    // request_id for idempotency
  'fix the login bug',          // query
  'immediate',                  // mode: immediate | suggestion | chat
  [{ name: 'bug-fix', score: 0.9 }]  // candidates
);

const activation = await activator.activate(decision);
// → { activated: true, session_id: '...', chain: ['tdd'], blocked_intents: {...} }

// Idempotent: same request_id returns existing session
const same = await activator.activate(decision);
// → { activated: true, idempotent: true, session_id: same as before }

// === Profile Matching ===
// Match prompt to profile
const profile = matchProfileToPrompt(
  'fix the login bug',
  config.profiles
);
// → { name: 'bug-fix', matchScore: 2, matchedPatterns: ['fix', 'bug'], ... }

// Resolve skill chain
const result = resolve(profile, config.skills);
// → { chain: ['tdd'], blocked_intents: { write_impl: '...' }, ... }

// === Hook Usage ===
// Use the hook
const hook = new PreToolUseHook(cwd, config.skills, config.profiles);
const result = await hook.check(
  { tool: 'Write', input: { path: 'src/foo.ts' } },
  { prompt: 'fix the login bug' }
);
// → { allowed: false, message: 'BLOCKED...', blockedIntents: [...] }
```

## Integration with Claude Code

Add to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "chain hook-pre-tool-use --tool '$TOOL_INPUT'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "chain hook-stop"
          }
        ]
      }
    ]
  }
}
```

## Strictness Levels

| Level | Behavior |
|-------|----------|
| `strict` | Block tools until requirements met |
| `advisory` | Warn but allow tools |
| `permissive` | No enforcement |

## Related Skills

Chain works with these bundled skills:

- **tdd** - Test-Driven Development (RED → GREEN → REFACTOR)
- **no-workarounds** - Block manual workarounds when building tools
- **dogfood-skills** - Enforce dogfooding the tools you build

## License

MIT
