import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliRoot = resolve(__dirname, '..');

describe('CLI bin entry point', () => {
  it('bin/skills.js exists', () => {
    const binPath = resolve(cliRoot, 'bin', 'skills.js');
    expect(existsSync(binPath)).toBe(true);
  });

  it('bin/skills.js is executable and shows help', () => {
    const binPath = resolve(cliRoot, 'bin', 'skills.js');
    
    // Run the CLI with --help and check it succeeds
    const result = execSync(`node "${binPath}" --help`, {
      encoding: 'utf-8',
      cwd: cliRoot,
    });
    
    expect(result).toContain('skills');
    expect(result).toContain('list');
    expect(result).toContain('scan');
  });

  it('npm run skills works from monorepo root', () => {
    const monorepoRoot = resolve(cliRoot, '..', '..');
    
    const result = execSync('npm run skills -- --help', {
      encoding: 'utf-8',
      cwd: monorepoRoot,
    });
    
    expect(result).toContain('skills');
  });
});
