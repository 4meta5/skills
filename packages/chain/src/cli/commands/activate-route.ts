import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { ChainActivator, createRouteDecision } from '../../activator/index.js';
import { RouteDecision } from '../../types/index.js';

interface ActivateRouteOptions {
  skills?: string;
  profiles?: string;
  cwd?: string;
  decision?: string;
  query?: string;
  mode?: string;
  profile?: string;
  json?: boolean;
}

/**
 * Activate a chain from a RouteDecision
 *
 * This command is designed for integration with the Semantic Router.
 * It accepts a RouteDecision payload and activates the appropriate chain.
 *
 * Usage:
 *   chain activate-route --decision '{"request_id":"...", "query":"...", "mode":"immediate"}'
 *   chain activate-route --query "fix the bug" --mode immediate --profile bug-fix
 */
export async function activateRouteCommand(options: ActivateRouteOptions): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');
  const cwd = options.cwd ?? process.cwd();

  try {
    const skillsConfig = await loadSkillsConfig(skillsPath);
    const profilesConfig = await loadProfilesConfig(profilesPath);

    let decision: RouteDecision;

    if (options.decision) {
      // Parse decision from JSON
      try {
        decision = RouteDecision.parse(JSON.parse(options.decision));
      } catch (e) {
        console.error('Invalid RouteDecision JSON:', e instanceof Error ? e.message : e);
        process.exit(1);
      }
    } else if (options.query && options.mode) {
      // Create decision from flags
      const mode = options.mode as 'immediate' | 'suggestion' | 'chat';
      if (!['immediate', 'suggestion', 'chat'].includes(mode)) {
        console.error('Invalid mode. Use: immediate, suggestion, or chat');
        process.exit(1);
      }

      decision = createRouteDecision(
        `cli-${Date.now()}`,
        options.query,
        mode,
        [],
        { selectedProfile: options.profile }
      );
    } else {
      console.error('Provide --decision JSON or --query + --mode');
      process.exit(1);
    }

    const activator = new ChainActivator(
      cwd,
      skillsConfig.skills,
      profilesConfig.profiles
    );

    const result = await activator.activate(decision);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (!result.activated) {
      console.error(`✗ Activation failed: ${result.error}`);
      process.exit(1);
    }

    if (result.idempotent) {
      console.log('↩ Idempotent: Session already exists');
    } else {
      console.log(`✓ Activated profile: ${result.profile_id}`);
    }

    console.log(`  Session ID: ${result.session_id}`);
    console.log(`  Is New: ${result.is_new}`);
    console.log();

    if (result.chain.length > 0) {
      console.log('Chain:');
      for (let i = 0; i < result.chain.length; i++) {
        console.log(`  ${i + 1}. ${result.chain[i]}`);
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
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}
