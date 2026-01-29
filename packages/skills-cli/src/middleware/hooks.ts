/**
 * Hookable Middleware
 *
 * Provides a hook-based middleware system using the hookable library.
 * Allows registration of async hooks for:
 * - beforeRequest: Modify prompt before sending to Claude
 * - afterResponse: Process response after receiving from Claude
 * - onToolCall: Intercept and validate tool calls
 * - onRetry: Handle retry attempts
 * - onStateChange: React to workflow state changes
 */

import { createHooks } from 'hookable';
import type { MiddlewareResult } from './types.js';

/**
 * Hook function signatures
 */
export interface HookFunctions {
  /** Called before request is sent to Claude. Can modify the prompt. */
  beforeRequest: (prompt: string, context: Record<string, unknown>) => Promise<string>;

  /** Called after response is received. Returns processing result. */
  afterResponse: (response: string, context: Record<string, unknown>) => Promise<MiddlewareResult>;

  /** Called when a tool call is detected. Return false to block. */
  onToolCall: (toolName: string, params: Record<string, unknown>) => Promise<boolean>;

  /** Called when a retry is triggered. */
  onRetry: (attempt: number, error: string) => Promise<void>;

  /** Called when workflow state changes. */
  onStateChange: (newState: string) => Promise<void>;
}

/**
 * Hookable middleware interface
 */
export interface HookableMiddleware {
  /** Register a hook function */
  hook<K extends keyof HookFunctions>(
    name: K,
    fn: HookFunctions[K]
  ): () => void;

  /** Call a hook with arguments */
  callHook<K extends keyof HookFunctions>(
    name: K,
    ...args: Parameters<HookFunctions[K]>
  ): Promise<ReturnType<HookFunctions[K]>>;

  /** Remove all hooks */
  removeAllHooks(): void;
}

/**
 * Create a hookable middleware instance
 */
export function createHookableMiddleware(): HookableMiddleware {
  // Internal hook storage
  const hookRegistry = new Map<string, Array<(...args: unknown[]) => Promise<unknown>>>();

  return {
    hook<K extends keyof HookFunctions>(
      name: K,
      fn: HookFunctions[K]
    ): () => void {
      if (!hookRegistry.has(name)) {
        hookRegistry.set(name, []);
      }
      const hooks = hookRegistry.get(name)!;
      hooks.push(fn as (...args: unknown[]) => Promise<unknown>);

      // Return unregister function
      return () => {
        const index = hooks.indexOf(fn as (...args: unknown[]) => Promise<unknown>);
        if (index !== -1) {
          hooks.splice(index, 1);
        }
      };
    },

    async callHook<K extends keyof HookFunctions>(
      name: K,
      ...args: Parameters<HookFunctions[K]>
    ): Promise<ReturnType<HookFunctions[K]>> {
      const hooks = hookRegistry.get(name) || [];

      if (hooks.length === 0) {
        // Return sensible defaults for each hook type
        if (name === 'beforeRequest') {
          return args[0] as ReturnType<HookFunctions[K]>;
        }
        if (name === 'afterResponse') {
          return {
            accepted: true,
            response: args[0],
            foundTools: [],
            missingTools: [],
          } as ReturnType<HookFunctions[K]>;
        }
        if (name === 'onToolCall') {
          return true as ReturnType<HookFunctions[K]>;
        }
        if (name === 'onRetry') {
          return undefined as ReturnType<HookFunctions[K]>;
        }
        if (name === 'onStateChange') {
          return undefined as ReturnType<HookFunctions[K]>;
        }
        return undefined as ReturnType<HookFunctions[K]>;
      }

      // Execute hooks in order
      let result: unknown = args[0];

      for (const hook of hooks) {
        const hookResult = await hook(...args);

        // For string-returning hooks, chain the result
        if (name === 'beforeRequest' && typeof hookResult === 'string') {
          result = hookResult;
          args[0] = hookResult as Parameters<HookFunctions[K]>[0];
        }
        // For boolean hooks, short-circuit on false
        else if (name === 'onToolCall' && hookResult === false) {
          return false as ReturnType<HookFunctions[K]>;
        }
        // For object hooks, use the last result
        else if (hookResult !== undefined) {
          result = hookResult;
        }
      }

      return result as ReturnType<HookFunctions[K]>;
    },

    removeAllHooks(): void {
      hookRegistry.clear();
    },
  };
}

/**
 * Create a hookable middleware with default handlers
 */
export function createEnhancedMiddleware() {
  const hooks = createHookableMiddleware();

  return {
    ...hooks,

    /**
     * Add MUST_CALL instruction for immediate mode
     */
    async injectRequirements(prompt: string, requiredSkills: string[]): Promise<string> {
      if (requiredSkills.length === 0) {
        return prompt;
      }

      const toolList = requiredSkills.join(', ');
      const instruction = `\n\n[MUST_CALL: Skill(${toolList})]\nYou MUST call these skills before proceeding with implementation.\n\n`;

      return hooks.callHook('beforeRequest', instruction + prompt, { requiredSkills });
    },

    /**
     * Validate response and detect tool calls
     */
    async validateResponse(response: string, requiredSkills: string[]): Promise<MiddlewareResult> {
      return hooks.callHook('afterResponse', response, { requiredSkills });
    },
  };
}
