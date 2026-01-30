/**
 * E2E Workflow Test
 *
 * End-to-end test validating the complete Phase 4 (Sandbox) and Phase 5 (Response Validation) workflow.
 *
 * This test creates a temp project with SKILL.md files containing sandbox configurations,
 * loads policies, runs state machine transitions, validates commands/writes against policies,
 * and runs response validation with mock Claude responses.
 *
 * Test Structure:
 * - Phase 4: Sandbox Workflow - Tests sandbox policy loading, TDD state machine, and permission checking
 * - Phase 5: Response Validation - Tests skill call detection, retry logic, and feedback loop
 * - Full Workflow Integration - End-to-end tests combining both phases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Sandbox imports
import { loadSandboxPolicy, getPolicyForPhase } from '../sandbox/loader.js';
import { createTDDMachine } from '../sandbox/state-machine.js';
import { createSandboxIsolate } from '../sandbox/isolate.js';
import type { TDDPhase, SandboxConfig } from '../sandbox/types.js';

// Response Validation imports
import {
  validateResponse,
  generateRetryPrompt,
  shouldRetry,
} from '../middleware/response-validator.js';
import { runFeedbackLoop, feedbackLoopHook } from '../hooks/feedback-loop.js';

describe('E2E: Sandbox + Response Validation Workflow', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `skills-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(join(tempDir, '.claude', 'skills', 'tdd'), { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Phase 4: Sandbox Workflow', () => {
    it('should load sandbox policy from SKILL.md', async () => {
      // Create SKILL.md with sandbox config
      const skillMd = `---
name: tdd-workflow
description: Test-driven development workflow enforcement
sandbox:
  state: BLOCKED
  profiles:
    BLOCKED:
      name: blocked
      allowCommands: []
      denyCommands: ["*"]
      allowWrite: []
      denyWrite: ["**/*.ts", "**/*.js"]
    RED:
      name: red
      allowCommands: ["npm test", "vitest"]
      denyCommands: ["npm run build"]
      allowWrite: ["**/*.test.ts"]
      denyWrite: ["src/**/*.ts"]
    GREEN:
      name: green
      allowCommands: ["npm test", "npm run build"]
      denyCommands: []
      allowWrite: ["**/*.ts"]
      denyWrite: []
    COMPLETE:
      name: complete
      allowCommands: ["*"]
      denyCommands: []
      allowWrite: ["**/*"]
      denyWrite: []
---

# TDD Workflow

Test content here.
`;

      const skillPath = join(tempDir, '.claude', 'skills', 'tdd');
      await writeFile(join(skillPath, 'SKILL.md'), skillMd);

      // Load the sandbox policy
      const config = await loadSandboxPolicy(skillPath);

      // Verify the config is loaded correctly
      expect(config).toBeDefined();
      expect(config!.state).toBe('BLOCKED');
      expect(config!.profiles).toHaveProperty('BLOCKED');
      expect(config!.profiles).toHaveProperty('RED');
      expect(config!.profiles).toHaveProperty('GREEN');
      expect(config!.profiles).toHaveProperty('COMPLETE');
    });

    it('should enforce TDD phase transitions', async () => {
      // Create TDD machine starting in BLOCKED state
      const machine = createTDDMachine('BLOCKED');

      // Verify initial state
      expect(machine.getPhase()).toBe('BLOCKED');

      // Valid transition: BLOCKED -> RED
      expect(machine.canTransitionTo('RED')).toBe(true);
      expect(machine.canTransitionTo('GREEN')).toBe(false);
      expect(machine.canTransitionTo('COMPLETE')).toBe(false);

      // Transition to RED
      machine.send({ type: 'TEST_WRITTEN' });
      expect(machine.getPhase()).toBe('RED');

      // Valid transition: RED -> GREEN
      expect(machine.canTransitionTo('GREEN')).toBe(true);
      expect(machine.canTransitionTo('COMPLETE')).toBe(false);

      // Transition to GREEN
      machine.send({ type: 'TEST_PASSED' });
      expect(machine.getPhase()).toBe('GREEN');

      // Valid transition: GREEN -> COMPLETE
      expect(machine.canTransitionTo('COMPLETE')).toBe(true);
      expect(machine.canTransitionTo('RED')).toBe(false);

      // Transition to COMPLETE
      machine.send({ type: 'REFACTOR_DONE' });
      expect(machine.getPhase()).toBe('COMPLETE');

      // Valid transition: COMPLETE -> BLOCKED (new cycle)
      expect(machine.canTransitionTo('BLOCKED')).toBe(true);
    });

    it('should check commands against policy', async () => {
      // Create a sandbox policy
      const policy = {
        name: 'red',
        allowCommands: ['npm test', 'vitest'],
        denyCommands: ['rm -rf', 'npm run build'],
        allowWrite: ['**/*.test.ts'],
        denyWrite: ['src/**/*.ts'],
      };

      // Create isolate
      const isolate = createSandboxIsolate();

      try {
        // Allowed commands
        expect(isolate.isCommandAllowed('npm test', policy)).toBe(true);
        expect(isolate.isCommandAllowed('vitest', policy)).toBe(true);
        expect(isolate.isCommandAllowed('npm test --watch', policy)).toBe(true);

        // Denied commands
        expect(isolate.isCommandAllowed('rm -rf /', policy)).toBe(false);
        expect(isolate.isCommandAllowed('npm run build', policy)).toBe(false);

        // Commands not in allow list
        expect(isolate.isCommandAllowed('npm install', policy)).toBe(false);
      } finally {
        isolate.dispose();
      }
    });

    it('should check file writes against policy', async () => {
      // Create a sandbox policy for RED phase
      const policy = {
        name: 'red',
        allowCommands: ['npm test'],
        denyCommands: [],
        allowWrite: ['**/*.test.ts'],
        denyWrite: ['src/main.ts', 'src/index.ts'],
      };

      // Create isolate
      const isolate = createSandboxIsolate();

      try {
        // Allowed file writes (test files)
        expect(isolate.isWriteAllowed('src/foo.test.ts', policy)).toBe(true);
        expect(isolate.isWriteAllowed('tests/unit/bar.test.ts', policy)).toBe(true);

        // Denied file writes (explicitly in denyWrite)
        expect(isolate.isWriteAllowed('src/main.ts', policy)).toBe(false);
        expect(isolate.isWriteAllowed('src/index.ts', policy)).toBe(false);

        // Non-test files (not in allowWrite pattern)
        expect(isolate.isWriteAllowed('src/utils.ts', policy)).toBe(false);
      } finally {
        isolate.dispose();
      }
    });

    it('should get policy for specific phase', async () => {
      // Create SKILL.md with sandbox config
      const skillMd = `---
name: tdd-test
description: Test skill
sandbox:
  state: RED
  profiles:
    RED:
      name: red-phase
      allowCommands: ["npm test"]
      denyCommands: []
      allowWrite: ["**/*.test.ts"]
      denyWrite: []
    GREEN:
      name: green-phase
      allowCommands: ["npm test", "npm run build"]
      denyCommands: []
      allowWrite: ["**/*.ts"]
      denyWrite: []
---

Content
`;

      const skillPath = join(tempDir, '.claude', 'skills', 'tdd');
      await writeFile(join(skillPath, 'SKILL.md'), skillMd);

      const config = await loadSandboxPolicy(skillPath);
      expect(config).toBeDefined();

      // Get policy for RED phase
      const redPolicy = getPolicyForPhase(config!, 'RED');
      expect(redPolicy.name).toBe('red-phase');
      expect(redPolicy.allowCommands).toContain('npm test');

      // Get policy for GREEN phase
      const greenPolicy = getPolicyForPhase(config!, 'GREEN');
      expect(greenPolicy.name).toBe('green-phase');
      expect(greenPolicy.allowCommands).toContain('npm run build');
    });
  });

  describe('Phase 5: Response Validation Workflow', () => {
    it('should validate responses with required skills', () => {
      // Mock Claude response with Skill() calls
      const response = `
I'll help you with that task.

Let me invoke the required skill:
Skill(skill: "tdd")

Now I'll proceed with the implementation.
`;

      const result = validateResponse(response, {
        requiredSkills: ['tdd'],
        includeRetryPrompt: false,
      });

      expect(result.hasRequiredSkillCalls).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
    });

    it('should detect missing required skills', () => {
      // Mock Claude response without required skill calls
      const response = `
I'll help you with that task.

Let me start implementing the feature directly.
`;

      const result = validateResponse(response, {
        requiredSkills: ['tdd', 'security-analysis'],
        includeRetryPrompt: true,
        maxRetries: 3,
      });

      expect(result.hasRequiredSkillCalls).toBe(false);
      expect(result.missingSkills).toContain('tdd');
      expect(result.missingSkills).toContain('security-analysis');
      expect(result.suggestedRetryPrompt).toBeDefined();
    });

    it('should generate retry prompts for missing skills', () => {
      const prompt = generateRetryPrompt(['tdd', 'unit-test-workflow'], 1, 3);

      expect(prompt).toContain('COMPLIANCE ERROR');
      expect(prompt).toContain('tdd');
      expect(prompt).toContain('unit-test-workflow');
      expect(prompt).toContain('1/3');
    });

    it('should correctly determine when to retry', () => {
      // Valid - all skills present
      const compliantValidation = {
        hasRequiredSkillCalls: true,
        missingSkills: [],
        extraneousCalls: [],
      };

      expect(shouldRetry(compliantValidation, 1, 3)).toBe(false);

      // Invalid - skills missing, attempts remaining
      const nonCompliantValidation = {
        hasRequiredSkillCalls: false,
        missingSkills: ['tdd'],
        extraneousCalls: [],
      };

      expect(shouldRetry(nonCompliantValidation, 1, 3)).toBe(true);
      expect(shouldRetry(nonCompliantValidation, 2, 3)).toBe(true);

      // Invalid - skills missing, but max attempts reached
      expect(shouldRetry(nonCompliantValidation, 3, 3)).toBe(false);
      expect(shouldRetry(nonCompliantValidation, 4, 3)).toBe(false);
    });

    it('should run feedback loop with compliant response', async () => {
      const response = `
I will use the required skill:
Skill(skill: "tdd")
`;

      const result = await runFeedbackLoop(
        response,
        { requiredSkills: ['tdd'] },
        1
      );

      expect(result.compliant).toBe(true);
      expect(result.missingSkills).toHaveLength(0);
      expect(result.retryPrompt).toBeUndefined();
    });

    it('should run feedback loop with non-compliant response', async () => {
      const response = `
I'll implement this without invoking skills.
`;

      const result = await runFeedbackLoop(
        response,
        { requiredSkills: ['tdd', 'security-analysis'], maxRetries: 3 },
        2
      );

      expect(result.compliant).toBe(false);
      expect(result.missingSkills).toContain('tdd');
      expect(result.missingSkills).toContain('security-analysis');
      expect(result.retryPrompt).toBeDefined();
      expect(result.attemptNumber).toBe(2);
    });

    it('should run feedback loop hook with env vars', async () => {
      // Compliant response
      const compliantResult = await feedbackLoopHook(
        'I will use Skill(skill: "tdd") first.',
        {
          REQUIRED_SKILLS: 'tdd',
          MAX_RETRIES: '3',
          ATTEMPT_NUMBER: '1',
        }
      );

      expect(compliantResult.exitCode).toBe(0);
      expect(compliantResult.stdout).toBe('');

      // Non-compliant response
      const nonCompliantResult = await feedbackLoopHook(
        'I will implement directly.',
        {
          REQUIRED_SKILLS: 'tdd,security-analysis',
          MAX_RETRIES: '3',
          ATTEMPT_NUMBER: '1',
        }
      );

      expect(nonCompliantResult.exitCode).toBe(1);
      expect(nonCompliantResult.stdout).toContain('COMPLIANCE ERROR');
      expect(nonCompliantResult.stdout).toContain('tdd');

      // Missing REQUIRED_SKILLS env var
      const errorResult = await feedbackLoopHook(
        'Some response',
        {}
      );

      expect(errorResult.exitCode).toBe(2);
      expect(errorResult.stdout).toContain('Error');
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete TDD cycle with response validation', async () => {
      // Step 1: Create SKILL.md with sandbox config
      const skillMd = `---
name: tdd-integration
description: Integration test skill
sandbox:
  state: BLOCKED
  profiles:
    BLOCKED:
      name: blocked
      allowCommands: []
      denyCommands: ["*"]
      allowWrite: []
      denyWrite: ["**/*"]
    RED:
      name: red
      allowCommands: ["npm test"]
      denyCommands: []
      allowWrite: ["**/*.test.ts"]
      denyWrite: []
    GREEN:
      name: green
      allowCommands: ["npm test", "npm run build"]
      denyCommands: []
      allowWrite: ["**/*.ts"]
      denyWrite: []
    COMPLETE:
      name: complete
      allowCommands: ["*"]
      denyCommands: []
      allowWrite: ["**/*"]
      denyWrite: []
---

TDD Integration Test
`;

      const skillPath = join(tempDir, '.claude', 'skills', 'tdd');
      await writeFile(join(skillPath, 'SKILL.md'), skillMd);

      // Step 2: Load sandbox policy
      const config = await loadSandboxPolicy(skillPath);
      expect(config).toBeDefined();
      expect(config!.state).toBe('BLOCKED');

      // Step 3: Create TDD machine in BLOCKED state
      const machine = createTDDMachine(config!.state);
      expect(machine.getPhase()).toBe('BLOCKED');

      // Step 4: Create isolate and verify BLOCKED phase restrictions
      const isolate = createSandboxIsolate();
      try {
        const blockedPolicy = getPolicyForPhase(config!, 'BLOCKED');
        expect(isolate.isCommandAllowed('npm test', blockedPolicy)).toBe(false);
        expect(isolate.isWriteAllowed('src/app.ts', blockedPolicy)).toBe(false);

        // Step 5: Simulate test written -> transition to RED
        // Validate that response includes Skill call before transitioning
        const redResponse = `
I need to write a test first.
Skill(skill: "tdd")
Creating test file...
`;

        const redValidation = validateResponse(redResponse, {
          requiredSkills: ['tdd'],
        });
        expect(redValidation.hasRequiredSkillCalls).toBe(true);

        // Now transition to RED
        machine.send({ type: 'TEST_WRITTEN' });
        expect(machine.getPhase()).toBe('RED');

        // Step 6: Verify RED phase allows test commands
        const redPolicy = getPolicyForPhase(config!, 'RED');
        expect(isolate.isCommandAllowed('npm test', redPolicy)).toBe(true);
        expect(isolate.isWriteAllowed('src/foo.test.ts', redPolicy)).toBe(true);

        // Step 7: Simulate test passes -> transition to GREEN
        machine.send({ type: 'TEST_PASSED' });
        expect(machine.getPhase()).toBe('GREEN');

        // Step 8: Verify GREEN phase allows implementation
        const greenPolicy = getPolicyForPhase(config!, 'GREEN');
        expect(isolate.isCommandAllowed('npm run build', greenPolicy)).toBe(true);
        expect(isolate.isWriteAllowed('src/app.ts', greenPolicy)).toBe(true);

        // Step 9: Validate response has implementation code
        const greenResponse = `
Now I'll implement the feature to make tests pass.
Skill(skill: "tdd")
Writing implementation...
`;

        const greenValidation = validateResponse(greenResponse, {
          requiredSkills: ['tdd'],
        });
        expect(greenValidation.hasRequiredSkillCalls).toBe(true);

        // Step 10: Transition to COMPLETE
        machine.send({ type: 'REFACTOR_DONE' });
        expect(machine.getPhase()).toBe('COMPLETE');

        // Step 11: Verify COMPLETE phase allows everything
        const completePolicy = getPolicyForPhase(config!, 'COMPLETE');
        expect(isolate.isCommandAllowed('npm publish', completePolicy)).toBe(true);
        expect(isolate.isWriteAllowed('any/path/file.ts', completePolicy)).toBe(true);
      } finally {
        isolate.dispose();
      }
    });

    it('should handle non-compliant responses in TDD workflow', async () => {
      // Create TDD machine
      const machine = createTDDMachine('BLOCKED');

      // Simulate response without Skill call
      const badResponse = `
I'll just implement the feature directly without tests.
`;

      // Validate response
      const validation = validateResponse(badResponse, {
        requiredSkills: ['tdd'],
        includeRetryPrompt: true,
        maxRetries: 3,
      });

      expect(validation.hasRequiredSkillCalls).toBe(false);
      expect(shouldRetry(validation, 1, 3)).toBe(true);

      // Run feedback loop to get retry prompt
      const feedbackResult = await runFeedbackLoop(
        badResponse,
        { requiredSkills: ['tdd'], maxRetries: 3 },
        1
      );

      expect(feedbackResult.compliant).toBe(false);
      expect(feedbackResult.retryPrompt).toContain('COMPLIANCE ERROR');
      expect(feedbackResult.retryPrompt).toContain('tdd');

      // Machine should still be in BLOCKED state (not allowed to proceed)
      expect(machine.getPhase()).toBe('BLOCKED');
    });

    it('should enforce sandbox isolation across full TDD cycle', async () => {
      // Create skill with restrictive policies
      const skillMd = `---
name: strict-tdd
description: Strict TDD enforcement
sandbox:
  state: BLOCKED
  profiles:
    BLOCKED:
      name: blocked
      allowCommands: []
      denyCommands: ["*"]
      allowWrite: []
      denyWrite: ["**/*"]
    RED:
      name: red
      allowCommands: ["npm test"]
      denyCommands: ["npm run build", "npm start"]
      allowWrite: ["**/*.test.ts", "**/*.spec.ts"]
      denyWrite: ["src/**/*.ts"]
    GREEN:
      name: green
      allowCommands: ["npm test", "npm run build"]
      denyCommands: ["npm publish"]
      allowWrite: ["src/**/*.ts", "**/*.test.ts"]
      denyWrite: ["package.json", "package-lock.json"]
    COMPLETE:
      name: complete
      allowCommands: ["*"]
      denyCommands: []
      allowWrite: ["**/*"]
      denyWrite: []
---

Strict TDD workflow
`;

      const skillPath = join(tempDir, '.claude', 'skills', 'tdd');
      await writeFile(join(skillPath, 'SKILL.md'), skillMd);

      const config = await loadSandboxPolicy(skillPath);
      expect(config).toBeDefined();

      const machine = createTDDMachine('BLOCKED');
      const isolate = createSandboxIsolate();

      try {
        // BLOCKED: Everything denied
        const blockedPolicy = getPolicyForPhase(config!, 'BLOCKED');
        expect(isolate.isCommandAllowed('npm test', blockedPolicy)).toBe(false);
        expect(isolate.isCommandAllowed('any command', blockedPolicy)).toBe(false);
        expect(isolate.isWriteAllowed('any/file.ts', blockedPolicy)).toBe(false);

        // Move to RED
        machine.send({ type: 'TEST_WRITTEN' });
        const redPolicy = getPolicyForPhase(config!, 'RED');

        // RED: Only test commands and test files allowed
        expect(isolate.isCommandAllowed('npm test', redPolicy)).toBe(true);
        expect(isolate.isCommandAllowed('npm run build', redPolicy)).toBe(false); // Explicitly denied
        expect(isolate.isWriteAllowed('tests/foo.test.ts', redPolicy)).toBe(true);
        expect(isolate.isWriteAllowed('src/app.ts', redPolicy)).toBe(false); // Denied for src

        // Move to GREEN
        machine.send({ type: 'TEST_PASSED' });
        const greenPolicy = getPolicyForPhase(config!, 'GREEN');

        // GREEN: Can build and write implementation
        expect(isolate.isCommandAllowed('npm run build', greenPolicy)).toBe(true);
        expect(isolate.isCommandAllowed('npm publish', greenPolicy)).toBe(false); // Explicitly denied
        expect(isolate.isWriteAllowed('src/app.ts', greenPolicy)).toBe(true);
        expect(isolate.isWriteAllowed('package.json', greenPolicy)).toBe(false); // Denied

        // Move to COMPLETE
        machine.send({ type: 'REFACTOR_DONE' });
        const completePolicy = getPolicyForPhase(config!, 'COMPLETE');

        // COMPLETE: Everything allowed
        expect(isolate.isCommandAllowed('npm publish', completePolicy)).toBe(true);
        expect(isolate.isWriteAllowed('package.json', completePolicy)).toBe(true);
      } finally {
        isolate.dispose();
      }
    });

    it('should support multiple required skills validation', async () => {
      // Response with some but not all required skills
      const partialResponse = `
Using TDD approach:
Skill(skill: "tdd")

Now implementing...
`;

      const validation = validateResponse(partialResponse, {
        requiredSkills: ['tdd', 'security-analysis', 'code-review-ts'],
        includeRetryPrompt: true,
        maxRetries: 3,
      });

      expect(validation.hasRequiredSkillCalls).toBe(false);
      expect(validation.missingSkills).toContain('security-analysis');
      expect(validation.missingSkills).toContain('code-review-ts');
      expect(validation.missingSkills).not.toContain('tdd');

      // Response with all required skills
      const fullResponse = `
Starting implementation:
Skill(skill: "tdd")
Skill(skill: "security-analysis")
Skill(skill: "code-review-ts")

All skills invoked!
`;

      const fullValidation = validateResponse(fullResponse, {
        requiredSkills: ['tdd', 'security-analysis', 'code-review-ts'],
      });

      expect(fullValidation.hasRequiredSkillCalls).toBe(true);
      expect(fullValidation.missingSkills).toHaveLength(0);
    });

    it('should reset state machine and start new cycle', async () => {
      const machine = createTDDMachine('BLOCKED');

      // Complete full cycle
      machine.send({ type: 'TEST_WRITTEN' });
      machine.send({ type: 'TEST_PASSED' });
      machine.send({ type: 'REFACTOR_DONE' });
      expect(machine.getPhase()).toBe('COMPLETE');

      // Start new cycle
      machine.send({ type: 'NEW_FEATURE' });
      expect(machine.getPhase()).toBe('BLOCKED');

      // Reset from any state
      machine.send({ type: 'TEST_WRITTEN' });
      expect(machine.getPhase()).toBe('RED');
      machine.reset();
      expect(machine.getPhase()).toBe('BLOCKED');
    });
  });
});
