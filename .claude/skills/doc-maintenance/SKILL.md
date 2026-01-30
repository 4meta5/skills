---
name: doc-maintenance
description: |
  Automatic documentation updates after task completion. Use when:
  (1) completing tasks, (2) adding features, (3) fixing bugs,
  (4) refactoring code. Updates PLAN.md with completed items and
  README.md when features change.
category: documentation
user-invocable: true
---

# Documentation Maintenance

Automatically updates project documentation after task completion.

## Trigger Conditions

Invoke after:
- Completing any task
- Adding a new feature
- Fixing a bug
- Refactoring code
- Resolving a blocked item

Also invoke explicitly with:
- `/doc-maintenance`
- "update documentation"
- "sync docs"

## Procedure

### Step 1: Read Current State

Read these files:
- PLAN.md (current tasks and status)
- README.md (feature documentation)
- Recent git commits (what changed)

### Step 2: Analyze Changes

Determine what was accomplished:
- Which PLAN.md items are now complete?
- Were new features added?
- Were bugs fixed?
- Did refactoring occur?
- Were new issues discovered?

### Step 3: Update PLAN.md

**Mark completed items:**
```markdown
## Current Sprint
- [x] Implement user authentication  # Was [ ]
- [ ] Add password reset flow
```

**Add discovered work:**
```markdown
## Backlog
- [ ] Discovered: Need rate limiting for auth endpoints
- [ ] Tech debt: Refactor auth middleware
```

**Move completed items:**
```markdown
## Completed
- [x] Implement user authentication (2026-01-30)
```

**Update blocked items:**
```markdown
## Blocked
- Password reset: Waiting for email service setup
```

### Step 4: Update README.md (If Features Changed)

**When to update README.md:**
- New user-facing feature added
- API changed
- New command available
- Installation steps changed

**What to update:**
- Features list
- Usage examples
- API reference
- Installation instructions

### Step 5: Report Changes

Output a summary:

```
Documentation updated:

PLAN.md:
  - Marked complete: "Implement user authentication"
  - Added to backlog: "Need rate limiting for auth endpoints"
  - Moved to completed: 1 item

README.md:
  - Updated features list with authentication
  - Added auth usage example
```

## Update Patterns

### Marking Tasks Complete

**Before:**
```markdown
- [ ] Implement feature X
```

**After:**
```markdown
- [x] Implement feature X
```

### Adding Discovered Work

When you discover new tasks during implementation:

```markdown
## Backlog
- [ ] (discovered) New task from implementation
- [ ] (tech debt) Code that needs cleanup
- [ ] (bug) Issue found during testing
```

### Timestamping Completed Items

Add date to completed items:

```markdown
## Completed
- [x] Task description (2026-01-30)
```

### Feature Documentation

When adding a feature to README.md:

```markdown
## Features

- **Authentication**: Secure user login with JWT tokens
- **Password Reset**: Email-based password recovery
```

## Skill Chaining

### After TDD Completion

When TDD workflow completes (GREEN phase):
1. Mark the related PLAN.md task as complete
2. Add any discovered edge cases to backlog

### After Bug Fix

When a bug is fixed:
1. Mark bug item as complete in PLAN.md
2. Add regression test to PLAN.md if not present

### After Refactoring

When refactoring completes:
1. Mark refactoring task as complete
2. Update any affected API documentation

### Terminal Chain

After any documentation update: **repo-hygiene** (clean stale references)

## Rationalizations (Do Not Skip)

| Rationalization | Why It's Wrong | Required Action |
|-----------------|----------------|-----------------|
| "Too small to document" | Small changes accumulate | Update PLAN.md |
| "I'll remember" | Context is lost between sessions | Write it down |
| "README is fine" | Feature docs get stale | Verify accuracy |
| "Just a bug fix" | Bugs deserve tracking | Mark complete |

## Example Session

**Task:** Add user authentication

**After completion:**

```
/doc-maintenance

Analyzing changes...

Found:
- New auth middleware in src/middleware/auth.ts
- New login endpoint in src/routes/auth.ts
- 5 new test files
- Git commit: "Add JWT authentication"

Updates:

PLAN.md:
  Current Sprint:
    - [x] Implement user authentication
  Backlog:
    + [ ] (discovered) Add refresh token support
    + [ ] (discovered) Rate limit login attempts

README.md:
  Features:
    + Authentication: JWT-based user authentication
  Usage:
    + Added auth example code
```

## Notes

- Never removes items from PLAN.md (only marks complete)
- Preserves existing formatting
- Adds timestamps to completed items
- Creates backlog items for discovered work
- Only updates README.md when features change
