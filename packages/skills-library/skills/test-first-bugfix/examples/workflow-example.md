# Test-First Bug Fixing: Complete Example

## Scenario

A user reports: "The email validation allows invalid emails without a TLD"

## Step 1: Identify and Describe the Bug

**Bug Description:**
The `validateEmail` function in `src/utils/validation.ts` incorrectly accepts email addresses that don't have a top-level domain (TLD).

**Expected behavior:** `user@domain` should be rejected
**Actual behavior:** `user@domain` is accepted as valid

**Affected code:**
```typescript
// src/utils/validation.ts:15
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+$/;
  return regex.test(email);
}
```

## Step 2: Write Regression Tests

```typescript
// tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '../src/utils/validation';

describe('validateEmail', () => {
  // Existing passing tests
  it('accepts valid email with TLD', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  // New regression tests for the bug
  it('rejects email without TLD', () => {
    expect(validateEmail('user@domain')).toBe(false);
  });

  it('rejects email with only domain name', () => {
    expect(validateEmail('user@localhost')).toBe(false);
  });

  it('accepts email with subdomain', () => {
    expect(validateEmail('user@mail.example.com')).toBe(true);
  });
});
```

## Step 3: Show Failure Mode

```bash
$ npm test

 FAIL  tests/validation.test.ts
  validateEmail
    ✓ accepts valid email with TLD
    ✗ rejects email without TLD
      Expected: false
      Received: true
    ✗ rejects email with only domain name
      Expected: false
      Received: true
    ✓ accepts email with subdomain

Tests: 2 failed, 2 passed, 4 total
```

**Analysis:** Tests correctly fail because the current regex doesn't require a TLD.

## Step 4: Tests as Correctness Oracle

The tests now define what "fixed" means:
- `user@domain` → `false`
- `user@localhost` → `false`
- `user@example.com` → `true`
- `user@mail.example.com` → `true`

## Step 5: Implement Minimal Patch

```typescript
// src/utils/validation.ts:15
export function validateEmail(email: string): boolean {
  // Updated regex to require at least one dot after @
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

**Note:** This is the minimal change. We did NOT:
- Refactor the function
- Add additional validation
- Change the function signature
- Add comments or documentation

## Step 6: Confirm Tests Pass

```bash
$ npm test

 PASS  tests/validation.test.ts
  validateEmail
    ✓ accepts valid email with TLD
    ✓ rejects email without TLD
    ✓ rejects email with only domain name
    ✓ accepts email with subdomain

Tests: 4 passed, 4 total
```

## Summary

| Step | Action | Outcome |
|------|--------|---------|
| 1 | Described bug | Clear understanding |
| 2 | Wrote 2 failing tests | Reproducible failure |
| 3 | Ran tests | Confirmed failure |
| 4 | Defined success criteria | Tests are the oracle |
| 5 | One-line regex fix | Minimal change |
| 6 | Ran tests | All pass |

Total lines changed: 1
Confidence in fix: High (test-verified)
