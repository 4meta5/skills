/**
 * Tests for Feedback Loop Hook
 *
 * TDD: Phase 1 - RED
 * These tests define the expected behavior for the feedback loop hook
 */

import { describe, it, expect } from 'vitest';
import {
  runFeedbackLoop,
  feedbackLoopHook,
  type FeedbackLoopOptions,
  type FeedbackLoopResult,
} from './feedback-loop.js';

describe('feedback-loop', () => {
  describe('runFeedbackLoop', () => {
    it('should return compliant:true when all required skills are called', async () => {
      const response = 'I will use Skill("tdd") and Skill("no-workarounds") to follow the workflow.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd', 'no-workarounds'],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
      expect(result.retryPrompt).toBeUndefined();
    });

    it('should return compliant:false when skills are missing', async () => {
      const response = 'I will help you implement this feature.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd', 'no-workarounds'],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(false);
      expect(result.missingSkills).toContain('tdd');
      expect(result.missingSkills).toContain('no-workarounds');
    });

    it('should include retry prompt when non-compliant', async () => {
      const response = 'I will help you.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(false);
      expect(result.retryPrompt).toBeDefined();
      expect(result.retryPrompt).toContain('tdd');
      expect(result.retryPrompt).toContain('COMPLIANCE ERROR');
    });

    it('should increment attempt number correctly', async () => {
      const response = 'No skills here.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
      };

      // First attempt (default)
      const result1 = await runFeedbackLoop(response, options);
      expect(result1.attemptNumber).toBe(1);

      // Explicit second attempt
      const result2 = await runFeedbackLoop(response, options, 2);
      expect(result2.attemptNumber).toBe(2);

      // Explicit third attempt
      const result3 = await runFeedbackLoop(response, options, 3);
      expect(result3.attemptNumber).toBe(3);
    });

    it('should include attempt info in retry prompt', async () => {
      const response = 'No skills.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
        maxRetries: 5,
      };

      const result = await runFeedbackLoop(response, options, 2);

      expect(result.retryPrompt).toContain('2');
      expect(result.retryPrompt).toContain('5');
    });

    it('should not include retry prompt when compliant', async () => {
      const response = 'Using Skill("tdd") now.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(true);
      expect(result.retryPrompt).toBeUndefined();
    });

    it('should handle empty required skills list', async () => {
      const response = 'Any response is fine.';
      const options: FeedbackLoopOptions = {
        requiredSkills: [],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('should handle suggested skills without requiring them', async () => {
      const response = 'Using Skill("tdd") only.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
        suggestedSkills: ['property-based-testing'],
      };

      const result = await runFeedbackLoop(response, options);

      expect(result.compliant).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('should default maxRetries to 3', async () => {
      const response = 'No skills.';
      const options: FeedbackLoopOptions = {
        requiredSkills: ['tdd'],
      };

      const result = await runFeedbackLoop(response, options, 1);

      // Default maxRetries is 3, so prompt should show "1/3"
      expect(result.retryPrompt).toContain('1/3');
    });
  });

  describe('feedbackLoopHook', () => {
    it('should parse REQUIRED_SKILLS env variable correctly', async () => {
      const stdin = 'Using Skill("tdd") and Skill("no-workarounds").';
      const env = {
        REQUIRED_SKILLS: 'tdd,no-workarounds',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(0);
    });

    it('should return exit code 0 for compliant response', async () => {
      const stdin = 'Using Skill("tdd").';
      const env = {
        REQUIRED_SKILLS: 'tdd',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('');
    });

    it('should return exit code 1 for non-compliant response', async () => {
      const stdin = 'I will help you.';
      const env = {
        REQUIRED_SKILLS: 'tdd',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('COMPLIANCE ERROR');
    });

    it('should return exit code 2 for invalid input', async () => {
      const stdin = 'Some response.';
      const env = {}; // Missing REQUIRED_SKILLS

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(2);
    });

    it('should output retry prompt to stdout when non-compliant', async () => {
      const stdin = 'No skill calls here.';
      const env = {
        REQUIRED_SKILLS: 'tdd,no-workarounds',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('tdd');
      expect(result.stdout).toContain('no-workarounds');
    });

    it('should parse SUGGESTED_SKILLS env variable', async () => {
      const stdin = 'Using Skill("tdd").';
      const env = {
        REQUIRED_SKILLS: 'tdd',
        SUGGESTED_SKILLS: 'property-based-testing,unit-test-workflow',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(0);
    });

    it('should parse MAX_RETRIES env variable', async () => {
      const stdin = 'No skills.';
      const env = {
        REQUIRED_SKILLS: 'tdd',
        MAX_RETRIES: '5',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('5');
    });

    it('should parse ATTEMPT_NUMBER env variable', async () => {
      const stdin = 'No skills.';
      const env = {
        REQUIRED_SKILLS: 'tdd',
        ATTEMPT_NUMBER: '2',
        MAX_RETRIES: '3',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('2/3');
    });

    it('should handle whitespace in REQUIRED_SKILLS', async () => {
      const stdin = 'Using Skill("tdd") and Skill("no-workarounds").';
      const env = {
        REQUIRED_SKILLS: ' tdd , no-workarounds ',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(0);
    });

    it('should handle empty stdin', async () => {
      const stdin = '';
      const env = {
        REQUIRED_SKILLS: 'tdd',
      };

      const result = await feedbackLoopHook(stdin, env);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('tdd');
    });

    it('should handle empty REQUIRED_SKILLS value', async () => {
      const stdin = 'Any response.';
      const env = {
        REQUIRED_SKILLS: '',
      };

      const result = await feedbackLoopHook(stdin, env);

      // Empty required skills means always compliant
      expect(result.exitCode).toBe(0);
    });
  });
});
