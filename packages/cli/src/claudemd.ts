/**
 * CLAUDE.md management module
 *
 * Provides parsing, validation, and modification of CLAUDE.md files
 * for automated skill reference management.
 */

import { readdir } from 'fs/promises';
import { join } from 'path';
import { readMarkdownFile, writeMarkdownFile } from './shared/markdown.js';

/**
 * Result of parsing a CLAUDE.md file
 */
export interface ClaudeMdParseResult {
  /** Whether the file has an "## Installed Skills" section */
  hasInstalledSkillsSection: boolean;
  /** Skill names extracted from references */
  skillReferences: string[];
  /** Sections found in the file (title and content) */
  sections: Array<{ title: string; content: string; startLine: number; endLine: number }>;
  /** Lines that look like skill references but are malformed */
  malformedLines?: string[];
  /** Raw content */
  rawContent: string;
}

/**
 * Result of a CLAUDE.md update operation
 */
export interface ClaudeMdUpdateResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Skills that were added */
  added: string[];
  /** Skills that were removed */
  removed: string[];
  /** Skills that were already present (for add) or not present (for remove) */
  unchanged: string[];
  /** Updated content */
  content: string;
  /** Any errors encountered */
  errors?: string[];
}

// Pattern for valid skill references: - @.claude/skills/{name}/SKILL.md
const SKILL_REF_PATTERN = /^-\s+@?\.claude\/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md(?:\s.*)?$/;

// Section header pattern
const SECTION_HEADER_PATTERN = /^##\s+(.+)$/;

/**
 * Parse a CLAUDE.md file content
 */
export function parseClaudeMd(content: string): ClaudeMdParseResult {
  // Normalize line endings to LF
  const normalizedContent = content.replace(/\r\n/g, '\n');

  if (!normalizedContent.trim()) {
    return {
      hasInstalledSkillsSection: false,
      skillReferences: [],
      sections: [],
      rawContent: normalizedContent
    };
  }

  const lines = normalizedContent.split('\n');
  const sections: ClaudeMdParseResult['sections'] = [];
  const skillReferences: string[] = [];
  const malformedLines: string[] = [];

  let hasInstalledSkillsSection = false;
  let currentSection: { title: string; startLine: number; lines: string[] } | null = null;
  let inInstalledSkillsSection = false;

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
      const sectionTitle = sectionMatch[1].trim();
      currentSection = { title: sectionTitle, startLine: i, lines: [] };
      inInstalledSkillsSection = sectionTitle === 'Installed Skills';

      if (inInstalledSkillsSection) {
        hasInstalledSkillsSection = true;
      }
    } else if (currentSection) {
      currentSection.lines.push(line);

      // Parse skill references if in Installed Skills section
      if (inInstalledSkillsSection && line.trim().startsWith('-')) {
        const skillMatch = line.match(SKILL_REF_PATTERN);
        if (skillMatch) {
          skillReferences.push(skillMatch[1]);
        } else if (line.trim() !== '-') {
          // Line looks like a list item but doesn't match pattern
          malformedLines.push(line);
        }
      }
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

  const result: ClaudeMdParseResult = {
    hasInstalledSkillsSection,
    skillReferences,
    sections,
    rawContent: normalizedContent
  };

  if (malformedLines.length > 0) {
    result.malformedLines = malformedLines;
  }

  return result;
}

/**
 * Add skill references to CLAUDE.md content
 */
export function addSkillReferences(content: string, skills: string[]): ClaudeMdUpdateResult {
  // Normalize line endings
  let normalizedContent = content.replace(/\r\n/g, '\n');

  const parsed = parseClaudeMd(normalizedContent);
  const existingSkills = new Set(parsed.skillReferences);

  const added: string[] = [];
  const unchanged: string[] = [];

  for (const skill of skills) {
    if (existingSkills.has(skill)) {
      unchanged.push(skill);
    } else {
      added.push(skill);
    }
  }

  // If nothing to add, return unchanged content
  if (added.length === 0) {
    return {
      success: true,
      added: [],
      removed: [],
      unchanged,
      content: normalizedContent
    };
  }

  // Build new skill references
  const newRefs = added.map(skill => `- @.claude/skills/${skill}/SKILL.md`);

  if (parsed.hasInstalledSkillsSection) {
    // Insert into existing section
    normalizedContent = insertIntoInstalledSkillsSection(normalizedContent, newRefs);
  } else {
    // Create new section
    normalizedContent = appendInstalledSkillsSection(normalizedContent, newRefs);
  }

  return {
    success: true,
    added,
    removed: [],
    unchanged,
    content: normalizedContent
  };
}

/**
 * Remove skill references from CLAUDE.md content
 */
export function removeSkillReferences(content: string, skills: string[]): ClaudeMdUpdateResult {
  // Normalize line endings
  let normalizedContent = content.replace(/\r\n/g, '\n');

  const parsed = parseClaudeMd(normalizedContent);
  const existingSkills = new Set(parsed.skillReferences);

  const removed: string[] = [];
  const unchanged: string[] = [];
  const skillsToRemove = new Set<string>();

  for (const skill of skills) {
    if (existingSkills.has(skill)) {
      removed.push(skill);
      skillsToRemove.add(skill);
    } else {
      unchanged.push(skill);
    }
  }

  // If nothing to remove, return unchanged content
  if (removed.length === 0) {
    return {
      success: true,
      added: [],
      removed: [],
      unchanged,
      content: normalizedContent
    };
  }

  // Remove skill references line by line
  const lines = normalizedContent.split('\n');
  const newLines: string[] = [];

  for (const line of lines) {
    const skillMatch = line.match(SKILL_REF_PATTERN);
    if (skillMatch && skillsToRemove.has(skillMatch[1])) {
      // Skip this line
      continue;
    }
    newLines.push(line);
  }

  // Clean up multiple consecutive newlines
  let result = newLines.join('\n').replace(/\n{3,}/g, '\n\n');

  return {
    success: true,
    added: [],
    removed,
    unchanged,
    content: result
  };
}

/**
 * Sync skill references to match installed skills
 */
export function syncSkillReferences(content: string, installedSkills: string[]): ClaudeMdUpdateResult {
  const parsed = parseClaudeMd(content);
  const existingSet = new Set(parsed.skillReferences);
  const installedSet = new Set(installedSkills);

  // Skills to add: in installed but not in file
  const toAdd = installedSkills.filter(s => !existingSet.has(s));
  // Skills to remove: in file but not in installed
  const toRemove = parsed.skillReferences.filter(s => !installedSet.has(s));

  // Apply remove first, then add
  let result: ClaudeMdUpdateResult = {
    success: true,
    added: [],
    removed: [],
    unchanged: [],
    content
  };

  if (toRemove.length > 0) {
    result = removeSkillReferences(result.content, toRemove);
    result.removed = toRemove;
  }

  if (toAdd.length > 0) {
    const addResult = addSkillReferences(result.content, toAdd);
    result.content = addResult.content;
    result.added = toAdd;
  }

  return result;
}

/**
 * High-level API: Update CLAUDE.md file in a project directory
 */
export async function updateClaudeMd(
  projectDir: string,
  operation: 'add' | 'remove' | 'sync',
  skills: string[]
): Promise<ClaudeMdUpdateResult> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');

  try {
    // Read existing content or start with empty
    let content = '';
    try {
      content = await readMarkdownFile(claudeMdPath);
    } catch {
      // File doesn't exist, that's OK
    }

    let result: ClaudeMdUpdateResult;

    switch (operation) {
      case 'add':
        result = addSkillReferences(content, skills);
        break;

      case 'remove':
        result = removeSkillReferences(content, skills);
        break;

      case 'sync':
        // Discover installed skills from filesystem
        const installedSkills = await discoverInstalledSkills(projectDir);
        result = syncSkillReferences(content, installedSkills);
        break;

      default:
        return {
          success: false,
          added: [],
          removed: [],
          unchanged: [],
          content,
          errors: [`Unknown operation: ${operation}`]
        };
    }

    // Write updated content
    if (result.success && (result.added.length > 0 || result.removed.length > 0)) {
      await writeMarkdownFile(claudeMdPath, result.content);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      added: [],
      removed: [],
      unchanged: [],
      content: '',
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

/**
 * Discover installed skills from the filesystem
 */
async function discoverInstalledSkills(projectDir: string): Promise<string[]> {
  const skillsDir = join(projectDir, '.claude', 'skills');
  const skills: string[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Check if it has a SKILL.md
        try {
          await readMarkdownFile(join(skillsDir, entry.name, 'SKILL.md'));
          skills.push(entry.name);
        } catch {
          // Not a valid skill directory
        }
      }
    }
  } catch {
    // Skills directory doesn't exist
  }

  return skills;
}

/**
 * Insert skill references into existing Installed Skills section
 */
function insertIntoInstalledSkillsSection(content: string, refs: string[]): string {
  const lines = content.split('\n');
  const newLines: string[] = [];

  let inSection = false;
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sectionMatch = line.match(SECTION_HEADER_PATTERN);

    if (sectionMatch) {
      if (sectionMatch[1].trim() === 'Installed Skills') {
        inSection = true;
        newLines.push(line);
        // Insert new refs right after the header
        newLines.push(...refs);
        inserted = true;
        continue;
      } else if (inSection) {
        inSection = false;
      }
    }

    newLines.push(line);
  }

  return newLines.join('\n');
}

/**
 * Append a new Installed Skills section
 */
function appendInstalledSkillsSection(content: string, refs: string[]): string {
  const trimmed = content.trimEnd();
  const section = `## Installed Skills\n${refs.join('\n')}`;

  if (!trimmed) {
    return section + '\n';
  }

  return trimmed + '\n\n' + section + '\n';
}
