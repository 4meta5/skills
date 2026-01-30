#!/usr/bin/env node
/**
 * Feedback Loop CLI Entry Point
 *
 * This script is called by the shell hook to run the feedback loop validation.
 * It reads from stdin, validates the response, and outputs to stdout.
 */

import { feedbackLoopHook } from './feedback-loop.js';

async function main(): Promise<void> {
  // Read stdin
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const stdin = Buffer.concat(chunks).toString('utf-8');

  // Run the hook
  const result = await feedbackLoopHook(stdin, process.env as Record<string, string | undefined>);

  // Output stdout if any
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  // Exit with appropriate code
  process.exit(result.exitCode);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(2);
});
