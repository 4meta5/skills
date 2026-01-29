---
name: test-first-bugfix
description: Enforces test-first bug fixing workflow. Use when fixing bugs to ensure regression tests exist before implementing fixes. Blocks progress until failing tests are written.
category: testing
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash, Write, Edit
---

# Test-First Bug Fixing Workflow

You are not allowed to write or suggest a fix until regression tests exist.

## Strict Workflow (Do Not Skip or Compress Steps)

### Step 1: Identify and Describe the Bug
- Clearly articulate the bug behavior
- Document the expected vs actual behavior
- Identify affected code paths

### Step 2: Write Regression Tests
- Write tests that FAIL on the current code
- Tests must reproduce the exact bug condition
- Cover edge cases related to the bug

### Step 3: Show Failure Mode
- Run the tests and capture failure output
- Document the specific assertion failures
- Confirm tests fail for the right reason

### Step 4: Tests as Correctness Oracle
- Use ONLY the tests to validate correctness
- No manual verification or "looks right" assessments
- The tests define what "fixed" means

### Step 5: Implement Minimal Patch
- Write the smallest change that makes tests pass
- Do not refactor unrelated code
- Do not add unrelated improvements

### Step 6: Confirm Tests Pass
- Re-run all tests
- Verify the previously failing tests now pass
- Ensure no regressions in existing tests

## Blocking Conditions

If Step 2 (regression tests) is missing or incomplete:
- Respond ONLY with: **"BLOCKED: REGRESSION TESTS REQUIRED"**
- Do not proceed to any subsequent steps
- Do not offer alternative approaches

## Examples

### Good Workflow
1. "Bug: Login fails when email contains '+'"
2. Write test: `expect(login("user+test@example.com")).resolves.toBeDefined()`
3. Run test, see failure
4. Fix email validation regex
5. Run test, see pass

### Blocked Workflow
User: "Fix the login bug"
Response: "BLOCKED: REGRESSION TESTS REQUIRED. Please provide or allow me to write tests that reproduce this login bug before proceeding with a fix."
