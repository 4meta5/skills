import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { homedir } from 'os';

/**
 * A git-based skill source
 */
export interface SkillSource {
  name: string;
  url: string;
  path?: string;  // Optional subdirectory within the repo
  ref?: string;   // Branch/tag/commit (default: main)
  type: 'git';
}

/**
 * Installed skill with source tracking
 */
export interface InstalledSkillRef {
  name: string;
  source: string;  // Source name or 'bundled' or 'local'
  ref?: string;    // Pinned version
  installedAt: string;
}

export interface SkillsConfig {
  defaults: string[];
  sources: SkillSource[];
  installed: InstalledSkillRef[];
}

const CONFIG_DIR = join(homedir(), '.config', 'claude-skills');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const SOURCES_CACHE_DIR = join(CONFIG_DIR, 'sources');

const DEFAULT_CONFIG: SkillsConfig = {
  defaults: [],
  sources: [],
  installed: []
};

export function getSourcesCacheDir(): string {
  return SOURCES_CACHE_DIR;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export async function loadConfig(): Promise<SkillsConfig> {
  try {
    const content = await readFile(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: SkillsConfig): Promise<void> {
  await mkdir(dirname(CONFIG_FILE), { recursive: true });
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getDefaults(): Promise<string[]> {
  const config = await loadConfig();
  return config.defaults;
}

export async function setDefaults(skills: string[]): Promise<void> {
  const config = await loadConfig();
  config.defaults = skills;
  await saveConfig(config);
}

export async function addDefaults(skills: string[]): Promise<void> {
  const config = await loadConfig();
  const newDefaults = new Set([...config.defaults, ...skills]);
  config.defaults = Array.from(newDefaults);
  await saveConfig(config);
}

export async function removeDefaults(skills: string[]): Promise<void> {
  const config = await loadConfig();
  const toRemove = new Set(skills);
  config.defaults = config.defaults.filter(s => !toRemove.has(s));
  await saveConfig(config);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

// Source management functions

export async function getSources(): Promise<SkillSource[]> {
  const config = await loadConfig();
  return config.sources || [];
}

export async function addSource(source: SkillSource): Promise<void> {
  const config = await loadConfig();
  config.sources = config.sources || [];

  // Check for duplicate name
  const existingIndex = config.sources.findIndex(s => s.name === source.name);
  if (existingIndex >= 0) {
    // Update existing source
    config.sources[existingIndex] = source;
  } else {
    config.sources.push(source);
  }

  await saveConfig(config);
}

export async function removeSource(name: string): Promise<boolean> {
  const config = await loadConfig();
  config.sources = config.sources || [];

  const initialLength = config.sources.length;
  config.sources = config.sources.filter(s => s.name !== name);

  if (config.sources.length < initialLength) {
    await saveConfig(config);
    return true;
  }
  return false;
}

export async function getSource(name: string): Promise<SkillSource | undefined> {
  const sources = await getSources();
  return sources.find(s => s.name === name);
}

// Installed skill tracking

export async function getInstalledSkills(): Promise<InstalledSkillRef[]> {
  const config = await loadConfig();
  return config.installed || [];
}

export async function trackInstalledSkill(ref: InstalledSkillRef): Promise<void> {
  const config = await loadConfig();
  config.installed = config.installed || [];

  // Replace if exists, otherwise add
  const existingIndex = config.installed.findIndex(s => s.name === ref.name);
  if (existingIndex >= 0) {
    config.installed[existingIndex] = ref;
  } else {
    config.installed.push(ref);
  }

  await saveConfig(config);
}

export async function untrackInstalledSkill(name: string): Promise<void> {
  const config = await loadConfig();
  config.installed = config.installed || [];
  config.installed = config.installed.filter(s => s.name !== name);
  await saveConfig(config);
}
