import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { resolve } from '../../resolver/index.js';
import { StateManager, generateSessionId } from '../../session/index.js';
import type { SessionState } from '../../types/index.js';

interface ActivateOptions {
  skills?: string;
  profiles?: string;
  cwd?: string;
}

export async function activateCommand(
  profileName: string,
  options: ActivateOptions
): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');
  const cwd = options.cwd ?? process.cwd();

  try {
    const skillsConfig = await loadSkillsConfig(skillsPath);
    const profilesConfig = await loadProfilesConfig(profilesPath);

    const profile = profilesConfig.profiles.find(p => p.name === profileName);
    if (!profile) {
      console.error(`Profile "${profileName}" not found`);
      console.error('Available profiles:', profilesConfig.profiles.map(p => p.name).join(', '));
      process.exit(1);
    }

    // Resolve the profile to a chain
    const result = resolve(profile, skillsConfig.skills, { failFast: false });

    if (result.warnings.length > 0) {
      console.log('Warnings during resolution:');
      for (const warning of result.warnings) {
        console.log(`  ⚠ ${warning}`);
      }
      console.log();
    }

    // Create session state
    const sessionId = generateSessionId();
    const state: SessionState = {
      session_id: sessionId,
      profile_id: profile.name,
      activated_at: new Date().toISOString(),
      chain: result.chain,
      capabilities_required: profile.capabilities_required,
      capabilities_satisfied: [],
      current_skill_index: 0,
      strictness: profile.strictness,
      blocked_intents: result.blocked_intents,
    };

    // Save state
    const manager = new StateManager(cwd);
    await manager.create(state);

    console.log(`✓ Activated profile: ${profile.name}`);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Strictness: ${profile.strictness}`);
    console.log();

    if (result.chain.length > 0) {
      console.log('Chain:');
      for (let i = 0; i < result.chain.length; i++) {
        const skill = result.chain[i];
        console.log(`  ${i + 1}. ${skill}`);
      }
      console.log();
    }

    if (Object.keys(result.blocked_intents).length > 0) {
      console.log('Blocked Intents:');
      for (const [intent, reason] of Object.entries(result.blocked_intents)) {
        console.log(`  ${intent}: ${reason}`);
      }
      console.log();
    }

    console.log('Run `chain status` to see current progress.');
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}
