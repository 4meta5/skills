/**
 * Shared markdown parsing and manipulation utilities
 *
 * These functions are extracted from claudemd.ts for reuse across
 * multiple modules (CLAUDE.md management, blog writing, etc.)
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Represents a markdown section (## heading)
 */
export interface Section {
  title: string;
  content: string;
  startLine: number;
  endLine: number;
}

/**
 * Result of parsing markdown with frontmatter
 */
export interface ParsedMarkdown {
  frontmatter: Record<string, any>;
  body: string;
}

// Section header pattern (## heading)
const SECTION_HEADER_PATTERN = /^##\s+(.+)$/;

/**
 * Parse YAML frontmatter from markdown content
 *
 * Returns the frontmatter as an object and the body content.
 * If no frontmatter is present, returns empty object and full content.
 */
export function parseMarkdownFrontmatter(content: string): ParsedMarkdown {
  // Normalize line endings to LF
  const normalized = content.replace(/\r\n/g, '\n');

  // Match frontmatter delimited by ---
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: {},
      body: normalized
    };
  }

  const yamlContent = match[1].trim();
  const body = match[2].trim();

  // Handle empty frontmatter
  if (!yamlContent) {
    return {
      frontmatter: {},
      body
    };
  }

  try {
    const frontmatter = parseYaml(yamlContent) || {};
    return {
      frontmatter,
      body
    };
  } catch {
    // Invalid YAML, treat as no frontmatter
    return {
      frontmatter: {},
      body: normalized
    };
  }
}

/**
 * Parse markdown content into level-2 sections
 *
 * Returns an array of sections with title, content, and line numbers.
 * Content before the first section is not included.
 */
export function parseMarkdownSections(content: string): Section[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const sections: Section[] = [];

  let currentSection: { title: string; startLine: number; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(SECTION_HEADER_PATTERN);

    if (sectionMatch) {
      // Close previous section
      if (currentSection) {
        sections.push({
          title: currentSection.title,
          content: currentSection.lines.join('\n'),
          startLine: currentSection.startLine,
          endLine: i - 1
        });
      }

      // Start new section
      currentSection = {
        title: sectionMatch[1].trim(),
        startLine: i,
        lines: []
      };
    } else if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  // Close final section
  if (currentSection) {
    sections.push({
      title: currentSection.title,
      content: currentSection.lines.join('\n'),
      startLine: currentSection.startLine,
      endLine: lines.length - 1
    });
  }

  return sections;
}

/**
 * Read a markdown file from disk
 *
 * @throws Error if file does not exist
 */
export async function readMarkdownFile(path: string): Promise<string> {
  return readFile(path, 'utf-8');
}

/**
 * Write markdown content to a file
 *
 * Creates parent directories if they don't exist.
 */
export async function writeMarkdownFile(path: string, content: string): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  await writeFile(path, content, 'utf-8');
}

/**
 * Update frontmatter fields in markdown content
 *
 * Merges the provided updates into existing frontmatter.
 * Creates frontmatter if none exists.
 */
export function updateFrontmatter(content: string, updates: Record<string, any>): string {
  const { frontmatter, body } = parseMarkdownFrontmatter(content);

  // Merge updates into existing frontmatter
  const newFrontmatter = { ...frontmatter, ...updates };

  // Serialize back to YAML
  const yamlContent = stringifyYaml(newFrontmatter).trim();

  return `---\n${yamlContent}\n---\n\n${body}`;
}

/**
 * Replace the content of a named section
 *
 * Finds the section by title and replaces its content.
 * If section is not found, returns the original content unchanged.
 */
export function replaceSectionContent(
  content: string,
  sectionTitle: string,
  newContent: string
): string {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const newLines: string[] = [];

  let inTargetSection = false;
  let foundSection = false;
  let skipUntilNextSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(SECTION_HEADER_PATTERN);

    if (sectionMatch) {
      const title = sectionMatch[1].trim();

      if (inTargetSection) {
        // We hit a new section, stop skipping
        skipUntilNextSection = false;
        inTargetSection = false;
      }

      if (title === sectionTitle) {
        // Found our target section
        foundSection = true;
        inTargetSection = true;
        skipUntilNextSection = true;
        newLines.push(line); // Keep the header
        newLines.push(''); // Blank line after header
        newLines.push(newContent); // New content
        newLines.push(''); // Blank line after content
        continue;
      }
    }

    if (skipUntilNextSection) {
      continue;
    }

    newLines.push(line);
  }

  if (!foundSection) {
    return content;
  }

  // Clean up trailing blank lines
  while (newLines.length > 0 && newLines[newLines.length - 1] === '') {
    newLines.pop();
  }

  return newLines.join('\n');
}
