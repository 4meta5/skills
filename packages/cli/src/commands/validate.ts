import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * Valid skill categories
 */
const VALID_CATEGORIES = [
  'testing',
  'development',
  'documentation',
  'refactoring',
  'security',
  'performance'
] as const;

/**
 * Slop detection patterns
 *
 * Note: These patterns are designed to catch actual slop, not documentation
 * about slop patterns. Patterns that appear in table cells or code blocks
 * explaining what slop looks like should not trigger false positives.
 */
const SLOP_PATTERNS = {
  // Content that indicates the skill is auto-generated test data
  content: [
    /^NEW content with improvements!$/m,
    /^# Test Skill\s*$/m, // Exact match for placeholder heading
  ],
  // Naming patterns that indicate auto-generated skills
  naming: [
    /^test-skill-\d+$/,
  ],
  // Placeholder patterns that indicate incomplete content
  // Only match when at the start of a line (not in tables/examples)
  placeholder: [
    /^Lorem ipsum dolor sit amet/im, // Full phrase only
    /^TODO: Add content here/im,
    /^\[Insert .* here\]$/im,
  ]
};

/**
 * Minimum description length for semantic matching to work well
 */
const MIN_DESCRIPTION_LENGTH = 50;

/**
 * Keywords that indicate good trigger conditions in descriptions
 */
const TRIGGER_KEYWORDS = [
  'Use when',
  'use when',
  'Use for',
  'use for',
  'When',
  'Triggers',
  'Invoke when',
  'Apply when',
  'Helps with',
];

export interface QualityMetrics {
  descriptionScore: number;
  hasTriggerConditions: boolean;
  hasSpecificContext: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  quality?: QualityMetrics;
  skillName?: string;
  path?: string;
}

export interface ValidateCommandResult {
  total: number;
  valid: number;
  invalid: number;
  skills: Record<string, ValidationResult>;
}

interface ValidateOptions {
  cwd?: string;
  path?: string;
  json?: boolean;
}

/**
 * Validate a single skill directory
 */
export async function validateSkill(skillPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skillName = basename(skillPath);

  // Check for slop naming pattern
  for (const pattern of SLOP_PATTERNS.naming) {
    if (pattern.test(skillName)) {
      errors.push(`Skill name "${skillName}" matches slop pattern (test-skill-*). This appears to be auto-generated test data.`);
    }
  }

  // Check if SKILL.md exists
  const skillMdPath = join(skillPath, 'SKILL.md');
  let skillMdExists = false;
  try {
    const stats = await stat(skillMdPath);
    skillMdExists = stats.isFile();
  } catch {
    skillMdExists = false;
  }

  if (!skillMdExists) {
    errors.push('SKILL.md not found');
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Read and parse SKILL.md
  let content: string;
  try {
    content = await readFile(skillMdPath, 'utf-8');
  } catch (error) {
    errors.push(`Failed to read SKILL.md: ${error}`);
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Check for slop content patterns
  for (const pattern of SLOP_PATTERNS.content) {
    if (pattern.test(content)) {
      errors.push(`Content contains slop/placeholder pattern: "${pattern.source}"`);
    }
  }

  for (const pattern of SLOP_PATTERNS.placeholder) {
    if (pattern.test(content)) {
      errors.push(`Content contains placeholder pattern: "${pattern.source}"`);
    }
  }

  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    errors.push('Missing or invalid frontmatter. SKILL.md must start with YAML frontmatter between --- delimiters.');
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  let metadata: Record<string, unknown>;
  try {
    metadata = parseYaml(frontmatterMatch[1]) as Record<string, unknown>;
  } catch (error) {
    errors.push(`Invalid YAML in frontmatter: ${error}`);
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Check required fields
  if (!metadata.name) {
    errors.push('Missing required field: name');
  }

  if (!metadata.description) {
    errors.push('Missing required field: description');
  }

  // Validate category if present
  if (metadata.category) {
    if (!VALID_CATEGORIES.includes(metadata.category as typeof VALID_CATEGORIES[number])) {
      errors.push(`Invalid category "${metadata.category}". Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  // Quality checks for description
  const description = metadata.description as string | undefined;
  let descriptionScore = 0;
  let hasTriggerConditions = false;
  let hasSpecificContext = false;

  if (description) {
    // Check description length
    if (description.length < MIN_DESCRIPTION_LENGTH) {
      warnings.push(`Description is too short (${description.length} chars). Recommend at least ${MIN_DESCRIPTION_LENGTH} chars for good semantic matching.`);
      descriptionScore = description.length / MIN_DESCRIPTION_LENGTH;
    } else {
      descriptionScore = 0.5; // Base score for meeting minimum length
    }

    // Check for trigger conditions
    hasTriggerConditions = TRIGGER_KEYWORDS.some(keyword => description.includes(keyword));
    if (!hasTriggerConditions) {
      warnings.push('Description lacks trigger conditions. Add phrases like "Use when..." to help with skill discovery.');
    } else {
      descriptionScore += 0.25;
    }

    // Check for specific context markers (error messages, file types, etc.)
    hasSpecificContext = /["'].*["']/.test(description) || // Quoted strings (error messages)
      /\.(ts|js|py|rs|go|md|json)\b/.test(description) || // File extensions
      /\([1-3]\)/.test(description) || // Numbered lists
      /\berror\b/i.test(description); // Error mentions

    if (hasSpecificContext) {
      descriptionScore += 0.25;
    }
  }

  // Check for referenced files that don't exist
  const body = frontmatterMatch[2];
  const referenceMatches = body.match(/\[.*?\]\(references\/.*?\)/g);
  if (referenceMatches && referenceMatches.length > 0) {
    const referencesDir = join(skillPath, 'references');
    try {
      await stat(referencesDir);
    } catch {
      errors.push('SKILL.md references files in references/ directory but the directory does not exist');
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    quality: {
      descriptionScore: Math.min(1, descriptionScore),
      hasTriggerConditions,
      hasSpecificContext
    },
    skillName,
    path: skillPath
  };
}

/**
 * Validate command - validates all skills or a specific skill in a project
 */
export async function validateCommand(options: ValidateOptions = {}): Promise<ValidateCommandResult> {
  const cwd = options.cwd || process.cwd();
  const skillsDir = join(cwd, '.claude', 'skills');

  const results: ValidateCommandResult = {
    total: 0,
    valid: 0,
    invalid: 0,
    skills: {}
  };

  // Check if skills directory exists
  try {
    await stat(skillsDir);
  } catch {
    // No skills directory
    if (!options.json) {
      console.log('No .claude/skills directory found.');
    }
    return results;
  }

  // Get list of skills to validate
  let skillDirs: string[];

  if (options.path) {
    // Validate specific skill
    const specificPath = join(skillsDir, options.path);
    try {
      await stat(specificPath);
      skillDirs = [options.path];
    } catch {
      if (!options.json) {
        console.error(`Skill not found: ${options.path}`);
      }
      return results;
    }
  } else {
    // Validate all skills
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      skillDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return results;
    }
  }

  // Validate each skill
  for (const skillDir of skillDirs) {
    const skillPath = join(skillsDir, skillDir);
    const result = await validateSkill(skillPath);

    results.total++;
    results.skills[skillDir] = result;

    if (result.valid) {
      results.valid++;
    } else {
      results.invalid++;
    }

    // Output results if not JSON mode
    if (!options.json) {
      if (result.valid) {
        if (result.warnings.length > 0) {
          console.log(`! ${skillDir}`);
          for (const warning of result.warnings) {
            console.log(`  - ${warning}`);
          }
        } else {
          console.log(`+ ${skillDir}`);
        }
      } else {
        console.log(`x ${skillDir}`);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    }
  }

  // Summary
  if (!options.json && results.total > 0) {
    console.log('');
    console.log(`Validated ${results.total} skill(s): ${results.valid} valid, ${results.invalid} invalid`);
  }

  return results;
}
