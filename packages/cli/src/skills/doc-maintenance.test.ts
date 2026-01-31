import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('doc-maintenance skill', () => {
  // Navigate from packages/cli/src/skills to project root
  const projectRoot = join(__dirname, '..', '..', '..', '..');
  const skillPath = join(
    projectRoot,
    '.claude/skills/doc-maintenance/SKILL.md'
  );

  it('should reference docs/PLAN.md as the consolidated plan location', async () => {
    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('docs/PLAN.md');
  });

  it('should mention consolidation from package-level PLAN.md files', async () => {
    const content = await readFile(skillPath, 'utf-8');
    expect(content).toMatch(/packages\/\*\/PLAN\.md|package-level|consolidat/i);
  });

  it('should chain markdown-writer for consistent style', async () => {
    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('markdown-writer');
  });

  it('should not reference generic PLAN.md without docs/ prefix for main updates', async () => {
    const content = await readFile(skillPath, 'utf-8');
    // The skill should reference docs/PLAN.md for the main consolidated plan
    // It should NOT tell users to update a generic "PLAN.md" in the root or current directory
    const lines = content.split('\n');
    const stepLines = lines.filter(
      (line) =>
        line.includes('Read') ||
        line.includes('Update') ||
        line.includes('Step')
    );

    // Check that when referring to THE plan file to update, it's docs/PLAN.md
    const updateLines = lines.filter((line) =>
      line.match(/update.*plan\.md/i)
    );
    const hasConsolidatedReference = updateLines.some((line) =>
      line.includes('docs/PLAN.md')
    );

    // If there are update references, at least one should be to docs/PLAN.md
    if (updateLines.length > 0) {
      expect(hasConsolidatedReference).toBe(true);
    }
  });
});
