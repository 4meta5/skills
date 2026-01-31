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

  it('should reference PLAN.md at root as the consolidated plan location', async () => {
    const content = await readFile(skillPath, 'utf-8');
    // Should mention PLAN.md is at root, not in docs/
    expect(content).toMatch(/PLAN\.md.*root|root.*PLAN\.md/i);
  });

  it('should mention consolidation from package-level PLAN.md files into root', async () => {
    const content = await readFile(skillPath, 'utf-8');
    // Should mention consolidating package-level plans into root PLAN.md
    expect(content).toMatch(/packages\/\*\/PLAN\.md|package-level|consolidat/i);
    expect(content).toMatch(/root.*PLAN\.md|PLAN\.md.*root/i);
  });

  it('should chain markdown-writer for consistent style', async () => {
    const content = await readFile(skillPath, 'utf-8');
    expect(content).toContain('markdown-writer');
  });

  it('should not reference docs/PLAN.md - plan should be at root', async () => {
    const content = await readFile(skillPath, 'utf-8');
    // The skill should NOT reference docs/PLAN.md
    // PLAN.md lives at root for simplicity (convention over configuration)
    expect(content).not.toContain('docs/PLAN.md');
  });
});
