import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SkillsConfig, ProfilesConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Default paths for chain configuration files
 */
export function getDefaultChainsDir(): string {
  // In source: packages/chain/src/loader -> up 2 levels
  // In dist:   packages/chain/dist/src/loader -> up 3 levels
  // Check if we're in dist or src
  if (__dirname.includes('/dist/')) {
    return join(__dirname, '..', '..', '..', 'chains');
  }
  return join(__dirname, '..', '..', 'chains');
}

/**
 * Load and validate skills configuration from YAML
 */
export async function loadSkillsConfig(path?: string): Promise<SkillsConfig> {
  const filePath = path ?? join(getDefaultChainsDir(), 'skills.yaml');

  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = parseYaml(content);
    return SkillsConfig.parse(parsed);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Skills config not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Load and validate profiles configuration from YAML
 */
export async function loadProfilesConfig(path?: string): Promise<ProfilesConfig> {
  const filePath = path ?? join(getDefaultChainsDir(), 'profiles.yaml');

  try {
    const content = await readFile(filePath, 'utf-8');
    const parsed = parseYaml(content);
    return ProfilesConfig.parse(parsed);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Profiles config not found: ${filePath}`);
    }
    throw error;
  }
}

/**
 * Validation result for chain configurations
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  path: string;
  message: string;
}

export interface ValidationWarning {
  file: string;
  path: string;
  message: string;
}

/**
 * Validate skills and profiles configurations
 */
export async function validateConfigs(
  skillsPath?: string,
  profilesPath?: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let skillsConfig: SkillsConfig | null = null;
  let profilesConfig: ProfilesConfig | null = null;

  // Load and validate skills
  try {
    skillsConfig = await loadSkillsConfig(skillsPath);
  } catch (error) {
    if (error instanceof Error) {
      // Check if it's a Zod validation error
      if ('issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        for (const issue of zodError.issues) {
          errors.push({
            file: 'skills.yaml',
            path: issue.path.join('.'),
            message: issue.message,
          });
        }
      } else {
        errors.push({
          file: 'skills.yaml',
          path: '',
          message: error.message,
        });
      }
    }
  }

  // Load and validate profiles
  try {
    profilesConfig = await loadProfilesConfig(profilesPath);
  } catch (error) {
    if (error instanceof Error) {
      if ('issues' in error) {
        const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
        for (const issue of zodError.issues) {
          errors.push({
            file: 'profiles.yaml',
            path: issue.path.join('.'),
            message: issue.message,
          });
        }
      } else {
        errors.push({
          file: 'profiles.yaml',
          path: '',
          message: error.message,
        });
      }
    }
  }

  // Cross-validate if both configs loaded successfully
  if (skillsConfig && profilesConfig) {
    // Build set of all capabilities provided by skills
    const providedCapabilities = new Set<string>();
    for (const skill of skillsConfig.skills) {
      for (const cap of skill.provides) {
        providedCapabilities.add(cap);
      }
    }

    // Check that all required capabilities in profiles are provided
    for (const profile of profilesConfig.profiles) {
      for (const cap of profile.capabilities_required) {
        if (!providedCapabilities.has(cap)) {
          errors.push({
            file: 'profiles.yaml',
            path: `profiles.${profile.name}.capabilities_required`,
            message: `Capability "${cap}" is required but no skill provides it`,
          });
        }
      }
    }

    // Check that all skill requirements can be satisfied
    for (const skill of skillsConfig.skills) {
      for (const req of skill.requires) {
        if (!providedCapabilities.has(req)) {
          errors.push({
            file: 'skills.yaml',
            path: `skills.${skill.name}.requires`,
            message: `Capability "${req}" is required but no skill provides it`,
          });
        }
      }
    }

    // Warn about unused capabilities
    const usedCapabilities = new Set<string>();
    for (const profile of profilesConfig.profiles) {
      for (const cap of profile.capabilities_required) {
        usedCapabilities.add(cap);
      }
    }
    for (const skill of skillsConfig.skills) {
      for (const req of skill.requires) {
        usedCapabilities.add(req);
      }
    }

    for (const cap of providedCapabilities) {
      if (!usedCapabilities.has(cap)) {
        warnings.push({
          file: 'skills.yaml',
          path: `capabilities`,
          message: `Capability "${cap}" is provided but never required by any profile or skill`,
        });
      }
    }

    // Check for conflicting skills that might both be needed
    const skillByName = new Map(skillsConfig.skills.map(s => [s.name, s]));
    for (const skill of skillsConfig.skills) {
      for (const conflict of skill.conflicts) {
        if (!skillByName.has(conflict)) {
          warnings.push({
            file: 'skills.yaml',
            path: `skills.${skill.name}.conflicts`,
            message: `Skill "${skill.name}" conflicts with "${conflict}" but that skill doesn't exist`,
          });
        }
      }
    }

    // Check default_profile exists
    if (profilesConfig.default_profile) {
      const profileNames = new Set(profilesConfig.profiles.map(p => p.name));
      if (!profileNames.has(profilesConfig.default_profile)) {
        errors.push({
          file: 'profiles.yaml',
          path: 'default_profile',
          message: `Default profile "${profilesConfig.default_profile}" does not exist`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Combined config with skills and profiles
 */
export interface ChainConfig {
  skills: SkillsConfig['skills'];
  profiles: ProfilesConfig['profiles'];
  default_profile?: string;
}

/**
 * Load both skills and profiles configurations
 * 
 * If cwd is provided and explicit paths are not, looks for chains/ directory in cwd.
 */
export async function loadConfig(
  cwd?: string,
  skillsPath?: string,
  profilesPath?: string
): Promise<ChainConfig> {
  // If cwd is provided and no explicit paths, look in cwd/chains/
  const chainsDir = cwd ? join(cwd, 'chains') : undefined;
  const resolvedSkillsPath = skillsPath ?? (chainsDir ? join(chainsDir, 'skills.yaml') : undefined);
  const resolvedProfilesPath = profilesPath ?? (chainsDir ? join(chainsDir, 'profiles.yaml') : undefined);

  const skillsConfig = await loadSkillsConfig(resolvedSkillsPath);
  const profilesConfig = await loadProfilesConfig(resolvedProfilesPath);

  return {
    skills: skillsConfig.skills,
    profiles: profilesConfig.profiles,
    default_profile: profilesConfig.default_profile,
  };
}

