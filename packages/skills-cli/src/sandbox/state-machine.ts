/**
 * TDD Permission State Machine
 *
 * Implements a state machine for TDD workflow phase enforcement.
 * Uses XState for reliable state management.
 *
 * State Transitions:
 *   BLOCKED --[TEST_WRITTEN]--> RED
 *   RED --[TEST_PASSED]--> GREEN
 *   GREEN --[REFACTOR_DONE]--> COMPLETE
 *   COMPLETE --[NEW_FEATURE]--> BLOCKED
 *
 * Any state can receive:
 *   - FORCE_PHASE: Jump to any phase (escape hatch)
 *   - RESET: Return to BLOCKED
 *
 * This enforces the TDD cycle: write failing test, make it pass, refactor.
 */

import { createActor, setup, assign } from 'xstate';
import type { TDDPhase } from './types.js';

/**
 * TDD State Machine Events
 */
export type TDDEvent =
  | { type: 'TEST_WRITTEN' } // BLOCKED -> RED
  | { type: 'TEST_PASSED' } // RED -> GREEN
  | { type: 'REFACTOR_DONE' } // GREEN -> COMPLETE
  | { type: 'NEW_FEATURE' } // COMPLETE -> BLOCKED
  | { type: 'FORCE_PHASE'; phase: TDDPhase } // Override (escape hatch)
  | { type: 'RESET' }; // Return to BLOCKED

/**
 * Context maintained by the state machine
 */
export interface TDDContext {
  currentPhase: TDDPhase;
  testFile?: string;
  implFile?: string;
  attemptCount: number;
  lastError?: string;
}

/**
 * Wrapper interface for the TDD state machine
 */
export interface TDDMachine {
  /** Get the current TDD phase */
  getPhase(): TDDPhase;
  /** Get the full context object */
  getContext(): TDDContext;
  /** Send an event to the state machine */
  send(event: TDDEvent): void;
  /** Check if a transition to the target phase is valid from current state */
  canTransitionTo(phase: TDDPhase): boolean;
  /** Reset the machine to BLOCKED state */
  reset(): void;
}

/**
 * Valid transitions for each phase (used by canTransitionTo)
 * Maps current phase to the only valid next phase via normal events
 */
const VALID_TRANSITIONS: Record<TDDPhase, TDDPhase | null> = {
  BLOCKED: 'RED',
  RED: 'GREEN',
  GREEN: 'COMPLETE',
  COMPLETE: 'BLOCKED',
};

/**
 * Create the TDD machine definition
 */
function createMachineDefinition(initialPhase: TDDPhase = 'BLOCKED') {
  return setup({
    types: {
      context: {} as TDDContext,
      events: {} as TDDEvent,
    },
    actions: {
      setBlocked: assign({
        currentPhase: 'BLOCKED' as TDDPhase,
      }),
      setRed: assign({
        currentPhase: 'RED' as TDDPhase,
      }),
      setGreen: assign({
        currentPhase: 'GREEN' as TDDPhase,
      }),
      setComplete: assign({
        currentPhase: 'COMPLETE' as TDDPhase,
      }),
      resetContext: assign({
        currentPhase: 'BLOCKED' as TDDPhase,
        attemptCount: 0,
        lastError: undefined,
        testFile: undefined,
        implFile: undefined,
      }),
    },
    guards: {
      isPhaseBlocked: ({ event }) => event.type === 'FORCE_PHASE' && event.phase === 'BLOCKED',
      isPhaseRed: ({ event }) => event.type === 'FORCE_PHASE' && event.phase === 'RED',
      isPhaseGreen: ({ event }) => event.type === 'FORCE_PHASE' && event.phase === 'GREEN',
      isPhaseComplete: ({ event }) => event.type === 'FORCE_PHASE' && event.phase === 'COMPLETE',
    },
  }).createMachine({
    id: 'tdd',
    initial: initialPhase.toLowerCase(),
    context: {
      currentPhase: initialPhase,
      attemptCount: 0,
    },
    states: {
      blocked: {
        entry: ['setBlocked'],
        on: {
          TEST_WRITTEN: { target: 'red' },
          FORCE_PHASE: [
            { target: 'blocked', guard: 'isPhaseBlocked' },
            { target: 'red', guard: 'isPhaseRed' },
            { target: 'green', guard: 'isPhaseGreen' },
            { target: 'complete', guard: 'isPhaseComplete' },
          ],
          RESET: {
            target: 'blocked',
            actions: ['resetContext'],
          },
        },
      },
      red: {
        entry: ['setRed'],
        on: {
          TEST_PASSED: { target: 'green' },
          FORCE_PHASE: [
            { target: 'blocked', guard: 'isPhaseBlocked' },
            { target: 'red', guard: 'isPhaseRed' },
            { target: 'green', guard: 'isPhaseGreen' },
            { target: 'complete', guard: 'isPhaseComplete' },
          ],
          RESET: {
            target: 'blocked',
            actions: ['resetContext'],
          },
        },
      },
      green: {
        entry: ['setGreen'],
        on: {
          REFACTOR_DONE: { target: 'complete' },
          FORCE_PHASE: [
            { target: 'blocked', guard: 'isPhaseBlocked' },
            { target: 'red', guard: 'isPhaseRed' },
            { target: 'green', guard: 'isPhaseGreen' },
            { target: 'complete', guard: 'isPhaseComplete' },
          ],
          RESET: {
            target: 'blocked',
            actions: ['resetContext'],
          },
        },
      },
      complete: {
        entry: ['setComplete'],
        on: {
          NEW_FEATURE: { target: 'blocked' },
          FORCE_PHASE: [
            { target: 'blocked', guard: 'isPhaseBlocked' },
            { target: 'red', guard: 'isPhaseRed' },
            { target: 'green', guard: 'isPhaseGreen' },
            { target: 'complete', guard: 'isPhaseComplete' },
          ],
          RESET: {
            target: 'blocked',
            actions: ['resetContext'],
          },
        },
      },
    },
  });
}

/**
 * Create a new TDD state machine instance
 *
 * @param initialPhase - The starting phase (default: BLOCKED)
 * @returns A TDDMachine instance for managing TDD workflow state
 *
 * @example
 * ```ts
 * const machine = createTDDMachine();
 * console.log(machine.getPhase()); // 'BLOCKED'
 *
 * machine.send({ type: 'TEST_WRITTEN' });
 * console.log(machine.getPhase()); // 'RED'
 *
 * machine.send({ type: 'TEST_PASSED' });
 * console.log(machine.getPhase()); // 'GREEN'
 * ```
 */
export function createTDDMachine(initialPhase: TDDPhase = 'BLOCKED'): TDDMachine {
  const machine = createMachineDefinition(initialPhase);
  const actor = createActor(machine);
  actor.start();

  return {
    getPhase(): TDDPhase {
      return actor.getSnapshot().context.currentPhase;
    },

    getContext(): TDDContext {
      return actor.getSnapshot().context;
    },

    send(event: TDDEvent): void {
      actor.send(event);
    },

    canTransitionTo(phase: TDDPhase): boolean {
      const currentPhase = actor.getSnapshot().context.currentPhase;
      return VALID_TRANSITIONS[currentPhase] === phase;
    },

    reset(): void {
      actor.send({ type: 'RESET' });
    },
  };
}
