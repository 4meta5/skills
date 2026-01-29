import { rm, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { untrackProjectInstallation, untrackInstalledSkill } from '../config.js';

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
  await updateClaudeMd(names, projectDir);
}

/**
 * Update CLAUDE.md to remove skill references
 */
async function updateClaudeMd(skillNames: string[], projectDir: string): Promise<void> {
  const claudeMdPath = join(projectDir, 'CLAUDE.md');

  try {
    let content = await readFile(claudeMdPath, 'utf-8');
    let updated = false;

    for (const name of skillNames) {
      // Match various formats of skill references
      const patterns = [
        new RegExp(`^- @\\.claude/skills/${name}/SKILL\\.md\\n?`, 'gm'),
        new RegExp(`^- \\.claude/skills/${name}/SKILL\\.md\\n?`, 'gm'),
        new RegExp(`^\\s*-.*${name}.*SKILL\\.md\\n?`, 'gm'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, '');
          updated = true;
        }
      }
    }

    if (updated) {
      // Clean up any double newlines that might result
      content = content.replace(/\n{3,}/g, '\n\n');
      await writeFile(claudeMdPath, content, 'utf-8');
      console.log('Updated CLAUDE.md');
    }
  } catch {
    // CLAUDE.md doesn't exist, nothing to update
  }
}
