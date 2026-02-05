import { describe, it, expect } from 'vitest';
import { readFile, readdir } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import { BUNDLED_SKILL_MAPPINGS } from './matcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const SYNC_SCRIPT = join(REPO_ROOT, 'packages', 'skills', 'scripts', 'sync-skills.sh');
const BUNDLED_DIR = join(REPO_ROOT, 'packages', 'skills', 'skills');

function parseBundledSkills(scriptContent: string): string[] {
  const match = scriptContent.match(/BUNDLED_SKILLS=\(([^]*?)\n\)/);
  if (!match) return [];
  const body = match[1];
  const entries = [...body.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  return entries;
}

function parseFrontmatterCategory(contents: string): string | undefined {
  if (!contents.startsWith('---')) return undefined;
  const end = contents.indexOf('\n---', 3);
  if (end === -1) return undefined;
  const frontmatter = contents.slice(3, end);
  const parsed = parseYaml(frontmatter) as { category?: string } | undefined;
  return parsed?.category;
}

describe('Bundled skill invariants', () => {
  it('keeps bundled mapping in sync with bundled list and packaged skills', async () => {
    const scriptContent = await readFile(SYNC_SCRIPT, 'utf-8');
    const bundledList = parseBundledSkills(scriptContent).sort();

    const mappingKeys = Object.keys(BUNDLED_SKILL_MAPPINGS).sort();

    for (const skill of mappingKeys) {
      expect(bundledList).toContain(skill);
    }

    const packaged = (await readdir(BUNDLED_DIR, { withFileTypes: true }))
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();

    for (const skill of mappingKeys) {
      expect(packaged).toContain(skill);
    }
  });

  it('keeps bundled skill categories consistent with matcher metadata', async () => {
    for (const [skillName, mapping] of Object.entries(BUNDLED_SKILL_MAPPINGS)) {
      const skillPath = join(BUNDLED_DIR, skillName, 'SKILL.md');
      const contents = await readFile(skillPath, 'utf-8');
      const category = parseFrontmatterCategory(contents);

      expect(category).toBeDefined();
      expect(category).toBe(mapping.category);
    }
  });
});
