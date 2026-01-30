/**
 * Skill Conflict Detection
 *
 * Handles detection of conflicting skills during installation.
 * Skills can declare conflicts in their SKILL.md frontmatter:
 *
 * ```yaml
 * ---
 * name: strict-tdd
 * conflicts:
 *   - loose-tdd
 * ---
 * ```
 */

import { loadSkillFromPath } from '@4meta5/skills';
import { join } from 'path';

/**
 * Skill metadata with optional conflicts field
 */
interface SkillMetadataWithConflicts {
  name: string;
  description: string;
  conflicts?: string[];
}

/**
 * Represents conflict information for a skill
 */
export interface SkillConflict {
  skillName: string;
  conflicts: string[];
}

/**
 * Extract the conflicts array from skill metadata
 */
function getConflictsFromMetadata(metadata: unknown): string[] {
  const typed = metadata as SkillMetadataWithConflicts;
  return typed.conflicts || [];
}

/**
 * Detects conflicts between a skill to be installed and already installed skills.
 *
 * Checks both directions:
 * - If the skill being installed declares conflicts with any installed skill
 * - If any installed skill declares conflicts with the skill being installed (bidirectional)
 *
 * @param skillName - Name of the skill to be installed
 * @param installedSkills - Names of already installed skills
 * @param skillsDir - Directory where skills are located
 * @returns Array of conflicting skill names
 */
export async function detectConflicts(
  skillName: string,
  installedSkills: string[],
  skillsDir: string
): Promise<string[]> {
  const conflicts: string[] = [];

  // Load the skill being installed
  const skillPath = join(skillsDir, skillName);
  const skill = await loadSkillFromPath(skillPath);
  const skillConflicts = getConflictsFromMetadata(skill.metadata);

  // Check if skill declares conflicts with any installed skill
  for (const installed of installedSkills) {
    if (skillConflicts.includes(installed)) {
      conflicts.push(installed);
    }
  }

  // Check bidirectional: if any installed skill declares conflicts with this skill
  for (const installedName of installedSkills) {
    // Skip if already identified as conflict
    if (conflicts.includes(installedName)) {
      continue;
    }

    const installedPath = join(skillsDir, installedName);
    const installedSkill = await loadSkillFromPath(installedPath);
    const installedConflicts = getConflictsFromMetadata(installedSkill.metadata);

    if (installedConflicts.includes(skillName)) {
      conflicts.push(installedName);
    }
  }

  return conflicts;
}

/**
 * Blocks installation if there are conflicts, throwing an error.
 *
 * @param skillName - Name of the skill to be installed
 * @param installedSkills - Names of already installed skills
 * @param skillsDir - Directory where skills are located
 * @throws Error if conflicts are detected
 */
export async function blockInstallIfConflict(
  skillName: string,
  installedSkills: string[],
  skillsDir: string
): Promise<void> {
  const conflicts = await detectConflicts(skillName, installedSkills, skillsDir);

  if (conflicts.length > 0) {
    throw new Error(
      `Skill "${skillName}" conflicts with installed skill(s): ${conflicts.join(', ')}`
    );
  }
}
