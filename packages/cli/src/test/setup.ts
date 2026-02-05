import { beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

let configDir: string | undefined;

beforeAll(async () => {
  configDir = await mkdtemp(join(tmpdir(), 'skills-config-test-'));
  process.env.SKILLS_CONFIG_DIR = configDir;
  process.env.SKILLS_TEST_ROOT = tmpdir();
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  if (configDir) {
    await rm(configDir, { recursive: true, force: true });
  }
  delete process.env.SKILLS_CONFIG_DIR;
  delete process.env.SKILLS_TEST_ROOT;
});
