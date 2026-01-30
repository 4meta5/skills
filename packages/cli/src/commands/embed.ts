/**
 * Embed Command - Generate vector store from installed skills
 *
 * Scans installed skills, extracts metadata and triggers, generates
 * embeddings, and writes to vector_store.json for semantic routing.
 */

import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { parse as parseYaml } from 'yaml';
import type { VectorStore, SkillVector } from '../router/types.js';
import {
  initializeModel,
  generateEmbedding,
  isModelInitialized,
} from '../router/embeddings.js';

// Default embedding model
const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Result of parsing a SKILL.md file
 */
export interface ParsedSkill {
  name: string;
  description: string;
  category?: string;
  content: string;
}

/**
 * Scanned skill from directory
 */
export interface ScannedSkill {
  name: string;
  description: string;
  category?: string;
  path: string;
  content: string;
  triggerExamples: string[];
  keywords: string[];
}

/**
 * Options for embed command
 */
export interface EmbedOptions {
  /** Directory containing skills (default: .claude/skills relative to cwd) */
  skillsDir?: string;
  /** Output path for vector store JSON */
  output?: string;
  /** Working directory */
  cwd?: string;
  /** Embedding model to use */
  model?: string;
  /** Skip actual embedding generation (for testing) */
  skipEmbeddings?: boolean;
}

/**
 * Options for generateVectorStore
 */
export interface GenerateOptions {
  skillsDir: string;
  outputPath: string;
  model?: string;
  skipEmbeddings?: boolean;
}

/**
 * Scan a skills directory for all installed skills
 */
export async function scanSkillsDirectory(skillsDir: string): Promise<ScannedSkill[]> {
  const skills: ScannedSkill[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = join(skillsDir, entry.name);
      const skillMdPath = join(skillPath, 'SKILL.md');

      try {
        await stat(skillMdPath);
        const parsed = await parseSkillMd(skillMdPath);
        const content = await readFile(skillMdPath, 'utf-8');

        const triggerExamples = extractTriggerExamples(content, parsed.name);
        const keywords = extractKeywords(content, parsed.name, parsed.description);

        skills.push({
          name: parsed.name,
          description: parsed.description,
          category: parsed.category,
          path: skillPath,
          content,
          triggerExamples,
          keywords,
        });
      } catch {
        // Skip directories without valid SKILL.md
      }
    }
  } catch {
    // Skills directory doesn't exist
  }

  return skills;
}

/**
 * Parse a SKILL.md file to extract metadata
 */
export async function parseSkillMd(filePath: string): Promise<ParsedSkill> {
  const content = await readFile(filePath, 'utf-8');

  // Match frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid SKILL.md format: missing frontmatter in ${filePath}`);
  }

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  const body = match[2];

  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    throw new Error(`Invalid SKILL.md: missing "name" field in ${filePath}`);
  }

  if (!frontmatter.description) {
    throw new Error(`Invalid SKILL.md: missing "description" field in ${filePath}`);
  }

  // Handle both string and multi-line (object) descriptions
  let description = '';
  if (typeof frontmatter.description === 'string') {
    description = frontmatter.description;
  } else if (typeof frontmatter.description === 'object') {
    description = String(frontmatter.description).trim();
  }

  return {
    name: frontmatter.name,
    description,
    category: typeof frontmatter.category === 'string' ? frontmatter.category : undefined,
    content: body.trim(),
  };
}

/**
 * Extract trigger examples from skill content
 *
 * Looks for:
 * - "When to Use" section
 * - "Trigger Conditions" section
 * - "When to Invoke" section
 * - Bullet points under these sections
 */
export function extractTriggerExamples(content: string, skillName?: string): string[] {
  const triggers: string[] = [];

  // Add skill name variants as trigger examples
  if (skillName) {
    triggers.push(`use ${skillName}`);
    triggers.push(`invoke ${skillName}`);
  }

  // Patterns for trigger sections (match until next ## or end of content)
  const sectionPatterns = [
    /##\s*When to Use[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*Trigger Conditions[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*When to Invoke[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*Context\s*\/\s*Trigger Conditions[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
  ];

  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match) {
      const sectionContent = match[1];

      // Extract bullet points (handle various bullet formats)
      // Match lines starting with -, *, or numbered lists
      const lines = sectionContent.split('\n');
      for (const line of lines) {
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (bulletMatch) {
          const bulletText = bulletMatch[1].trim();
          // Clean up markdown formatting
          const cleanText = bulletText
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/`([^`]+)`/g, '$1') // Remove code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
            .trim();

          if (cleanText && cleanText.length > 3) {
            triggers.push(cleanText);
          }
        }
      }
    }
  }

  return triggers;
}

/**
 * Extract keywords from skill content for fast-path matching
 *
 * Includes:
 * - Skill name
 * - Key terms from description
 * - Domain-specific terms
 */
export function extractKeywords(
  content: string,
  skillName: string,
  description?: string
): string[] {
  const keywords: string[] = [];

  // Always include skill name
  keywords.push(skillName);

  // Add words from skill name (hyphen-separated)
  const nameWords = skillName.split('-').filter(w => w.length > 2);
  keywords.push(...nameWords);

  // Extract keywords from description
  if (description) {
    const descWords = description
      .toLowerCase()
      .replace(/[^a-z\s-]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !['this', 'that', 'with', 'from', 'have', 'will', 'been'].includes(w));

    keywords.push(...descWords.slice(0, 10));
  }

  // Look for explicit keywords in content
  const keywordMatch = content.match(/keywords?:\s*([^\n]+)/i);
  if (keywordMatch) {
    const explicitKeywords = keywordMatch[1]
      .split(/[,;]/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 2);
    keywords.push(...explicitKeywords);
  }

  // Deduplicate and lowercase
  return [...new Set(keywords.map(k => k.toLowerCase()))];
}

/**
 * Generate vector store from skills directory
 */
export async function generateVectorStore(options: GenerateOptions): Promise<VectorStore> {
  const { skillsDir, outputPath, model = DEFAULT_MODEL, skipEmbeddings = false } = options;

  // Scan for skills
  const scannedSkills = await scanSkillsDirectory(skillsDir);

  if (scannedSkills.length === 0) {
    console.log('No skills found in', skillsDir);
  }

  // Initialize embedding model if needed
  if (!skipEmbeddings && !isModelInitialized()) {
    console.log('Initializing embedding model...');
    await initializeModel(model);
  }

  // Generate skill vectors
  const skillVectors: SkillVector[] = [];

  for (const skill of scannedSkills) {
    console.log(`Processing: ${skill.name}`);

    // Combine trigger examples with description for embedding
    const textToEmbed = [
      skill.description,
      ...skill.triggerExamples.slice(0, 5), // Limit triggers for embedding
    ].join(' ');

    let embedding: number[] = [];
    if (!skipEmbeddings) {
      embedding = await generateEmbedding(textToEmbed);
    }

    skillVectors.push({
      skillName: skill.name,
      description: skill.description,
      triggerExamples: skill.triggerExamples,
      embedding,
      keywords: skill.keywords,
    });
  }

  // Create vector store
  const vectorStore: VectorStore = {
    version: '1.0.0',
    model,
    generatedAt: new Date().toISOString(),
    skills: skillVectors,
  };

  // Write to output file
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(vectorStore, null, 2), 'utf-8');

  console.log(`Generated vector store: ${outputPath}`);
  console.log(`  Skills: ${skillVectors.length}`);

  return vectorStore;
}

/**
 * Main embed command handler
 */
export async function embedCommand(options: EmbedOptions = {}): Promise<void> {
  const cwd = options.cwd || process.cwd();
  const skillsDir = options.skillsDir || join(cwd, '.claude', 'skills');
  const output = options.output || join(cwd, '.claude', 'vector_store.json');

  console.log(`Scanning skills in: ${skillsDir}`);

  await generateVectorStore({
    skillsDir,
    outputPath: output,
    model: options.model,
    skipEmbeddings: options.skipEmbeddings,
  });
}
