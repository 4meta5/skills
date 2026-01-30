/**
 * Tests for Schema Validator
 *
 * TDD: RED phase - these tests define the expected behavior
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  validateToolCall,
  formatSchemaError,
  SkillInvocationSchema,
  type ValidationResult,
} from './schema-validator.js';

describe('SkillInvocationSchema', () => {
  it('should validate skill name is non-empty', () => {
    const validCall = { skill: 'tdd' };
    const result = SkillInvocationSchema.safeParse(validCall);

    expect(result.success).toBe(true);
  });

  it('should reject empty skill name', () => {
    const invalidCall = { skill: '' };
    const result = SkillInvocationSchema.safeParse(invalidCall);

    expect(result.success).toBe(false);
  });

  it('should allow optional args field', () => {
    const callWithArgs = { skill: 'tdd', args: '--verbose' };
    const result = SkillInvocationSchema.safeParse(callWithArgs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.args).toBe('--verbose');
    }
  });

  it('should allow missing args field', () => {
    const callWithoutArgs = { skill: 'tdd' };
    const result = SkillInvocationSchema.safeParse(callWithoutArgs);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.args).toBeUndefined();
    }
  });

  it('should reject unknown fields in strict mode', () => {
    const callWithExtra = { skill: 'tdd', args: 'test', unknownField: 'value' };
    const result = SkillInvocationSchema.safeParse(callWithExtra);

    expect(result.success).toBe(false);
  });
});

describe('validateToolCall', () => {
  it('should return success for valid tool calls', () => {
    const validCall = { skill: 'property-based-testing', args: '--verbose' };
    const result = validateToolCall(validCall);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validCall);
    expect(result.error).toBeUndefined();
  });

  it('should return success for valid call without args', () => {
    const validCall = { skill: 'tdd' };
    const result = validateToolCall(validCall);

    expect(result.success).toBe(true);
    expect(result.data?.skill).toBe('tdd');
  });

  it('should return error for empty skill name', () => {
    const invalidCall = { skill: '' };
    const result = validateToolCall(invalidCall);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('should handle null gracefully', () => {
    const result = validateToolCall(null);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle undefined gracefully', () => {
    const result = validateToolCall(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle non-object input gracefully', () => {
    const result = validateToolCall('string-input');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject calls with unknown fields', () => {
    const callWithExtra = { skill: 'tdd', extra: 'field' };
    const result = validateToolCall(callWithExtra);

    expect(result.success).toBe(false);
    expect(result.error).toContain('unknown');
  });
});

describe('formatSchemaError', () => {
  it('should format Zod errors as actionable messages', () => {
    const schema = z.object({
      skill: z.string().min(1, 'Skill name is required'),
    });

    const result = schema.safeParse({ skill: '' });
    if (!result.success) {
      const formatted = formatSchemaError(result.error);

      expect(formatted).toContain('skill');
      expect(formatted).toContain('required');
    }
  });

  it('should handle multiple validation errors', () => {
    const schema = z.object({
      skill: z.string().min(1),
      count: z.number().positive(),
    });

    const result = schema.safeParse({ skill: '', count: -1 });
    if (!result.success) {
      const formatted = formatSchemaError(result.error);

      // Should mention both fields
      expect(formatted).toContain('skill');
      expect(formatted).toContain('count');
    }
  });

  it('should include field paths in error messages', () => {
    const schema = z.object({
      nested: z.object({
        field: z.string().min(1),
      }),
    });

    const result = schema.safeParse({ nested: { field: '' } });
    if (!result.success) {
      const formatted = formatSchemaError(result.error);

      expect(formatted).toContain('nested');
      expect(formatted).toContain('field');
    }
  });

  it('should provide actionable error descriptions', () => {
    const schema = z.object({
      skill: z.string().min(1),
    }).strict();

    const result = schema.safeParse({ skill: 'test', unknown: 'field' });
    if (!result.success) {
      const formatted = formatSchemaError(result.error);

      // Should indicate the issue is about unknown keys
      expect(formatted.toLowerCase()).toMatch(/unknown|unrecognized/);
    }
  });
});
