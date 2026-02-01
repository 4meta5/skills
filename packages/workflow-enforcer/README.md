# @4meta5/workflow-enforcer

State machine for workflow enforcement. Enforce development practices like TDD, code review gates, and documentation-first workflows.

## Installation

```bash
npm install @4meta5/workflow-enforcer
```

## Quick Start

```typescript
import { createEnforcer, TDD_PROFILE } from '@4meta5/workflow-enforcer';

const enforcer = createEnforcer(TDD_PROFILE);

// Check if an intent is allowed in current phase
const result = enforcer.isAllowed('write_impl');
if (!result.allowed) {
  console.log('Blocked:', result.reason);
  // "Blocked in phase 'red': write_impl blocked until failing_test is satisfied"
}

// Satisfy a capability to advance phases
enforcer.transition({
  type: 'capability_satisfied',
  capability: 'failing_test',
  evidence: {
    satisfiedBy: 'vitest',
    evidenceType: 'command_success',
  },
});

// Now write_impl is allowed (in GREEN phase)
console.log(enforcer.isAllowed('write_impl')); // { allowed: true, ... }
```

## Pre-built Profiles

### TDD Profile

Enforces RED → GREEN → REFACTOR cycle:

| Phase | Allowed | Blocked | Advances When |
|-------|---------|---------|---------------|
| RED | write_test, read, run | write_impl, commit | failing_test satisfied |
| GREEN | write_impl, write_test, read, run | commit | passing_test satisfied |
| REFACTOR | write_impl, commit, read, run | (none) | refactored satisfied |

```typescript
import { TDD_PROFILE, createEnforcer } from '@4meta5/workflow-enforcer';

const enforcer = createEnforcer(TDD_PROFILE);
```

### Code Review Profile

Advisory mode for review-before-merge workflows:

| Phase | Blocked | Advances When |
|-------|---------|---------------|
| draft | push | code_complete satisfied |
| review | deploy | review_passed satisfied |
| approved | (none) | - |

```typescript
import { CODE_REVIEW_PROFILE, createEnforcer } from '@4meta5/workflow-enforcer';

const enforcer = createEnforcer(CODE_REVIEW_PROFILE);
```

### Docs First Profile

Write documentation before implementation:

| Phase | Blocked | Advances When |
|-------|---------|---------------|
| spec | write_impl | spec_complete satisfied |
| implement | commit | implementation_complete satisfied |
| complete | (none) | - |

### No Workarounds Profile

Prevents manual workarounds when building tools:

| Phase | Blocked | Advances When |
|-------|---------|---------------|
| building | (none) | tool_working satisfied |
| verified | (none) | - |

## Strictness Modes

| Mode | Behavior |
|------|----------|
| strict | Blocked intents return `allowed: false` |
| advisory | Blocked intents return `allowed: true` with warning |
| permissive | All intents allowed |

## Intent Classification

Classify file operations into intents:

```typescript
import {
  classifyFile,
  classifyWriteIntent,
  classifyToolIntent,
} from '@4meta5/workflow-enforcer';

// Classify by file path
classifyFile('src/utils.test.ts'); // 'test'
classifyFile('README.md'); // 'docs'
classifyFile('package.json'); // 'config'
classifyFile('src/utils.ts'); // 'impl'

// Get write intent for a file
classifyWriteIntent('src/utils.test.ts'); // 'write_test'
classifyWriteIntent('src/utils.ts'); // 'write_impl'

// Classify tool calls
classifyToolIntent('write', { file_path: 'src/utils.ts' }); // 'write_impl'
classifyToolIntent('bash', { command: 'npm test' }); // 'run'
classifyToolIntent('bash', { command: 'git commit -m "test"' }); // 'commit'
```

## Profile Matching

Match user prompts to profiles:

```typescript
import { matchProfile, getProfile, listProfiles } from '@4meta5/workflow-enforcer';

// Match from natural language
matchProfile('use tdd workflow'); // TDD_PROFILE
matchProfile('code review please'); // CODE_REVIEW_PROFILE
matchProfile('docs first approach'); // DOCS_FIRST_PROFILE

// Get profile by name
getProfile('tdd'); // TDD_PROFILE

// List all profile names
listProfiles(); // ['tdd', 'code-review', 'docs-first', 'no-workarounds']
```

## Custom Profiles

Create custom workflow profiles:

```typescript
import { createEnforcer } from '@4meta5/workflow-enforcer';
import type { EnforcerProfile } from '@4meta5/workflow-enforcer';

const myProfile: EnforcerProfile = {
  name: 'my-workflow',
  strictness: 'strict',
  initialPhase: 'planning',
  phases: {
    planning: {
      name: 'planning',
      provides: ['plan_complete'],
      requires: [],
      blockedIntents: ['write_impl'],
      allowedIntents: ['write_docs', 'read'],
    },
    implementing: {
      name: 'implementing',
      provides: ['impl_complete'],
      requires: ['plan_complete'],
      blockedIntents: [],
      allowedIntents: ['write_impl', 'write_test', 'commit'],
    },
  },
  matchPatterns: ['my workflow', 'planning first'],
};

const enforcer = createEnforcer(myProfile);
```

## API Reference

### createEnforcer(profile)

Create an enforcer instance from a profile.

### Enforcer Methods

| Method | Description |
|--------|-------------|
| `isAllowed(intent)` | Check if intent is allowed in current phase |
| `transition(event)` | Process workflow event and update state |
| `getState()` | Get current enforcer state |
| `getCurrentPhase()` | Get current phase definition |
| `getBlockedReason(intent)` | Get reason why intent is blocked |
| `getUnsatisfiedCapabilities()` | List capabilities not yet satisfied |
| `isCapabilitySatisfied(cap)` | Check if capability is satisfied |
| `reset()` | Reset to initial state |

### Workflow Events

```typescript
// Satisfy a capability
enforcer.transition({
  type: 'capability_satisfied',
  capability: 'failing_test',
  evidence: {
    satisfiedBy: 'vitest',
    evidenceType: 'command_success',
    evidencePath: 'src/test.ts',
  },
});

// Complete a phase directly
enforcer.transition({
  type: 'phase_complete',
  phase: 'red',
});
```

## Types

All types are exported for TypeScript users:

```typescript
import type {
  Enforcer,
  EnforcerProfile,
  EnforcerState,
  Phase,
  Intent,
  Strictness,
  WorkflowEvent,
  IntentCheckResult,
  CapabilityEvidence,
} from '@4meta5/workflow-enforcer';
```

## License

MIT
