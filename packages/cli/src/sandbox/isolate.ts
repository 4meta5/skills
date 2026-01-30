/**
 * Sandbox Isolate
 *
 * Provides isolated code execution with policy-based command and file write
 * permissions. Uses Node.js vm module for isolation.
 *
 * Note: For stronger isolation in production, consider isolated-vm package.
 * The vm module provides basic sandboxing but is not a security boundary.
 */

import { createContext, Script, Context } from 'vm';
import { minimatch } from 'minimatch';
import type { SandboxPolicy } from './types.js';

/**
 * Options for creating a sandbox isolate
 */
export interface IsolateOptions {
  /** Memory limit in MB, default 128 (informational, not enforced by vm module) */
  memoryLimit?: number;
  /** Execution timeout in ms, default 5000 */
  timeout?: number;
}

/**
 * Result of executing code in the sandbox
 */
export interface IsolateResult {
  /** Whether the execution succeeded */
  success: boolean;
  /** The result value if successful */
  result?: unknown;
  /** Error message if failed */
  error?: string;
}

/**
 * Sandbox isolate interface for safe code execution
 */
export interface SandboxIsolate {
  /** Execute code in the sandbox */
  execute(code: string, context?: Record<string, unknown>): Promise<IsolateResult>;
  /** Check if a command is allowed by the policy */
  isCommandAllowed(command: string, policy: SandboxPolicy): boolean;
  /** Check if a file write is allowed by the policy */
  isWriteAllowed(filePath: string, policy: SandboxPolicy): boolean;
  /** Dispose the isolate and free resources */
  dispose(): void;
}

/**
 * Default safe globals to expose in the sandbox.
 * Dangerous globals (process, require, etc.) are explicitly set to undefined.
 */
const SAFE_GLOBALS = {
  // Explicitly disable dangerous globals
  console: undefined,
  setTimeout: undefined,
  setInterval: undefined,
  setImmediate: undefined,
  clearTimeout: undefined,
  clearInterval: undefined,
  clearImmediate: undefined,
  process: undefined,
  require: undefined,
  module: undefined,
  exports: undefined,
  __dirname: undefined,
  __filename: undefined,
  // Basic JS globals that are safe
  Object,
  Array,
  String,
  Number,
  Boolean,
  Date,
  RegExp,
  Error,
  TypeError,
  RangeError,
  SyntaxError,
  Math,
  JSON,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Promise,
  Symbol,
  BigInt,
  Proxy,
  Reflect,
  // Safe utility functions
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURI,
  encodeURIComponent,
  decodeURI,
  decodeURIComponent,
};

/**
 * Check if a string matches any pattern in a list.
 * Supports glob patterns via minimatch and prefix matching for commands.
 *
 * @param value - The value to check
 * @param patterns - List of patterns to match against
 * @param usePrefix - If true, also check if value starts with any pattern
 */
function matchesAny(value: string, patterns: string[], usePrefix = false): boolean {
  for (const pattern of patterns) {
    // Exact match
    if (pattern === value) {
      return true;
    }
    // Wildcard match all
    if (pattern === '*' || pattern === '**') {
      return true;
    }
    // Prefix matching (for commands)
    if (usePrefix && value.startsWith(pattern)) {
      return true;
    }
    // Glob pattern match
    if (minimatch(value, pattern, { dot: true })) {
      return true;
    }
  }
  return false;
}

/**
 * Create a new sandbox isolate
 */
export function createSandboxIsolate(options: IsolateOptions = {}): SandboxIsolate {
  const timeout = options.timeout ?? 5000;
  // memoryLimit is accepted but not enforced by vm module (informational only)

  // Create base context with safe globals
  let context: Context | null = createContext(SAFE_GLOBALS);

  let disposed = false;

  return {
    /**
     * Execute code in the sandbox
     */
    async execute(code: string, contextVars?: Record<string, unknown>): Promise<IsolateResult> {
      if (disposed || !context) {
        return {
          success: false,
          error: 'Isolate has been disposed',
        };
      }

      try {
        // Create a fresh context with injected variables for each execution
        const execContext = createContext({
          ...context,
          ...contextVars,
        });

        // Compile and run the script
        const script = new Script(code);
        const result = script.runInContext(execContext, {
          timeout,
          displayErrors: true,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check for timeout (Node.js vm module throws Error with specific code)
        const errorCode =
          error instanceof Error && 'code' in error ? (error as { code: string }).code : undefined;
        if (
          errorMessage.includes('Script execution timed out') ||
          errorCode === 'ERR_SCRIPT_EXECUTION_TIMEOUT'
        ) {
          return {
            success: false,
            error: 'Timeout: Script execution timed out',
          };
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },

    /**
     * Check if a command is allowed by the policy
     * Deny list takes precedence over allow list
     * Uses prefix matching for commands (e.g., "rm -rf" matches "rm -rf /")
     */
    isCommandAllowed(command: string, policy: SandboxPolicy): boolean {
      // Empty allow list means nothing is allowed
      if (policy.allowCommands.length === 0) {
        return false;
      }

      // Check deny list first (takes precedence)
      // Use prefix matching for deny patterns
      if (policy.denyCommands.length > 0 && matchesAny(command, policy.denyCommands, true)) {
        return false;
      }

      // Check allow list with prefix matching
      return matchesAny(command, policy.allowCommands, true);
    },

    /**
     * Check if a file write is allowed by the policy
     * Deny list takes precedence over allow list
     */
    isWriteAllowed(filePath: string, policy: SandboxPolicy): boolean {
      // Empty allow list means nothing is allowed
      if (policy.allowWrite.length === 0) {
        return false;
      }

      // Check deny list first (takes precedence)
      if (policy.denyWrite.length > 0 && matchesAny(filePath, policy.denyWrite)) {
        return false;
      }

      // Check allow list
      return matchesAny(filePath, policy.allowWrite);
    },

    /**
     * Dispose the isolate and free resources
     */
    dispose(): void {
      if (!disposed) {
        context = null;
        disposed = true;
      }
    },
  };
}
