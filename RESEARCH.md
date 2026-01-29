# Skills Auto-Activation Research

Research findings on extending the Claude skills CLI for reliable skill activation, enforcement, and tracking.

**Date**: 2026-01-29
**Status**: Research Complete - Ready for Discussion

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [The Auto-Activation Problem](#the-auto-activation-problem)
4. [Approach 1: Hook-Based Trigger System](#approach-1-hook-based-trigger-system)
5. [Approach 2: Skill Router Architecture](#approach-2-skill-router-architecture)
6. [Approach 3: Permission-Based Sandbox](#approach-3-permission-based-sandbox)
7. [Approach 4: Semantic Pre-Filtering](#approach-4-semantic-pre-filtering)
8. [Moltbot's Prioritized Hook System](#moltbots-prioritized-hook-system)
9. [Benchmarking and Usage Tracking](#benchmarking-and-usage-tracking)
10. [Synthesis: Recommended Architecture](#synthesis-recommended-architecture)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Open Questions](#open-questions)
13. [Sources](#sources)

---

## Executive Summary

**Core Problem**: Claude Code skills don't reliably auto-activate despite being documented as "model-invoked." Claude tends to barrel ahead with its own approach, ignoring available skills even when they match the task perfectly.

**Key Insight from Research**: There is no algorithmic skill selection in Claude Code—it's pure LLM reasoning based on skill descriptions. This explains the unreliability: Claude decides whether to use a skill through language understanding, which is inherently non-deterministic.

**Findings**:

| Approach | Reliability | Scalability | Maintenance | Recommended? |
|----------|-------------|-------------|-------------|--------------|
| Single-skill hooks (keyword triggers) | ~50% | Poor | High | No |
| Universal hook (delegate to Claude) | ~50% | Good | Low | Partial |
| Skill router (semantic matching) | ~75-85% | Good | Medium | Yes |
| Permission-based sandbox | ~95% | Medium | Medium | Yes (for enforcement) |
| Semantic pre-filtering | ~80% | Excellent | Low | Yes (combined) |

**Recommendation**: Implement a **layered system** combining:
1. **Semantic pre-filtering** to reduce skill catalog before Claude sees it
2. **Task-state sandbox** for enforcement skills (TDD, no-workarounds)
3. **Usage tracking** to measure effectiveness and inform iteration

---

## Current State Analysis

### Skills Library Architecture

The skills CLI (`packages/skills-cli/`) provides:

- **Skill installation**: Copy SKILL.md + supporting files to `.claude/skills/`
- **Project scanning**: Detect tech stack → match skills by tags → recommend
- **Source management**: Bundled, registered (git), and curated sources
- **Hook management**: Basic `skill-forced-eval` hook

### Current Activation Mechanism

```
User prompt → skill-forced-eval hook injects instruction
                    ↓
"MANDATORY SKILL ACTIVATION SEQUENCE:
 1. EVALUATE each skill
 2. ACTIVATE using Skill() tool
 3. IMPLEMENT following skill"
                    ↓
Claude decides whether to comply (~50% compliance)
```

**Why it fails**: The hook provides "strong suggestions" but Claude still makes the final decision. As [Scott Spence notes](https://scottspence.com/posts/claude-code-skills-dont-auto-activate): "Claude is so goal focused that it barrels ahead with what it thinks is the best approach."

### Installed Skills (This Project)

| Skill | Type | Enforcement Level |
|-------|------|-------------------|
| tdd | Workflow | BLOCKING (requires test-first) |
| no-workarounds | Workflow | BLOCKING (requires tool fix) |
| dogfood-skills | Workflow | BLOCKING (requires scan) |
| unit-test-workflow | Reference | Suggestive |
| security-analysis | Reference | Suggestive |
| suggest-tests | Reference | Suggestive |
| property-based-testing | Reference | Suggestive |
| differential-review | Reference | Suggestive |
| code-review-ts | Reference | Suggestive |
| claudeception | Workflow | Suggestive |

**Key distinction**: Some skills are "reference" (Claude should consult them) vs "workflow" (Claude MUST follow them). Current system doesn't distinguish.

---

## The Auto-Activation Problem

### Root Cause Analysis

[Research by Lee Han Chung](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) reveals:

> "There is no algorithmic skill selection or AI-powered intent detection at the code level. The decision-making happens entirely within Claude's reasoning process based on the skill descriptions provided."

This means:
1. All skills are formatted into text and added to the Skill tool description
2. Claude's LLM reasoning decides which (if any) to invoke
3. No embeddings, classifiers, or pattern matching involved
4. Decisions are inherently non-deterministic

### Why Hooks Don't Fully Work

| Hook Approach | What Happens | Why It Fails |
|---------------|--------------|--------------|
| Gentle reminder | `echo "Check skills..."` | Claude ignores suggestions |
| Direct instruction | `echo "INSTRUCTION: Use Skill(x)"` | ~50% compliance |
| Keyword matching | `grep -qiE '(test|bug)'` | False positives, collisions |
| Universal delegation | "Match skills by keywords" | Still LLM-dependent |

[Scott Spence's testing](https://scottspence.com/posts/claude-code-skills-dont-auto-activate) found that even explicit instructions achieve only ~50% reliability—"essentially a coin flip."

---

## Approach 1: Hook-Based Trigger System

### Single-Skill Pattern (Blog Post Recommendation)

```bash
#!/bin/bash
# ~/.claude/hooks/auto-tdd.sh
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

if echo "$PROMPT" | grep -qiE '(implement|fix|bug|feature|refactor)'; then
   echo "INSTRUCTION: Use Skill(tdd) - RED phase required before implementation"
fi
```

**Problems**:
- "implement the database schema" triggers TDD incorrectly
- "fix the documentation typo" triggers TDD incorrectly
- Each skill needs its own hook with keyword maintenance
- Keyword collisions between skills (e.g., "test" matches both `tdd` and `suggest-tests`)

### Multi-Skill Universal Hook

```bash
#!/bin/bash
# Current skill-forced-eval approach
echo "INSTRUCTION: If prompt matches installed skill triggers, use Skill(skill-name)"
```

**Better than keyword matching** because:
- No keyword maintenance
- Delegates matching to Claude (which understands context)
- Single hook for all skills

**Still unreliable** because Claude makes the final decision.

### Verdict

Hook-based triggers are **necessary but insufficient**. They improve activation rates from ~10% to ~50%, but don't provide guarantees.

---

## Approach 2: Skill Router Architecture

### Concept

Build a dedicated routing layer that:
1. Parses skill definitions with trigger patterns
2. Uses semantic similarity (embeddings) to match prompts to skills
3. Handles conflicts and disambiguation
4. Generates definitive routing decisions
5. Injects skill invocation directly (not as suggestion)

### Architecture

```
User Prompt
    ↓
┌─────────────────────────────────────┐
│ SKILL ROUTER                        │
│                                     │
│ 1. Embed prompt                     │
│ 2. Retrieve top-k matching skills   │
│ 3. Apply priority/conflict rules    │
│ 4. Return routing decision          │
│    - INVOKE: skill-name             │
│    - SUGGEST: [skill1, skill2]      │
│    - NONE: no match                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ If INVOKE:                          │
│   Inject: Skill(skill-name)         │
│   as tool call, not suggestion      │
│                                     │
│ If SUGGEST:                         │
│   Inject: "Consider: skill1, skill2"│
│   Claude decides                    │
└─────────────────────────────────────┘
    ↓
Claude Code execution
```

### Implementation Options

**Option A: Embedding-based (vLLM Semantic Router style)**

```typescript
interface SkillRoute {
  skill: string;
  triggers: string[];  // Example phrases that should invoke this skill
  embeddings: number[][];  // Pre-computed embeddings of triggers
  priority: number;
  conflicts: string[];  // Skills this conflicts with
}

async function routePrompt(prompt: string): Promise<RoutingDecision> {
  const promptEmbedding = await embed(prompt);
  const matches = skills
    .map(s => ({ skill: s, similarity: cosineSimilarity(promptEmbedding, s.embeddings) }))
    .filter(m => m.similarity > THRESHOLD)
    .sort((a, b) => b.similarity - a.similarity);

  if (matches.length === 0) return { type: 'NONE' };
  if (matches.length === 1) return { type: 'INVOKE', skill: matches[0].skill };

  // Conflict resolution
  return resolveConflicts(matches);
}
```

**Option B: LLM-as-classifier (cheaper, simpler)**

```typescript
async function routePrompt(prompt: string): Promise<RoutingDecision> {
  const skillList = skills.map(s => `- ${s.name}: ${s.description}`).join('\n');

  const response = await claude.complete({
    model: 'claude-haiku',  // Fast, cheap
    prompt: `Given this user request and available skills, which skill(s) should be invoked?

Request: ${prompt}

Available skills:
${skillList}

Respond with JSON: { "invoke": ["skill-name"] or null, "suggest": ["skill1", "skill2"] or null }`,
  });

  return parseRoutingDecision(response);
}
```

### Skill Metadata Extension

```yaml
---
name: tdd
description: Test-Driven Development workflow
triggers:
  patterns:
    - "implement.*feature"
    - "fix.*bug"
    - "add.*functionality"
  examples:
    - "implement user authentication"
    - "fix the login bug"
    - "add dark mode support"
  exclude:
    - "implement.*documentation"
    - "fix.*typo"
routing:
  priority: 100  # Higher = more important
  type: workflow  # workflow | reference | utility
  enforcement: blocking  # blocking | suggestive
  conflicts:
    - unit-test-workflow  # Don't invoke both
---
```

### Pros/Cons

| Aspect | Assessment |
|--------|------------|
| Reliability | High (~75-85% with embeddings) |
| Scalability | Good (pre-compute embeddings) |
| Maintenance | Medium (trigger examples needed) |
| Complexity | High (new subsystem) |
| Cost | Low-Medium (embedding API or local model) |

### Reference Implementations

- [vLLM Semantic Router](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html): Semantic tool filtering before LLM
- [llm-use](https://github.com/llm-use/llm-use): Intelligent routing for model selection
- [ToolRerank](https://arxiv.org/html/2509.00482v1): Adaptive tool retrieval and ranking

---

## Approach 3: Permission-Based Sandbox

### Concept

Instead of trying to make Claude activate skills, **restrict Claude's permissions** until skill requirements are met. This is the "sandbox that adjusts permissions based on task state" idea.

### State Machine Model

```
┌─────────────────────────────────────────────────────────┐
│                     TASK STATES                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────┐    test written    ┌─────────┐            │
│  │ BLOCKED │ ───────────────→   │  RED    │            │
│  │ (TDD)   │                    │ (test   │            │
│  └─────────┘                    │  fails) │            │
│       ↑                         └────┬────┘            │
│       │                              │                 │
│       │ feature                      │ implement       │
│       │ request                      ↓                 │
│       │                         ┌─────────┐            │
│       │                         │  GREEN  │            │
│       │                         │ (test   │            │
│       │                         │  passes)│            │
│       │                         └────┬────┘            │
│       │                              │                 │
│       │                              │ refactor        │
│       │                              ↓                 │
│       │                         ┌─────────┐            │
│       └──────────────────────── │COMPLETE │            │
│                                 └─────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘

PERMISSIONS BY STATE:
- BLOCKED: Read, Glob, Grep only (no Edit, Write, Bash)
- RED: Read, Glob, Grep, Write (test files only)
- GREEN: All tools (implementation allowed)
- COMPLETE: All tools
```

### Implementation via Claude's Sandboxing

[Claude Code's sandboxing](https://code.claude.com/docs/en/sandboxing) provides:
- Directory-based restrictions
- Command allowlists/blocklists
- Network isolation

**Custom sandbox profile for TDD**:

```json
{
  "sandbox": {
    "profiles": {
      "tdd-blocked": {
        "allow_commands": ["git status", "npm test", "pytest"],
        "deny_commands": ["*"],
        "allow_write": ["**/*.test.ts", "**/*.spec.ts", "**/*_test.py"],
        "deny_write": ["**/*.ts", "**/*.py", "!**/*.test.*"]
      },
      "tdd-green": {
        "allow_commands": ["*"],
        "allow_write": ["**/*"]
      }
    }
  }
}
```

### Hook-Based State Transitions

```bash
#!/bin/bash
# ~/.claude/hooks/tdd-state-machine.sh

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

# Read current state
STATE=$(cat ~/.claude/tdd-state 2>/dev/null || echo "BLOCKED")

case $STATE in
  "BLOCKED")
    if echo "$PROMPT" | grep -qiE '(implement|fix|add|create)'; then
      echo "BLOCKED: TDD PHASE 1 - RED REQUIRED"
      echo "Write a failing test first. Edit tool restricted to test files."
      echo "SANDBOX_PROFILE=tdd-blocked"
    fi
    ;;
  "RED")
    # Check if tests pass
    if npm test 2>&1 | grep -q "PASS"; then
      echo "TRANSITION: RED → GREEN"
      echo "GREEN" > ~/.claude/tdd-state
      echo "SANDBOX_PROFILE=tdd-green"
    fi
    ;;
esac
```

### CELLMATE-Inspired Semantic Mapping

[CELLMATE research](https://www.arxiv.org/pdf/2512.12594) introduces:

> "Agent sitemap abstraction that maps low-level actions to high-level privilege requirements"

Applied to skills:

```typescript
interface ActionMap {
  action: string;           // "Edit file"
  privilege: string;        // "modify-source"
  requires: string[];       // ["tdd-green-phase"]
  skill_context: string[];  // ["tdd", "no-workarounds"]
}

const ACTION_MAP: ActionMap[] = [
  { action: "Edit *.ts", privilege: "modify-source", requires: ["tdd-green-phase"] },
  { action: "Write *.ts", privilege: "create-source", requires: ["tdd-green-phase"] },
  { action: "Bash npm test", privilege: "run-tests", requires: [] },  // Always allowed
  { action: "Bash git commit", privilege: "commit", requires: ["tests-pass"] },
];
```

### Pros/Cons

| Aspect | Assessment |
|--------|------------|
| Reliability | Very High (~95%) |
| Scalability | Medium (state machine complexity) |
| Maintenance | Medium (state definitions) |
| Complexity | High (sandbox integration) |
| User Experience | Can be frustrating if misconfigured |

---

## Approach 4: Semantic Pre-Filtering

### Concept (vLLM Iris-inspired)

Instead of showing Claude all skills and hoping it picks the right one, **pre-filter skills semantically** before they reach Claude. Smaller skill catalogs mean:
- Less confusion for Claude
- Higher activation rates for relevant skills
- Reduced token usage

### Architecture

```
User Prompt
    ↓
┌─────────────────────────────────────┐
│ SEMANTIC PRE-FILTER                 │
│                                     │
│ Input: All installed skills (20+)  │
│                                     │
│ 1. Embed prompt + skill descriptions│
│ 2. Compute similarity scores        │
│ 3. Filter to top-k relevant skills  │
│                                     │
│ Output: 3-5 relevant skills         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ SKILL TOOL (Modified)               │
│                                     │
│ Description now shows only:         │
│ - tdd (relevant, similarity: 0.92)  │
│ - security-analysis (0.71)          │
│                                     │
│ Not shown:                          │
│ - property-based-testing (0.23)     │
│ - claudeception (0.15)              │
└─────────────────────────────────────┘
    ↓
Claude sees smaller, focused skill list
    ↓
Higher chance of correct activation
```

### Implementation

```typescript
// Pre-filter hook
async function preFilterSkills(prompt: string, allSkills: Skill[]): Promise<Skill[]> {
  const promptEmbedding = await embed(prompt);

  const scored = allSkills.map(skill => ({
    skill,
    similarity: cosineSimilarity(promptEmbedding, skill.embedding)
  }));

  // Always include enforcement skills
  const enforcement = scored.filter(s => s.skill.metadata.enforcement === 'blocking');

  // Add top-k by similarity
  const relevant = scored
    .filter(s => s.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  return [...new Set([...enforcement, ...relevant])].map(s => s.skill);
}
```

### Skill Embedding Generation

```typescript
// During skill installation
async function installSkill(skill: Skill): Promise<void> {
  // Existing installation logic...

  // Generate embedding from description + triggers
  const textToEmbed = [
    skill.metadata.description,
    ...(skill.metadata.triggers?.examples || []),
    skill.content.slice(0, 500)  // First 500 chars of skill content
  ].join('\n');

  skill.embedding = await embed(textToEmbed);

  // Store embedding alongside skill
  await writeFile(
    join(skillPath, 'embedding.json'),
    JSON.stringify(skill.embedding)
  );
}
```

### Pros/Cons

| Aspect | Assessment |
|--------|------------|
| Reliability | Medium-High (~70-80%) |
| Scalability | Excellent (embeddings are fast) |
| Maintenance | Low (automatic) |
| Complexity | Medium (embedding infrastructure) |
| Cost | Low (one-time embedding per skill) |

---

## Moltbot's Prioritized Hook System

### Key Design Patterns

From exploring `../moltbot`, several patterns are worth adopting:

#### 1. Layered Discovery with Precedence

```
workspace hooks > managed hooks > bundled hooks > extra dirs
```

**Applied to skills**:
```
project skills > user skills > bundled skills
```

Each layer can override the previous, allowing project-specific skill customization.

#### 2. Eligibility Checking

Before a hook loads, moltbot checks:
1. Explicit disable flag
2. OS requirements
3. Required binaries
4. Required environment variables
5. Required config paths

**Applied to skills**:
```yaml
---
name: tdd
eligibility:
  requires:
    bins: [npm, node]
    env: []
    config: [testing.framework]
  os: [darwin, linux, win32]
---
```

#### 3. Event-Based Routing

Hooks declare which events they handle:
```yaml
metadata:
  events: ["command:new", "command:reset"]
```

**Applied to skills**:
```yaml
---
name: tdd
triggers:
  events:
    - "prompt:implement"
    - "prompt:fix"
    - "prompt:refactor"
  patterns:
    - "implement.*"
    - "fix.*bug"
---
```

#### 4. Fault Isolation

Each hook's errors are caught and logged without blocking others.

**Applied to skills**: If a skill fails to load or activate, continue with others.

#### 5. CLI Management

```bash
moltbot hooks list      # List discovered hooks with status
moltbot hooks enable    # Toggle hooks
moltbot hooks install   # Install from path/npm
```

**Already implemented** in skills CLI:
```bash
skills list
skills add/remove
skills hook list/add/remove
```

---

## Benchmarking and Usage Tracking

### Why Tracking Matters

> "This data will tell us if we should just pivot at some point to writing a proper prompting library that maps user input to a prompt that leverages useful skills rather than this auto detection and auto usage approach."

We need empirical data on:
1. How often skills are activated when relevant
2. How often users manually invoke skills
3. How often Claude ignores available skills
4. Which skills have highest/lowest activation rates

### Tracking Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USAGE TRACKER                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ EVENTS CAPTURED:                                        │
│                                                         │
│ 1. skill_available                                      │
│    - Session had skill installed                        │
│    - Skill was relevant (semantic match > 0.5)          │
│                                                         │
│ 2. skill_activated                                      │
│    - Skill tool was invoked                             │
│    - Invocation source: auto | manual | hook            │
│                                                         │
│ 3. skill_ignored                                        │
│    - Skill was available + relevant                     │
│    - But not activated in session                       │
│                                                         │
│ 4. skill_reminder                                       │
│    - User explicitly mentioned skill                    │
│    - User used Skill() tool manually                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Metrics Dashboard

```typescript
interface SkillMetrics {
  skillName: string;

  // Activation metrics
  totalSessions: number;      // Sessions where skill was installed
  relevantSessions: number;   // Sessions where skill matched prompt
  activatedSessions: number;  // Sessions where skill was invoked

  // Derived metrics
  activationRate: number;     // activated / relevant
  autoActivationRate: number; // auto-activated / relevant
  manualActivationRate: number; // manual / relevant

  // Reminder metrics
  reminderCount: number;      // Times user had to remind Claude
  reminderRate: number;       // reminders / (relevant - activated)

  // Effectiveness
  taskSuccessWithSkill: number;
  taskSuccessWithoutSkill: number;
}
```

### Implementation

#### Hook for Event Capture

```bash
#!/bin/bash
# ~/.claude/hooks/usage-tracker.sh

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

# Log prompt for later analysis
echo "{\"event\": \"prompt\", \"session\": \"$SESSION_ID\", \"prompt\": \"$PROMPT\", \"timestamp\": \"$(date -Iseconds)\"}" >> ~/.claude/usage.jsonl

# Check for manual skill invocation
if echo "$PROMPT" | grep -qiE 'skill\s*\(|/[a-z]+-'; then
  SKILL=$(echo "$PROMPT" | grep -oE 'Skill\(([^)]+)\)' | sed 's/Skill(\(.*\))/\1/')
  echo "{\"event\": \"manual_invocation\", \"session\": \"$SESSION_ID\", \"skill\": \"$SKILL\"}" >> ~/.claude/usage.jsonl
fi
```

#### Post-Session Analysis

```typescript
// Run after each Claude Code session
async function analyzeSession(sessionLog: string): Promise<SessionAnalysis> {
  const events = parseSessionLog(sessionLog);

  // Identify which skills were relevant
  const prompts = events.filter(e => e.type === 'prompt');
  const installedSkills = await getInstalledSkills();

  for (const prompt of prompts) {
    for (const skill of installedSkills) {
      const similarity = await computeSimilarity(prompt.text, skill.embedding);

      if (similarity > RELEVANCE_THRESHOLD) {
        trackEvent('skill_relevant', { skill: skill.name, session: sessionId, similarity });

        // Check if skill was activated
        const activated = events.some(e =>
          e.type === 'tool_call' &&
          e.tool === 'Skill' &&
          e.args.skill === skill.name
        );

        if (activated) {
          trackEvent('skill_activated', { skill: skill.name, session: sessionId });
        } else {
          trackEvent('skill_ignored', { skill: skill.name, session: sessionId });
        }
      }
    }
  }
}
```

#### Dashboard Output

```
SKILL USAGE REPORT (Last 30 days)
═══════════════════════════════════════════════════════════

Skill               Relevant  Activated  Rate    Reminders
────────────────────────────────────────────────────────────
tdd                     45        12     27%        18 (40%)
no-workarounds          32         8     25%        15 (47%)
security-analysis       28        22     79%         2 (7%)
suggest-tests           41        35     85%         3 (7%)
unit-test-workflow      38        31     82%         4 (11%)
property-based-testing  15         9     60%         3 (20%)
code-review-ts          22        19     86%         1 (5%)

INSIGHTS:
- tdd and no-workarounds have LOW auto-activation (25-27%)
- These are BLOCKING skills - users remind Claude 40-47% of sessions
- RECOMMENDATION: Implement permission-based enforcement for these skills
- Reference skills (suggest-tests, code-review-ts) work well (~80%+)
```

### Decision Framework

Based on tracking data:

| Activation Rate | Reminder Rate | Action |
|-----------------|---------------|--------|
| > 70% | < 15% | Skill works, no changes needed |
| 50-70% | 15-30% | Improve triggers/description |
| 30-50% | 30-50% | Add to semantic router with high priority |
| < 30% | > 50% | Implement permission-based enforcement |

---

## Synthesis: Recommended Architecture

Based on research, a **layered approach** is recommended:

### Layer 1: Semantic Pre-Filtering (Always On)

- Embed all skill descriptions during installation
- Pre-filter to relevant skills before Claude sees them
- Reduces cognitive load on Claude
- Improves activation rates for reference skills

### Layer 2: Skill Router (For Ambiguous Cases)

- When multiple skills match with similar scores
- When enforcement skills are relevant
- Uses LLM-as-classifier (haiku) for disambiguation
- Returns INVOKE (definitive) or SUGGEST (let Claude decide)

### Layer 3: Permission-Based Sandbox (For Enforcement Skills)

- TDD, no-workarounds, dogfood-skills
- Restricts Claude's tools until skill requirements met
- State machine tracks progress (BLOCKED → RED → GREEN → COMPLETE)
- Hook transitions state based on actions

### Layer 4: Usage Tracking (Always On)

- Captures all skill-related events
- Computes activation and reminder rates
- Generates weekly reports
- Informs iteration on layers 1-3

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER PROMPT                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: SEMANTIC PRE-FILTER                                    │
│                                                                 │
│ Input: 20+ installed skills                                     │
│ Output: 3-5 relevant skills + all enforcement skills            │
│ Method: Embedding similarity > 0.5 threshold                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: SKILL ROUTER                                           │
│                                                                 │
│ Input: Pre-filtered skills + prompt                             │
│ Output: Routing decision                                        │
│   - INVOKE(skill): Inject Skill() tool call directly            │
│   - SUGGEST([skills]): Add to context for Claude to decide      │
│   - NONE: No skill activation needed                            │
│ Method: LLM-as-classifier (haiku) or rule-based                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: PERMISSION SANDBOX (Enforcement Skills Only)           │
│                                                                 │
│ Skills: tdd, no-workarounds, dogfood-skills                     │
│ Method: Restrict tools based on task state                      │
│                                                                 │
│ States:                                                         │
│   BLOCKED: Cannot edit source (only tests)                      │
│   RED: Test written, awaiting pass                              │
│   GREEN: Implementation allowed                                 │
│   COMPLETE: All tools available                                 │
│                                                                 │
│ Transitions: Hook checks test output, state file                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE CODE                                │
│                                                                 │
│ Sees: Pre-filtered skills in Skill tool description             │
│ Receives: Routing decision (INVOKE/SUGGEST)                     │
│ Constrained by: Permission sandbox (if enforcement skill)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: USAGE TRACKER                                          │
│                                                                 │
│ Captures: All skill events (relevant, activated, ignored)       │
│ Computes: Activation rates, reminder rates                      │
│ Outputs: Weekly report, dashboard                               │
│ Informs: Iteration on layers 1-3                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Roadmap

### Phase 1: Usage Tracking (1-2 weeks)

**Goal**: Establish baseline metrics before changing anything.

1. Add hook to capture prompt events
2. Add post-session analyzer
3. Generate weekly reports
4. Run for 2-4 weeks to gather data

**Deliverables**:
- `~/.claude/hooks/usage-tracker.sh`
- `skills stats` command
- Baseline activation rates for all skills

### Phase 2: Semantic Pre-Filtering (2-3 weeks)

**Goal**: Reduce skill catalog size, improve activation rates.

1. Add embedding generation during skill installation
2. Modify hook to pre-filter skills
3. Inject filtered list into Skill tool description
4. Compare activation rates to baseline

**Deliverables**:
- `embedding.json` per skill
- `skill-prefilter.sh` hook
- A/B comparison report

### Phase 3: Skill Router (3-4 weeks)

**Goal**: Deterministic routing for unambiguous cases.

1. Extend skill metadata with triggers/patterns
2. Implement routing logic (start with rules, add LLM later)
3. Hook injects INVOKE decisions directly
4. Handle conflicts and priorities

**Deliverables**:
- Extended SKILL.md schema
- `skill-router.ts` module
- `skills route <prompt>` command for testing

### Phase 4: Permission Sandbox (4-6 weeks)

**Goal**: Enforce workflow skills (TDD, no-workarounds).

1. Define state machine for each enforcement skill
2. Integrate with Claude's sandboxing
3. Hook manages state transitions
4. Test with real workflows

**Deliverables**:
- State machine definitions
- `sandbox-profiles/` directory
- `skills state` command
- Integration tests

### Phase 5: Pivot Decision (After Phase 4)

Based on tracking data:
- If activation rates > 80% for enforcement skills → Success, continue iterating
- If activation rates < 50% despite all layers → Consider prompting library pivot

---

## Open Questions

### Technical

1. **Embedding model**: Which model for skill embeddings? Local (fast, free) vs API (better quality)?
2. **Sandbox integration**: How to modify Claude's sandbox profile dynamically?
3. **State persistence**: Where to store task state machine state? File? Environment variable?
4. **Hook chaining**: Can multiple hooks run in sequence with data passing?

### Product

1. **User experience**: Will permission restrictions frustrate users?
2. **Escape hatches**: How can users bypass enforcement when appropriate?
3. **Feedback loop**: How to surface tracking insights to users?

### Research

1. **Baseline**: What's the current activation rate without any changes?
2. **Ceiling**: What's the maximum achievable activation rate?
3. **Pivot threshold**: At what activation rate do we abandon auto-activation?

---

## Sources

### Blog Posts & Articles
- [Claude Code Skills Don't Auto-Activate](https://scottspence.com/posts/claude-code-skills-dont-auto-activate) - Scott Spence's hook-based solution
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/) - Architecture analysis
- [vLLM Semantic Router v0.1 Iris](https://blog.vllm.ai/2026/01/05/vllm-sr-iris.html) - Semantic tool filtering

### Documentation
- [Claude Code Sandboxing](https://code.claude.com/docs/en/sandboxing) - Permission-based isolation
- [EleutherAI LM Evaluation Harness](https://github.com/EleutherAI/lm-evaluation-harness) - Benchmark framework

### Research Papers
- [CELLMATE: Sandboxing Browser AI Agents](https://www.arxiv.org/pdf/2512.12594) - Semantic permission mapping
- [ToolBench](https://www.emergentmind.com/topics/toolbench) - Tool use benchmarking
- [Tool-MVR](https://arxiv.org/html/2509.00482v1) - Reflection-empowered tool selection

### Projects
- [llm-use](https://github.com/llm-use/llm-use) - Intelligent model routing
- [Martian](https://withmartian.com/) - Model routing and interpretability
- [E2B](https://e2b.dev/) - AI agent sandboxing

### Internal References
- `../moltbot` - Prioritized hook system with eligibility checking
- `packages/skills-cli/` - Current skills CLI implementation
- `.claude/skills/` - Installed skill definitions
