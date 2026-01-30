/**
 * Tests for Structured Detector
 *
 * TDD: RED phase - these tests define the expected behavior
 * for parsing Claude structured outputs and detecting skill invocations.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  parseStructuredResponse,
  detectSkillInvocations,
  isValidToolCall,
  ToolCallSchema,
  type ToolCallAction,
} from './structured-detector.js';

describe('ToolCallSchema', () => {
  it('should validate invoke_skill action with skill name', () => {
    const action = { action: 'invoke_skill', skill: 'tdd' };
    const result = ToolCallSchema.safeParse(action);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('invoke_skill');
      expect(result.data.skill).toBe('tdd');
    }
  });

  it('should validate respond action with response text', () => {
    const action = { action: 'respond', response: 'Hello, world!' };
    const result = ToolCallSchema.safeParse(action);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('respond');
      expect(result.data.response).toBe('Hello, world!');
    }
  });

  it('should validate request_info action', () => {
    const action = { action: 'request_info', response: 'What file should I edit?' };
    const result = ToolCallSchema.safeParse(action);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('request_info');
    }
  });

  it('should reject unknown action types', () => {
    const action = { action: 'unknown_action' };
    const result = ToolCallSchema.safeParse(action);

    expect(result.success).toBe(false);
  });

  it('should allow skill field to be optional for non-invoke actions', () => {
    const action = { action: 'respond', response: 'Done!' };
    const result = ToolCallSchema.safeParse(action);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skill).toBeUndefined();
    }
  });
});

describe('parseStructuredResponse', () => {
  it('should extract tool calls from valid JSON', () => {
    const response = JSON.stringify([
      { action: 'invoke_skill', skill: 'tdd' },
    ]);

    const actions = parseStructuredResponse(response);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('invoke_skill');
    expect(actions[0].skill).toBe('tdd');
  });

  it('should handle multiple actions in one response', () => {
    const response = JSON.stringify([
      { action: 'invoke_skill', skill: 'security-analysis' },
      { action: 'respond', response: 'Running security check...' },
      { action: 'invoke_skill', skill: 'tdd' },
    ]);

    const actions = parseStructuredResponse(response);

    expect(actions).toHaveLength(3);
    expect(actions[0].skill).toBe('security-analysis');
    expect(actions[1].action).toBe('respond');
    expect(actions[2].skill).toBe('tdd');
  });

  it('should handle a single action object (not array)', () => {
    const response = JSON.stringify({ action: 'invoke_skill', skill: 'tdd' });

    const actions = parseStructuredResponse(response);

    expect(actions).toHaveLength(1);
    expect(actions[0].skill).toBe('tdd');
  });

  it('should return empty array for malformed JSON', () => {
    const response = 'not valid json {{{';

    const actions = parseStructuredResponse(response);

    expect(actions).toEqual([]);
  });

  it('should return empty array for empty response', () => {
    const actions = parseStructuredResponse('');

    expect(actions).toEqual([]);
  });

  it('should filter out invalid actions from response', () => {
    const response = JSON.stringify([
      { action: 'invoke_skill', skill: 'tdd' },
      { action: 'invalid_action' }, // Should be filtered
      { action: 'respond', response: 'Done!' },
    ]);

    const actions = parseStructuredResponse(response);

    expect(actions).toHaveLength(2);
    expect(actions[0].action).toBe('invoke_skill');
    expect(actions[1].action).toBe('respond');
  });

  it('should handle JSON with extra whitespace', () => {
    const response = `
      [
        { "action": "invoke_skill", "skill": "tdd" }
      ]
    `;

    const actions = parseStructuredResponse(response);

    expect(actions).toHaveLength(1);
    expect(actions[0].skill).toBe('tdd');
  });

  it('should handle null response', () => {
    const actions = parseStructuredResponse(null as unknown as string);

    expect(actions).toEqual([]);
  });
});

describe('detectSkillInvocations', () => {
  it('should return skill names from invoke_skill actions', () => {
    const actions: ToolCallAction[] = [
      { action: 'invoke_skill', skill: 'tdd' },
      { action: 'respond', response: 'Done!' },
      { action: 'invoke_skill', skill: 'security-analysis' },
    ];

    const skills = detectSkillInvocations(actions);

    expect(skills).toEqual(['tdd', 'security-analysis']);
  });

  it('should return empty array when no skill invocations', () => {
    const actions: ToolCallAction[] = [
      { action: 'respond', response: 'Hello!' },
      { action: 'request_info', response: 'What file?' },
    ];

    const skills = detectSkillInvocations(actions);

    expect(skills).toEqual([]);
  });

  it('should return empty array for empty actions list', () => {
    const skills = detectSkillInvocations([]);

    expect(skills).toEqual([]);
  });

  it('should preserve order of skill invocations', () => {
    const actions: ToolCallAction[] = [
      { action: 'invoke_skill', skill: 'first' },
      { action: 'invoke_skill', skill: 'second' },
      { action: 'invoke_skill', skill: 'third' },
    ];

    const skills = detectSkillInvocations(actions);

    expect(skills).toEqual(['first', 'second', 'third']);
  });

  it('should filter out invoke_skill actions without skill name', () => {
    const actions: ToolCallAction[] = [
      { action: 'invoke_skill', skill: 'tdd' },
      { action: 'invoke_skill' } as ToolCallAction, // Missing skill
      { action: 'invoke_skill', skill: 'security' },
    ];

    const skills = detectSkillInvocations(actions);

    expect(skills).toEqual(['tdd', 'security']);
  });
});

describe('isValidToolCall', () => {
  it('should return true for valid invoke_skill action', () => {
    const action = { action: 'invoke_skill', skill: 'tdd' };

    expect(isValidToolCall(action)).toBe(true);
  });

  it('should return true for valid respond action', () => {
    const action = { action: 'respond', response: 'Hello!' };

    expect(isValidToolCall(action)).toBe(true);
  });

  it('should return true for valid request_info action', () => {
    const action = { action: 'request_info', response: 'What file?' };

    expect(isValidToolCall(action)).toBe(true);
  });

  it('should return false for invalid action type', () => {
    const action = { action: 'unknown' };

    expect(isValidToolCall(action)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isValidToolCall(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isValidToolCall(undefined)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isValidToolCall('string')).toBe(false);
    expect(isValidToolCall(123)).toBe(false);
    expect(isValidToolCall([])).toBe(false);
  });

  it('should return false for object missing action field', () => {
    const action = { skill: 'tdd' };

    expect(isValidToolCall(action)).toBe(false);
  });
});
