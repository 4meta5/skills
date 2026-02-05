import { describe, it, expect } from 'vitest';
import { readdir, stat, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Guardrail tests ensure project structure invariants are maintained.
 * These tests prevent files from being tracked in the generated directory.
 */
describe('Project Structure Guardrails', () => {
  describe('packages/skills/skills/ is generated-only', () => {
    const generatedSkillsDir = join(__dirname, '..', 'skills');
    const repoRoot = join(__dirname, '..', '..', '..'); // packages/skills/src -> repo root

    it('should have no files tracked in git under packages/skills/skills/', async () => {
      // This test fails if ANY files under packages/skills/skills/ are tracked in git.
      // The directory is gitignored and should only contain files generated at build time.
      // If this test fails, someone committed files to the generated directory.
      // Note: this check is best-effort and requires git to be available in the test environment.

      let trackedFiles: string[] = [];

      try {
        // Use git ls-files to check for tracked files under the generated directory
        const relativePath = 'packages/skills/skills';
        const output = execSync(`git ls-files "${relativePath}"`, {
          cwd: repoRoot,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        trackedFiles = output.trim().split('\n').filter(f => f.length > 0);
      } catch {
        // git ls-files failed (not a git repo, or path doesn't exist in git)
        // This is fine - means no files are tracked
        return;
      }

      if (trackedFiles.length > 0) {
        throw new Error(
          `BLOCKED: Files tracked in git under packages/skills/skills/:\n` +
          `  ${trackedFiles.slice(0, 10).join('\n  ')}` +
          (trackedFiles.length > 10 ? `\n  ... and ${trackedFiles.length - 10} more` : '') +
          `\n\n` +
          `The packages/skills/skills/ directory is generated output.\n` +
          `All skills must be created in root skills/ directory.\n` +
          `To fix: git rm -r --cached packages/skills/skills/\n` +
          `See CONTRIBUTING.md for the canonical skill location.`
        );
      }
    });

    it('should be gitignored', async () => {
      // Verify .gitignore exists and ignores the skills/ directory
      const gitignorePath = join(__dirname, '..', '.gitignore');

      const gitignore = await readFile(gitignorePath, 'utf-8');
      expect(gitignore).toContain('skills/');
    });

    it('should have sync consistency with root skills/ when files exist', async () => {
      // If any skill files exist (from running sync-skills.sh), verify they
      // have matching entries in the canonical root skills/ directory.

      let foundSkills: string[] = [];

      try {
        const dirStat = await stat(generatedSkillsDir);
        if (!dirStat.isDirectory()) {
          return; // Not a directory, pass
        }
        foundSkills = await findSkillFiles(generatedSkillsDir);
      } catch {
        return; // Directory doesn't exist, ideal state before build
      }

      if (foundSkills.length === 0) {
        return; // No skills to check
      }

      // Skills are at repo root, not in a skills/ subdirectory
      const missingFromRoot: string[] = [];

      for (const skillPath of foundSkills) {
        const skillName = dirname(skillPath.replace(generatedSkillsDir + '/', ''));
        const rootSkillPath = join(repoRoot, skillName, 'SKILL.md');

        try {
          await stat(rootSkillPath);
        } catch {
          missingFromRoot.push(skillName);
        }
      }

      expect(missingFromRoot).toEqual([]);
      if (missingFromRoot.length > 0) {
        throw new Error(
          `Skills in packages/skills/skills/ missing from root skills/:\n` +
          `  ${missingFromRoot.join('\n  ')}\n\n` +
          `All skills must exist in root skills/ first.\n` +
          `Run: npm run sync-skills to regenerate from root skills/.`
        );
      }
    });
  });
});

/**
 * Directories to exclude when searching for SKILL.md files.
 * These contain generated/vendored content, not canonical skills.
 */
const EXCLUDED_DIRS = ['packages', 'node_modules', '.git'];

/**
 * Recursively find all SKILL.md files in a directory.
 * Excludes generated directories to avoid finding stale slop.
 */
async function findSkillFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip excluded directories (generated output, deps, git)
      if (entry.isDirectory() && EXCLUDED_DIRS.includes(entry.name)) {
        continue;
      }

      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const nested = await findSkillFiles(fullPath);
        results.push(...nested);
      } else if (entry.name === 'SKILL.md') {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return results;
}

/**
 * Skill Invariant Tests
 * These tests enforce invariants across ALL installed skills to prevent:
 * 1. Shell-eval failures when Skill() loads content
 * 2. Nested duplicate directory slop
 * 3. Invalid frontmatter category values
 */
describe('Skill Invariants (all skills)', () => {
  const repoRoot = join(__dirname, '..', '..', '..'); // packages/skills/src -> repo root
  const installedSkillsDir = join(repoRoot, '.claude', 'skills');
  const validCategories = ['testing', 'development', 'documentation', 'refactoring', 'security', 'performance'];

  it('should not contain shell-unsafe patterns in any SKILL.md', async () => {
    // Bug: Skill() tool passes content through shell eval, causing parse errors
    // Known failure pattern: `!`) (backtick-bang-backtick-closeparen)
    // This triggers bash history expansion + subshell parse error
    const skillFiles = await findSkillFiles(installedSkillsDir);
    const violations: string[] = [];

    for (const skillPath of skillFiles) {
      const content = await readFile(skillPath, 'utf-8');
      // The specific pattern that caused "parse error near ')'"
      if (/`[^`]*!`\)/.test(content)) {
        const relPath = skillPath.replace(repoRoot + '/', '');
        violations.push(relPath);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should not have nested duplicate directories (skill/skill/)', async () => {
    // Bug: Slop like code-review-ts/code-review-ts/ can accumulate
    const violations: string[] = [];

    try {
      const skillDirs = await readdir(installedSkillsDir, { withFileTypes: true });

      for (const entry of skillDirs) {
        if (!entry.isDirectory()) continue;

        const skillName = entry.name;
        const nestedPath = join(installedSkillsDir, skillName, skillName);

        try {
          const s = await stat(nestedPath);
          if (s.isDirectory()) {
            violations.push(`${skillName}/${skillName}/`);
          }
        } catch {
          // Doesn't exist, which is correct
        }
      }
    } catch {
      // Skills dir doesn't exist
    }

    expect(violations).toEqual([]);
  });

  it('should have valid category in all skill frontmatter', async () => {
    // Bug: Invalid categories like "code-quality" are not in SkillCategory enum
    const skillFiles = await findSkillFiles(installedSkillsDir);
    const violations: string[] = [];

    for (const skillPath of skillFiles) {
      const content = await readFile(skillPath, 'utf-8');
      const categoryMatch = content.match(/^category:\s*(.+)$/m);

      if (categoryMatch) {
        const category = categoryMatch[1].trim();
        if (!validCategories.includes(category)) {
          const relPath = skillPath.replace(repoRoot + '/', '');
          violations.push(`${relPath}: invalid category "${category}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('should have code-review-ts with category refactoring', async () => {
    // Specific assertion: code-review-ts must be refactoring category
    const skillPath = join(installedSkillsDir, 'code-review-ts', 'SKILL.md');
    const content = await readFile(skillPath, 'utf-8');
    const categoryMatch = content.match(/^category:\s*(.+)$/m);

    expect(categoryMatch).not.toBeNull();
    expect(categoryMatch![1].trim()).toBe('refactoring');
  });
});
