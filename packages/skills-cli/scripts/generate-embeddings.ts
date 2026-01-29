#!/usr/bin/env npx tsx
/**
 * Generate Vector Store for Semantic Router
 *
 * Scans all skill definitions (bundled + installed) and generates
 * embeddings for the semantic router.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts [output-path]
 *
 * Output: data/vector_store.json (or specified path)
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createSkillsLibrary } from '@anthropic/skills-library';
import type { Skill } from '@anthropic/skills-library';
import {
  initializeModel,
  generateEmbedding,
  isModelInitialized,
} from '../src/router/embeddings.js';
import type { VectorStore, SkillVector } from '../src/router/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default output path
const DEFAULT_OUTPUT = join(__dirname, '..', 'data', 'vector_store.json');

// Keywords to extract from skill descriptions
const KEYWORD_PATTERNS = [
  // Development workflows
  /\b(tdd|test-driven|red.?green.?refactor)\b/gi,
  /\b(unit.?test|integration.?test|e2e|end-to-end)\b/gi,
  /\b(code.?review|pull.?request|pr|diff)\b/gi,
  /\b(refactor|clean.?code|complexity)\b/gi,
  /\b(debug|debugging|fix|bugfix)\b/gi,

  // Tools and commands
  /\b(commit|git|push|pull|merge|rebase)\b/gi,
  /\b(lint|format|prettier|eslint)\b/gi,
  /\b(build|compile|bundle)\b/gi,
  /\b(deploy|release|ci|cd)\b/gi,

  // Security
  /\b(security|vulnerability|cve|audit|exploit)\b/gi,
  /\b(authentication|authorization|auth|oauth)\b/gi,
  /\b(injection|xss|csrf|sanitize)\b/gi,

  // Documentation
  /\b(document|documentation|docs|readme|api.?doc)\b/gi,
  /\b(comment|jsdoc|tsdoc)\b/gi,

  // Languages and frameworks
  /\b(typescript|javascript|rust|python|go)\b/gi,
  /\b(react|vue|svelte|angular|nextjs)\b/gi,
  /\b(node|deno|bun)\b/gi,
];

/**
 * Extract keywords from text using patterns
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();

  for (const pattern of KEYWORD_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        keywords.add(match.toLowerCase());
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Generate trigger examples from skill content
 */
function generateTriggerExamples(skill: Skill): string[] {
  const examples: string[] = [];
  const content = skill.content.toLowerCase();

  // Look for "use when" or "trigger" patterns in content
  const useWhenMatch = content.match(/use when[:\s]+([^.]+)/i);
  if (useWhenMatch) {
    examples.push(useWhenMatch[1].trim());
  }

  // Add skill name as a trigger
  examples.push(`use ${skill.metadata.name}`);
  examples.push(`invoke ${skill.metadata.name}`);

  // Add description-based trigger
  const desc = skill.metadata.description;
  if (desc.length < 100) {
    examples.push(desc);
  }

  return examples;
}

/**
 * Convert skill to vector entry
 */
async function skillToVector(skill: Skill): Promise<SkillVector> {
  // Combine name, description, and content for embedding
  const textForEmbedding = [
    skill.metadata.name,
    skill.metadata.description,
    // First 500 chars of content to capture key concepts
    skill.content.slice(0, 500),
  ].join(' ');

  const embedding = await generateEmbedding(textForEmbedding);
  const keywords = extractKeywords(
    `${skill.metadata.name} ${skill.metadata.description} ${skill.content}`
  );
  const triggerExamples = generateTriggerExamples(skill);

  return {
    skillName: skill.metadata.name,
    description: skill.metadata.description,
    triggerExamples,
    embedding,
    keywords,
  };
}

/**
 * Main function
 */
async function main() {
  const outputPath = process.argv[2] || DEFAULT_OUTPUT;

  console.log('Generating vector store for semantic router...\n');

  // Initialize embedding model
  console.log('Loading embedding model...');
  await initializeModel();
  console.log('Model loaded.\n');

  // Load all skills
  console.log('Loading skills...');
  const library = createSkillsLibrary();
  const skills = await library.listSkills();
  console.log(`Found ${skills.length} skills.\n`);

  if (skills.length === 0) {
    console.log('No skills found. Vector store will be empty.');
  }

  // Generate embeddings
  console.log('Generating embeddings...');
  const vectors: SkillVector[] = [];

  for (const skill of skills) {
    process.stdout.write(`  ${skill.metadata.name}...`);
    const vector = await skillToVector(skill);
    vectors.push(vector);
    console.log(' done');
  }

  // Create vector store
  const store: VectorStore = {
    version: '1.0.0',
    model: 'Xenova/all-MiniLM-L6-v2',
    generatedAt: new Date().toISOString(),
    skills: vectors,
  };

  // Write to file
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(store, null, 2));

  console.log(`\nVector store written to: ${outputPath}`);
  console.log(`Total skills: ${vectors.length}`);
  console.log(`Total keywords: ${vectors.reduce((sum, v) => sum + v.keywords.length, 0)}`);
}

main().catch((err) => {
  console.error('Error generating vector store:', err);
  process.exit(1);
});
