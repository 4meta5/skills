/**
 * Tests for Enhanced Error Messages
 *
 * PHASE 1: RED - Writing failing tests first
 */

import { describe, it, expect } from 'vitest';
import { formatValidationError, formatRetryPrompt } from './error-messages.js';
import type { ValidationError } from './error-messages.js';

describe('formatValidationError', () => {
  it('should format validation error with missing and found skills', () => {
    const error: ValidationError = {
      missingSkills: ['tdd', 'no-workarounds'],
      foundSkills: ['code-review'],
      attemptNumber: 2,
      maxAttempts: 3,
    };

    const result = formatValidationError(error);

    expect(result).toContain('VALIDATION FAILURE');
    expect(result).toContain('Required skill invocation missing');
    expect(result).toContain('Missing: tdd, no-workarounds');
    expect(result).toContain('Found: code-review');
    expect(result).toContain('Attempt: 2/3');
  });

  it('should handle single missing skill', () => {
    const error: ValidationError = {
      missingSkills: ['tdd'],
      foundSkills: [],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatValidationError(error);

    expect(result).toContain('Missing: tdd');
    expect(result).toContain('Attempt: 1/3');
  });

  it('should handle empty found skills', () => {
    const error: ValidationError = {
      missingSkills: ['tdd'],
      foundSkills: [],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatValidationError(error);

    // Should indicate no skills found
    expect(result).toContain('Found: (none)');
  });

  it('should handle multiple found skills', () => {
    const error: ValidationError = {
      missingSkills: ['tdd'],
      foundSkills: ['code-review', 'security-analysis'],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatValidationError(error);

    expect(result).toContain('Found: code-review, security-analysis');
  });

  it('should handle empty missing skills gracefully', () => {
    const error: ValidationError = {
      missingSkills: [],
      foundSkills: ['tdd'],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatValidationError(error);

    expect(result).toContain('Missing: (none)');
  });
});

describe('formatRetryPrompt', () => {
  it('should format retry prompt with skill invocation instructions', () => {
    const error: ValidationError = {
      missingSkills: ['tdd', 'no-workarounds'],
      foundSkills: ['code-review'],
      attemptNumber: 2,
      maxAttempts: 3,
    };

    const result = formatRetryPrompt(error);

    expect(result).toContain('You MUST invoke:');
    expect(result).toContain('- Skill(skill: "tdd")');
    expect(result).toContain('- Skill(skill: "no-workarounds")');
  });

  it('should format retry prompt for single missing skill', () => {
    const error: ValidationError = {
      missingSkills: ['tdd'],
      foundSkills: [],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatRetryPrompt(error);

    expect(result).toContain('You MUST invoke:');
    expect(result).toContain('- Skill(skill: "tdd")');
  });

  it('should combine validation error and retry prompt in expected format', () => {
    const error: ValidationError = {
      missingSkills: ['tdd', 'no-workarounds'],
      foundSkills: ['code-review'],
      attemptNumber: 2,
      maxAttempts: 3,
    };

    const validationPart = formatValidationError(error);
    const retryPart = formatRetryPrompt(error);
    const combined = `${validationPart}\n\n${retryPart}`;

    // Verify the combined output matches the expected format from requirements
    expect(combined).toContain('VALIDATION FAILURE: Required skill invocation missing.');
    expect(combined).toContain('Missing: tdd, no-workarounds');
    expect(combined).toContain('Found: code-review');
    expect(combined).toContain('Attempt: 2/3');
    expect(combined).toContain('You MUST invoke:');
    expect(combined).toContain('- Skill(skill: "tdd")');
    expect(combined).toContain('- Skill(skill: "no-workarounds")');
  });

  it('should handle empty missing skills', () => {
    const error: ValidationError = {
      missingSkills: [],
      foundSkills: ['tdd'],
      attemptNumber: 1,
      maxAttempts: 3,
    };

    const result = formatRetryPrompt(error);

    // When no missing skills, the prompt should still be valid
    expect(result).toContain('You MUST invoke:');
    // No skill items should be listed
    expect(result).not.toContain('Skill(skill:');
  });
});
