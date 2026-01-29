/**
 * Workflow State Machine
 *
 * Implements the state machine for skill activation workflow.
 * Uses XState for reliable state management.
 *
 * States: IDLE -> PLANNING -> EXECUTING -> REVIEWING -> (IDLE | ERROR_RECOVERY)
 *
 * Based on "Iris" architecture from NEW_RESEARCH.md to prevent
 * the "Skill Router Excuse" where LLM evaluates but doesn't activate.
 */

import { createActor, setup, assign } from 'xstate';
import type {
  WorkflowState,
  WorkflowEvent,
  WorkflowContext,
  DEFAULT_WORKFLOW_CONTEXT,
} from './types.js';

/**
 * Options for creating a workflow machine
 */
export interface WorkflowMachineOptions {
  maxRetries?: number;
}

/**
 * Wrapper interface for the workflow machine
 */
export interface WorkflowMachine {
  getState(): WorkflowState;
  getContext(): WorkflowContext;
  send(event: WorkflowEvent): void;
  canRetry(): boolean;
  reset(): void;
}

/**
 * Create the workflow state machine definition
 */
function createMachineDefinition(options: WorkflowMachineOptions = {}) {
  const maxRetries = options.maxRetries ?? 3;

  return setup({
    types: {
      context: {} as WorkflowContext,
      events: {} as WorkflowEvent,
    },
    actions: {
      setImmediateMode: assign(({ event }) => {
        if (event.type !== 'ROUTER_IMMEDIATE') return {};
        return {
          requiredSkills: event.skills,
          activationMode: 'immediate' as const,
          startedAt: new Date().toISOString(),
          attemptCount: 0,
        };
      }),
      setSuggestionMode: assign(({ event }) => {
        if (event.type !== 'ROUTER_SUGGESTION') return {};
        return {
          requiredSkills: event.skills,
          activationMode: 'suggestion' as const,
          startedAt: new Date().toISOString(),
          attemptCount: 0,
        };
      }),
      setChatMode: assign({
        activationMode: 'chat' as const,
      }),
      recordToolCall: assign(({ context, event }) => {
        if (event.type !== 'TOOL_CALLED') return {};
        return {
          toolCalls: [...context.toolCalls, event.toolName],
        };
      }),
      incrementAttempt: assign(({ context }) => ({
        attemptCount: context.attemptCount + 1,
      })),
      recordError: assign(({ event }) => {
        if (event.type !== 'REVIEW_FAILED') return {};
        return {
          lastError: event.error,
        };
      }),
      resetContext: assign({
        requiredSkills: [] as string[],
        attemptCount: 0,
        lastError: undefined,
        activationMode: 'chat' as const,
        toolCalls: [] as string[],
        startedAt: undefined,
      }),
    },
    guards: {
      canRetry: ({ context }) => context.attemptCount < maxRetries,
    },
  }).createMachine({
    id: 'workflow',
    initial: 'idle',
    context: {
      requiredSkills: [],
      attemptCount: 0,
      maxRetries,
      activationMode: 'chat',
      toolCalls: [],
    },
    states: {
      idle: {
        on: {
          ROUTER_IMMEDIATE: {
            target: 'executing',
            actions: ['setImmediateMode'],
          },
          ROUTER_SUGGESTION: {
            target: 'planning',
            actions: ['setSuggestionMode'],
          },
          ROUTER_CHAT: {
            target: 'idle',
            actions: ['setChatMode'],
          },
        },
      },
      planning: {
        on: {
          PLAN_APPROVED: {
            target: 'executing',
          },
          PLAN_REJECTED: {
            target: 'idle',
            actions: ['resetContext'],
          },
          RESET: {
            target: 'idle',
            actions: ['resetContext'],
          },
        },
      },
      executing: {
        on: {
          TOOL_CALLED: {
            target: 'reviewing',
            actions: ['recordToolCall'],
          },
          TOOL_SKIPPED: {
            target: 'error_recovery',
            actions: ['incrementAttempt'],
          },
          RESET: {
            target: 'idle',
            actions: ['resetContext'],
          },
        },
      },
      reviewing: {
        on: {
          REVIEW_PASSED: {
            target: 'idle',
          },
          REVIEW_FAILED: {
            target: 'error_recovery',
            actions: ['recordError', 'incrementAttempt'],
          },
          RESET: {
            target: 'idle',
            actions: ['resetContext'],
          },
        },
      },
      error_recovery: {
        on: {
          RETRY: {
            target: 'executing',
          },
          MAX_RETRIES_EXCEEDED: {
            target: 'idle',
          },
          RESET: {
            target: 'idle',
            actions: ['resetContext'],
          },
        },
      },
    },
  });
}

/**
 * Create a new workflow machine instance
 */
export function createWorkflowMachine(options: WorkflowMachineOptions = {}): WorkflowMachine {
  const machine = createMachineDefinition(options);
  const actor = createActor(machine);
  actor.start();

  return {
    getState(): WorkflowState {
      return actor.getSnapshot().value as WorkflowState;
    },

    getContext(): WorkflowContext {
      return actor.getSnapshot().context;
    },

    send(event: WorkflowEvent): void {
      actor.send(event);
    },

    canRetry(): boolean {
      const context = actor.getSnapshot().context;
      return context.attemptCount < context.maxRetries;
    },

    reset(): void {
      actor.send({ type: 'RESET' });
    },
  };
}
