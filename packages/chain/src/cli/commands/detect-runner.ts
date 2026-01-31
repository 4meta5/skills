import { detectTestRunner, detectAllTestRunners } from '../../discovery/index.js';
import { resolve } from 'path';

interface DetectRunnerOptions {
  path?: string;
  all?: boolean;
  json?: boolean;
}

export async function detectRunnerCommand(
  options: DetectRunnerOptions
): Promise<void> {
  const projectPath = resolve(options.path || '.');

  if (options.all) {
    const runners = await detectAllTestRunners(projectPath);

    if (options.json) {
      console.log(JSON.stringify(runners, null, 2));
      return;
    }

    if (runners.length === 0) {
      console.log('No test runners detected');
      return;
    }

    console.log('Detected test runners:\n');
    for (const runner of runners) {
      console.log(`  ${runner.name}`);
      console.log(`    Command: ${runner.command}`);
      console.log(`    Confidence: ${(runner.confidence * 100).toFixed(0)}%`);
      console.log(
        `    Patterns: ${runner.testPatterns.slice(0, 3).join(', ')}${runner.testPatterns.length > 3 ? '...' : ''}`
      );
      console.log('');
    }
  } else {
    const runner = await detectTestRunner(projectPath);

    if (options.json) {
      console.log(JSON.stringify(runner, null, 2));
      return;
    }

    if (!runner) {
      console.log('No test runner detected');
      process.exitCode = 1;
      return;
    }

    console.log(`Detected: ${runner.name}`);
    console.log(`Command: ${runner.command}`);
    console.log(`Test patterns:`);
    for (const pattern of runner.testPatterns) {
      console.log(`  - ${pattern}`);
    }
  }
}
