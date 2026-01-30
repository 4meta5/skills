import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { resolve } from '../../resolver/index.js';

interface ExplainOptions {
  skills?: string;
  profiles?: string;
}

export async function explainCommand(
  profileName: string,
  options: ExplainOptions
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
      process.exit(1);
    }

    const result = resolve(profile, skillsConfig.skills, { failFast: false });

    console.log(`# ${profile.name} Workflow Explanation`);
    console.log();

    if (profile.description) {
      console.log('## Description');
      console.log(profile.description.trim());
      console.log();
    }

    console.log('## Required Capabilities');
    console.log();
    for (const cap of profile.capabilities_required) {
      console.log(`- ${cap}`);
    }
    console.log();

    console.log('## Resolution Process');
    console.log();

    if (result.chain.length === 0) {
      console.log('No skills were selected. Either no capabilities are required or no providers were found.');
    } else {
      for (let i = 0; i < result.chain.length; i++) {
        const skill = result.chain[i];
        const explanation = result.explanations[i];
        const skillSpec = skillsConfig.skills.find(s => s.name === skill);

        console.log(`### Step ${i + 1}: ${skill}`);
        console.log();
        console.log(`**Why selected:** ${explanation.reason}`);
        console.log();

        if (skillSpec?.description) {
          console.log(`**Description:** ${skillSpec.description.trim()}`);
          console.log();
        }

        console.log('| Property | Value |');
        console.log('|----------|-------|');
        console.log(`| Risk | ${skillSpec?.risk ?? 'unknown'} |`);
        console.log(`| Cost | ${skillSpec?.cost ?? 'unknown'} |`);
        console.log(`| Provides | ${explanation.provides.join(', ') || 'none'} |`);
        console.log(`| Requires | ${explanation.requires.join(', ') || 'none'} |`);
        console.log();
      }
    }

    if (Object.keys(result.blocked_intents).length > 0) {
      console.log('## Tool Gating');
      console.log();
      console.log('The following tool intents are blocked until their prerequisites are met:');
      console.log();
      console.log('| Intent | Blocked Reason |');
      console.log('|--------|----------------|');
      for (const [intent, reason] of Object.entries(result.blocked_intents)) {
        console.log(`| ${intent} | ${reason} |`);
      }
      console.log();
    }

    if (profile.completion_requirements.length > 0) {
      console.log('## Completion Requirements');
      console.log();
      console.log('The workflow is complete when all of these are satisfied:');
      console.log();
      for (const req of profile.completion_requirements) {
        console.log(`- **${req.name}** (${req.type})`);
        if (req.description) {
          console.log(`  ${req.description}`);
        }
        if (req.pattern) {
          console.log(`  Pattern: \`${req.pattern}\``);
        }
        if (req.file) {
          console.log(`  File: \`${req.file}\``);
        }
        if (req.command) {
          console.log(`  Command: \`${req.command}\``);
        }
      }
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log('## Warnings');
      console.log();
      for (const warning of result.warnings) {
        console.log(`- ⚠️ ${warning}`);
      }
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
