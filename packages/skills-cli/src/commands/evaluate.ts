/**
 * Evaluate Command - Generate dynamic skill evaluation prompt
 *
 * Discovers all installed skills and generates the evaluation prompt
 * that hooks use for the 3-step activation sequence.
 *
 * This replaces the hardcoded skill list in skill-forced-eval hook
 * with dynamic discovery from .claude/skills/.
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml } from 'yaml';

/**
 * Extracted skill trigger information
 */
export interface SkillTriggerInfo {
  skillName: string;
  description: string;
  triggerPatterns: string[];
}

/**
 * Options for evaluate command
 */
export interface EvaluateOptions {
  /** Working directory */
  cwd?: string;
  /** Skills directory to scan */
  skillsDir?: string;
  /** Return JSON instead of text */
  json?: boolean;
}

/**
 * Result of evaluate command (when json=true)
 */
export interface EvaluateResult {
  skills: SkillTriggerInfo[];
  prompt: string;
}

/**
 * Extract trigger patterns from a SKILL.md file
 */
export async function extractSkillTriggers(skillMdPath: string): Promise<SkillTriggerInfo> {
  const content = await readFile(skillMdPath, 'utf-8');

  // Parse frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error(`Invalid SKILL.md format: missing frontmatter in ${skillMdPath}`);
  }

  const frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  const body = match[2];

  const skillName = frontmatter.name as string;
  let description = '';
  if (typeof frontmatter.description === 'string') {
    description = frontmatter.description;
  } else if (frontmatter.description) {
    description = String(frontmatter.description).trim();
  }

  // Extract trigger patterns from various section types
  const triggerPatterns: string[] = [];

  // Patterns for trigger sections
  const sectionPatterns = [
    /##\s*When to Use[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*Trigger Conditions[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*When to Invoke[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*Context\s*\/\s*Trigger Conditions[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
    /##\s*When NOT to Use[^\n]*\n([\s\S]*?)(?=\n##|$)/i,
  ];

  for (const pattern of sectionPatterns) {
    const sectionMatch = body.match(pattern);
    if (sectionMatch) {
      const sectionContent = sectionMatch[1];

      // Extract bullet points
      const lines = sectionContent.split('\n');
      for (const line of lines) {
        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (bulletMatch) {
          const bulletText = bulletMatch[1].trim()
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
            .replace(/`([^`]+)`/g, '$1') // Remove code
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links

          if (bulletText && bulletText.length > 3) {
            triggerPatterns.push(bulletText);
          }
        }
      }
    }
  }

  return {
    skillName,
    description,
    triggerPatterns,
  };
}

/**
 * Discover all installed skills in a directory
 */
export async function discoverInstalledSkills(skillsDir: string): Promise<SkillTriggerInfo[]> {
  const skills: SkillTriggerInfo[] = [];

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = join(skillsDir, entry.name);
      const skillMdPath = join(skillPath, 'SKILL.md');

      try {
        await stat(skillMdPath);
        const triggerInfo = await extractSkillTriggers(skillMdPath);
        skills.push(triggerInfo);
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
 * Format trigger patterns into a readable string
 */
function formatTriggerString(patterns: string[]): string {
  if (patterns.length === 0) {
    return 'No specific triggers defined';
  }

  // Take first 3-4 triggers to keep it concise
  const displayPatterns = patterns.slice(0, 4);
  return displayPatterns.join(', ');
}

/**
 * Generate the full evaluation prompt for skill activation
 */
export async function generateEvaluationPrompt(skillsDir: string): Promise<string> {
  const skills = await discoverInstalledSkills(skillsDir);

  if (skills.length === 0) {
    return `
## MANDATORY SKILL ACTIVATION SEQUENCE

No skills installed. Install skills with: skills add <skill-name>
`;
  }

  // Build the skill list with triggers
  const skillLines = skills.map(skill => {
    const triggers = formatTriggerString(skill.triggerPatterns);
    return `- ${skill.skillName}: Trigger = ${triggers}`;
  });

  return `
## MANDATORY SKILL ACTIVATION SEQUENCE

### Step 1 - EVALUATE (do this in your response):
For each installed skill, state: [skill-name] - YES/NO - [reason]

Installed skills to evaluate:
${skillLines.join('\n')}

### Step 2 - ACTIVATE (do this immediately after Step 1):
IF any skills are YES → Use Skill(skill-name) tool for EACH relevant skill NOW
IF no skills are YES → State "No skills activated" and proceed

### Step 3 - IMPLEMENT:
Only after Step 2 is complete, proceed with implementation.

## CRITICAL REQUIREMENTS

1. You MUST call Skill() tool in Step 2 for every YES skill
2. The evaluation (Step 1) is WORTHLESS unless you ACTIVATE (Step 2) the skills
3. Do NOT skip to implementation without completing Step 2

## Example of Correct Sequence:

\`\`\`
SKILL EVALUATION (Step 1):
- tdd: YES - fixing a bug in the CLI
- no-workarounds: YES - fixing CLI tool code
- dogfood-skills: NO - not completing a feature yet

ACTIVATING SKILLS (Step 2):
[Calls Skill("tdd")]
[Calls Skill("no-workarounds")]

IMPLEMENTING (Step 3):
[Now proceeds with implementation following both activated skills]
\`\`\`

## BLOCKING CONDITIONS - NO EXCEPTIONS

- If tdd = YES: You are BLOCKED until Phase 1 (RED) is complete - failing test required
- If no-workarounds = YES: You are BLOCKED from manual workarounds
- Skills CHAIN: If both tdd AND no-workarounds are YES, follow BOTH

## NO EXCEPTIONS

These rationalizations are REJECTED:
- "It's a simple change" → BLOCKED. Write the test.
- "Just this once" → BLOCKED. That's what you said last time.
- "I'll add tests after" → BLOCKED. Tests after = not TDD.
- "It's faster to do it manually" → BLOCKED. Fix the tool.
- "The tool is mostly working" → BLOCKED. Mostly = broken.
- "One-time migration" → BLOCKED. Build the feature.

If you are unsure whether a skill applies, ASK THE USER:
"Should I skip the [skill-name] skill for this task?"

Only proceed without activation if user EXPLICITLY says yes.

This activation sequence is MANDATORY. Skipping Step 2 violates project policy.
`;
}

/**
 * Main evaluate command handler
 */
export async function evaluateCommand(options: EvaluateOptions = {}): Promise<EvaluateResult | undefined> {
  const cwd = options.cwd || process.cwd();
  const skillsDir = options.skillsDir || join(cwd, '.claude', 'skills');

  const skills = await discoverInstalledSkills(skillsDir);
  const prompt = await generateEvaluationPrompt(skillsDir);

  if (options.json) {
    return { skills, prompt };
  }

  console.log(prompt);
  return undefined;
}
