import { rm, stat } from 'fs/promises';
import { join } from 'path';
import { untrackProjectInstallation, untrackInstalledSkill } from '../config.js';
import { updateClaudeMd } from '../claudemd.js';

interface RemoveOptions {
  cwd?: string;
}

/**
 * Remove skills from a project
 */
export async function removeCommand(names: string[], options: RemoveOptions = {}): Promise<void> {
  const projectDir = options.cwd || process.cwd();

  if (names.length === 0) {
    console.log('Usage: skills remove <skill-names...>');
    return;
  }

  let removed = 0;

  for (const name of names) {
    const skillPath = join(projectDir, '.claude', 'skills', name);

    try {
      // Check if skill exists
      await stat(skillPath);

      // Remove the skill directory
      await rm(skillPath, { recursive: true, force: true });

      // Untrack from project installations
      await untrackProjectInstallation(projectDir, name, 'skill');

      // Untrack from global installed skills list
      await untrackInstalledSkill(name);

      console.log(`- ${name}`);
      removed++;
    } catch {
      console.error(`x ${name} - not found`);
    }
  }

  if (removed > 0) {
    console.log(`\nRemoved ${removed} skill(s)`);
  }

  // Always update CLAUDE.md to remove references (even if directories didn't exist)
  const result = await updateClaudeMd(projectDir, 'remove', names);
  if (result.success && result.removed.length > 0) {
    console.log('Updated CLAUDE.md');
  }
}
