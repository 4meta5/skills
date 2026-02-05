import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'fs/promises';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
// Skills are at repo root level (not in skills/ subdirectory)
const SKILLS_DIR = REPO_ROOT;

async function findSkillMdFiles(dir: string, depth: number = 0): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  // Skip non-skill directories at root level
  const skipDirs = ['node_modules', 'packages', 'docs', 'hooks', 'scripts', '.claude', '.git'];

  for (const entry of entries) {
    if (depth === 0 && skipDirs.includes(entry.name)) continue;
    if (entry.name.startsWith('.')) continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findSkillMdFiles(fullPath, depth + 1));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      results.push(fullPath);
    }
  }

  return results;
}

function extractSectionLines(contents: string, heading: RegExp): string[] | null {
  const lines = contents.split('\n');
  const startIndex = lines.findIndex(line => heading.test(line));
  if (startIndex === -1) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex + 1, endIndex);
}

function landmineBlocks(lines: string[]): string[] {
  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
      }
      current = [line];
      continue;
    }

    if (current.length > 0) {
      if (/^##\s+/.test(line)) {
        blocks.push(current.join('\n'));
        current = [];
        continue;
      }
      current.push(line);
    }
  }

  if (current.length > 0) {
    blocks.push(current.join('\n'));
  }

  return blocks;
}

describe('Skill content lint', () => {
  it('requires landmines to be backed by references', async () => {
    const skillFiles = await findSkillMdFiles(SKILLS_DIR);

    for (const filePath of skillFiles) {
      const contents = await readFile(filePath, 'utf-8');
      const landmines = extractSectionLines(contents, /^##\s+Landmines/i);
      if (!landmines) continue;

      const references = extractSectionLines(contents, /^##\s+References/i);
      expect(references, `${filePath} is missing ## References`).toBeTruthy();

      const referenceHasUrl = (references || []).some(line => /https?:\/\//.test(line));
      expect(referenceHasUrl, `${filePath} references section needs at least one URL`).toBe(true);

      const blocks = landmineBlocks(landmines);
      for (const block of blocks) {
        const hasUrl = /https?:\/\//.test(block);
        expect(hasUrl, `${filePath} landmine missing source URL: ${block}`).toBe(true);
      }
    }
  });
});
