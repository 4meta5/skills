#!/usr/bin/env node
/**
 * Semantic Router Activation Script
 *
 * This script is called by the hook system to determine skill activation.
 * It reads the user prompt from stdin (JSON) and outputs activation instructions.
 *
 * Usage:
 *   echo '{"prompt": "fix the bug"}' | npx tsx src/router/activate.ts
 *
 * Exit codes:
 *   0 - Success (output written to stdout)
 *   1 - Error (message written to stderr)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, access, constants } from 'fs/promises';
import { createRouter } from './router.js';
import type { RouterConfig, RoutingResult, ActivationMode } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default vector store location
const DEFAULT_VECTOR_STORE = join(__dirname, '..', '..', 'data', 'vector_store.json');

interface HookInput {
  prompt: string;
  sessionId?: string;
}

/**
 * Options for formatting output
 */
interface FormatOptions {
  suggestionThreshold: number;
  immediateThreshold: number;
}

/**
 * Extract required skills from routing result based on thresholds
 */
function extractRequiredSkills(
  result: RoutingResult,
  options: FormatOptions
): string[] {
  // For immediate mode, include skills that meet the suggestion threshold
  // (they're already above immediate threshold to be in immediate mode)
  const threshold = options.suggestionThreshold;
  return result.matches
    .filter((m) => m.score >= threshold)
    .map((m) => m.skillName);
}

/**
 * Format activation output for Claude
 */
function formatActivationOutput(
  result: RoutingResult,
  options: FormatOptions
): string {
  const lines: string[] = [];

  if (result.mode === 'immediate') {
    // IMMEDIATE ACTIVATION - Force skill use
    const requiredSkills = extractRequiredSkills(result, options);

    lines.push('\n## SKILL ACTIVATION REQUIRED\n');
    lines.push('The semantic router has determined that skills MUST be activated.\n');
    lines.push(`**Mode: IMMEDIATE** (confidence > ${options.immediateThreshold})\n`);
    lines.push('### Skills to ACTIVATE NOW:\n');

    for (const match of result.matches.filter(
      (m) => m.score >= options.suggestionThreshold
    )) {
      const confidence = (match.score * 100).toFixed(0);
      lines.push(`- **${match.skillName}** (${confidence}% match)`);
      if (match.matchedKeywords.length > 0) {
        lines.push(`  Matched keywords: ${match.matchedKeywords.join(', ')}`);
      }
    }

    lines.push('\n### MANDATORY ACTIONS:\n');
    lines.push('1. Call `Skill(skill-name)` for each skill listed above');
    lines.push('2. Follow the activated skill instructions COMPLETELY');
    lines.push('3. Do NOT skip activation - this violates project policy\n');

    lines.push('**BLOCKING CONDITION**: You cannot proceed with implementation');
    lines.push('until you have called `Skill()` for each required skill.\n');

    // Add MUST_CALL for middleware enforcement
    if (requiredSkills.length > 0) {
      lines.push(`[MUST_CALL: ${requiredSkills.map((s) => `Skill("${s}")`).join(', ')}]`);
    }
  } else if (result.mode === 'suggestion') {
    // SUGGESTION MODE - Recommend skills
    const halfSuggestionThreshold = options.suggestionThreshold / 2;

    lines.push('\n## SKILL SUGGESTIONS\n');
    lines.push('The semantic router suggests these skills may be relevant.\n');
    lines.push(
      `**Mode: SUGGESTION** (confidence ${options.suggestionThreshold}-${options.immediateThreshold})\n`
    );
    lines.push('### Suggested skills:\n');

    for (const match of result.matches.filter(
      (m) => m.score >= halfSuggestionThreshold
    )) {
      const confidence = (match.score * 100).toFixed(0);
      lines.push(`- **${match.skillName}** (${confidence}% match)`);
    }

    lines.push('\n### RECOMMENDED ACTIONS:\n');
    lines.push('Consider activating these skills with `Skill(skill-name)`.');
    lines.push('If uncertain, ask the user: "Should I use the [skill-name] skill?"\n');
  } else {
    // CHAT MODE - No skill activation needed
    // Output nothing to avoid cluttering the context
    return '';
  }

  // Add processing stats
  lines.push(`---`);
  lines.push(
    `*Router: ${result.processingTimeMs.toFixed(0)}ms, ${result.matches.length} skills evaluated*`
  );

  return lines.join('\n');
}

/**
 * Format JSON output for middleware integration
 */
function formatJsonOutput(
  result: RoutingResult,
  options: FormatOptions
): string {
  const requiredSkills = extractRequiredSkills(result, options);

  return JSON.stringify({
    mode: result.mode,
    requiredSkills,
    topScore: result.matches[0]?.score ?? 0,
    processingTimeMs: result.processingTimeMs,
  });
}

/**
 * Read all stdin data with timeout
 */
async function readStdin(timeoutMs: number = 1000): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;

    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(data || '{}');
      }
    };

    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', finish);
    process.stdin.on('close', finish);
    process.stdin.on('error', finish);

    // Resume stdin in case it's paused
    process.stdin.resume();

    // Timeout - stdin might not emit 'end' in some scenarios
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Main activation function
 */
async function activate(): Promise<void> {
  // Read input from stdin
  let input: HookInput;
  try {
    const stdin = await readStdin(1000);
    input = JSON.parse(stdin) as HookInput;
  } catch {
    input = { prompt: '' };
  }

  if (!input.prompt || input.prompt.trim().length === 0) {
    // No prompt, nothing to do
    process.exit(0);
  }

  // Check if vector store exists
  const vectorStorePath = process.env.SKILLS_VECTOR_STORE || DEFAULT_VECTOR_STORE;
  try {
    await access(vectorStorePath, constants.R_OK);
  } catch {
    // Vector store doesn't exist, skip routing
    // This is expected if embeddings haven't been generated yet
    process.exit(0);
  }

  // Create and initialize router
  const config: RouterConfig = {
    vectorStorePath,
    immediateThreshold: parseFloat(process.env.SKILLS_IMMEDIATE_THRESHOLD || '0.85'),
    suggestionThreshold: parseFloat(process.env.SKILLS_SUGGESTION_THRESHOLD || '0.70'),
  };

  const formatOptions: FormatOptions = {
    immediateThreshold: config.immediateThreshold ?? 0.85,
    suggestionThreshold: config.suggestionThreshold ?? 0.70,
  };

  try {
    const router = await createRouter(config);
    await router.initialize();

    // Route the query
    const result = await router.route(input.prompt);

    // Check if JSON output is requested
    const outputJson = process.env.SKILLS_OUTPUT_JSON === 'true';

    if (outputJson) {
      // Output JSON for middleware integration
      const jsonOutput = formatJsonOutput(result, formatOptions);
      console.log(jsonOutput);
    } else {
      // Format human-readable output
      const output = formatActivationOutput(result, formatOptions);
      if (output) {
        console.log(output);
      }
    }
  } catch (error) {
    // Log error but don't fail the hook
    console.error(`Router error: ${error}`);
    process.exit(0);
  }
}

// Run if called directly
activate().catch((err) => {
  console.error('Activation error:', err);
  process.exit(1);
});
