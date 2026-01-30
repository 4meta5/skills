import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { resolve } from '../../resolver/index.js';

interface ResolveOptions {
  skills?: string;
  profiles?: string;
  json?: boolean;
}

export async function resolveCommand(
  profileName: string,
  options: ResolveOptions
): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');

  try {
    const skillsConfig = await loadSkillsConfig(skillsPath);
    const profilesConfig = await loadProfilesConfig(profilesPath);

    const profile = profilesConfig.profiles.find(p => p.name === profileName);
    if (!profile) {
      console.error(`Profile "${profileName}" not found`);
      console.error('Available profiles:', profilesConfig.profiles.map(p => p.name).join(', '));
      process.exit(1);
    }

    const result = resolve(profile, skillsConfig.skills, { failFast: false });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Profile: ${profileName}`);
      console.log(`Strictness: ${profile.strictness}`);
      console.log();

      if (result.chain.length === 0) {
        console.log('No skills in chain (no capabilities required or no providers found)');
      } else {
        console.log('Chain:');
        for (let i = 0; i < result.chain.length; i++) {
          const skill = result.chain[i];
          const explanation = result.explanations[i];
          console.log(`  ${i + 1}. ${skill}`);
          console.log(`     ${explanation.reason}`);
          if (explanation.provides.length > 0) {
            console.log(`     Provides: ${explanation.provides.join(', ')}`);
          }
          if (explanation.requires.length > 0) {
            console.log(`     Requires: ${explanation.requires.join(', ')}`);
          }
        }
      }

      if (Object.keys(result.blocked_intents).length > 0) {
        console.log();
        console.log('Blocked Intents:');
        for (const [intent, reason] of Object.entries(result.blocked_intents)) {
          console.log(`  ${intent}: ${reason}`);
        }
      }

      if (result.warnings.length > 0) {
        console.log();
        console.log('Warnings:');
        for (const warning of result.warnings) {
          console.log(`  ⚠ ${warning}`);
        }
      }
    }

    process.exit(result.warnings.length > 0 ? 1 : 0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}
