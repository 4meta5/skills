/**
 * Tests for Response Validator Hook
 *
 * TDD: Phase 1 - RED
 * These tests define the expected behavior for the response validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateResponse,
  generateRetryPrompt,
  shouldRetry,
  type ResponseValidation,
  type ValidatorOptions,
} from './response-validator.js';

describe('response-validator', () => {
  describe('validateResponse', () => {
    it('should detect when all required skills are called', () => {
      const response = 'I will use Skill("tdd") to follow the workflow.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
      expect(result.extraneousCalls).toHaveLength(0);
    });

    it('should detect missing skills', () => {
      const response = 'I will help you implement this feature.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd', 'no-workarounds'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(false);
      expect(result.missingSkills).toContain('tdd');
      expect(result.missingSkills).toContain('no-workarounds');
    });

    it('should detect partial missing skills', () => {
      const response = 'Using Skill("tdd") now.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd', 'no-workarounds'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(false);
      expect(result.missingSkills).toEqual(['no-workarounds']);
    });

    it('should detect extraneous skill calls', () => {
      const response = 'Using Skill("tdd") and Skill("extra-skill") together.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
      expect(result.extraneousCalls).toEqual(['extra-skill']);
    });

    it('should handle empty response', () => {
      const response = '';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(false);
      expect(result.missingSkills).toEqual(['tdd']);
    });

    it('should handle no required skills', () => {
      const response = 'Using Skill("tdd") for fun.';
      const options: ValidatorOptions = {
        requiredSkills: [],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
      expect(result.extraneousCalls).toEqual(['tdd']);
    });

    it('should detect multiple skill calls with named args', () => {
      const response = 'I will call Skill(skill: "tdd") and Skill(skill: "no-workarounds").';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd', 'no-workarounds'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('should include retry prompt when option is enabled', () => {
      const response = 'I will help you.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
        includeRetryPrompt: true,
        maxRetries: 3,
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(false);
      expect(result.suggestedRetryPrompt).toBeDefined();
      expect(result.suggestedRetryPrompt).toContain('tdd');
    });

    it('should not include retry prompt when option is disabled', () => {
      const response = 'I will help you.';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
        includeRetryPrompt: false,
      };

      const result = validateResponse(response, options);

      expect(result.suggestedRetryPrompt).toBeUndefined();
    });

    it('should not treat suggested skills as extraneous when called', () => {
      const response = 'Using Skill("tdd") and Skill("property-based-testing").';
      const options: ValidatorOptions = {
        requiredSkills: ['tdd'],
        suggestedSkills: ['property-based-testing'],
      };

      const result = validateResponse(response, options);

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.extraneousCalls).toHaveLength(0);
    });
  });

  describe('generateRetryPrompt', () => {
    it('should include missing skill names', () => {
      const prompt = generateRetryPrompt(['tdd', 'no-workarounds'], 1, 3);

      expect(prompt).toContain('tdd');
      expect(prompt).toContain('no-workarounds');
    });

    it('should include attempt numbers', () => {
      const prompt = generateRetryPrompt(['tdd'], 2, 3);

      expect(prompt).toContain('2');
      expect(prompt).toContain('3');
    });

    it('should include COMPLIANCE ERROR prefix', () => {
      const prompt = generateRetryPrompt(['tdd'], 1, 3);

      expect(prompt).toContain('COMPLIANCE ERROR');
    });

    it('should include instruction to use Skill tool', () => {
      const prompt = generateRetryPrompt(['tdd'], 1, 3);

      expect(prompt).toContain('Skill');
      expect(prompt.toLowerCase()).toContain('invoke');
    });

    it('should handle single missing skill', () => {
      const prompt = generateRetryPrompt(['tdd'], 1, 3);

      expect(prompt).toContain('tdd');
      expect(prompt).toContain('Skill(skill: "tdd")');
    });
  });

  describe('shouldRetry', () => {
    it('should return true when skills missing and attempts remaining', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: false,
        missingSkills: ['tdd'],
        extraneousCalls: [],
      };

      expect(shouldRetry(validation, 1, 3)).toBe(true);
      expect(shouldRetry(validation, 2, 3)).toBe(true);
    });

    it('should return false when max attempts reached', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: false,
        missingSkills: ['tdd'],
        extraneousCalls: [],
      };

      expect(shouldRetry(validation, 3, 3)).toBe(false);
      expect(shouldRetry(validation, 4, 3)).toBe(false);
    });

    it('should return false when all skills present', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: true,
        missingSkills: [],
        extraneousCalls: [],
      };

      expect(shouldRetry(validation, 1, 3)).toBe(false);
    });

    it('should return false when no required skills and validation passes', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: true,
        missingSkills: [],
        extraneousCalls: ['extra'],
      };

      expect(shouldRetry(validation, 1, 3)).toBe(false);
    });

    it('should handle edge case of maxAttempts = 0', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: false,
        missingSkills: ['tdd'],
        extraneousCalls: [],
      };

      expect(shouldRetry(validation, 0, 0)).toBe(false);
    });

    it('should handle first attempt (attemptNumber = 0)', () => {
      const validation: ResponseValidation = {
        hasRequiredSkillCalls: false,
        missingSkills: ['tdd'],
        extraneousCalls: [],
      };

      expect(shouldRetry(validation, 0, 3)).toBe(true);
    });
  });
});
