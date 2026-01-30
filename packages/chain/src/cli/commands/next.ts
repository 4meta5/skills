import { join } from 'path';
import { loadSkillsConfig, getDefaultChainsDir } from '../../loader/index.js';
import { StateManager } from '../../session/index.js';
import { getSkillGuidance, formatNextCommand } from '../../hooks/skill-guidance.js';

interface NextOptions {
  skills?: string;
  cwd?: string;
  json?: boolean;
}

export async function nextCommand(options: NextOptions): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const cwd = options.cwd ?? process.cwd();

  try {
    const manager = new StateManager(cwd);
    const state = await manager.loadCurrent();

    if (!state) {
      if (options.json) {
        console.log(JSON.stringify({ active: false, next: null }, null, 2));
      } else {
        console.log('No active chain session.');
        console.log('Run `chain activate <profile>` to start a workflow.');
      }
      process.exit(0);
    }

    // Load skills config
    const skillsConfig = await loadSkillsConfig(skillsPath);

    // Get skill guidance
    const guidance = getSkillGuidance(state, skillsConfig.skills);

    if (options.json) {
      console.log(JSON.stringify({
        active: true,
        profile_id: state.profile_id,
        complete: guidance.complete,
        current_skill: guidance.currentSkill,
        next_capability: guidance.nextCapability,
        progress: {
          satisfied: guidance.satisfiedCount,
          total: guidance.totalCount,
          percent: guidance.progressPercent,
        },
        next: guidance.complete ? null : formatNextCommand(guidance),
      }, null, 2));
      process.exit(0);
    }

    // Human-readable output
    if (guidance.complete) {
      console.log(`[chain] ${state.profile_id}: COMPLETE (${guidance.satisfiedCount}/${guidance.totalCount})`);
      console.log('All capabilities satisfied. Workflow is complete.');
    } else {
      const nextCmd = formatNextCommand(guidance);
      console.log(nextCmd);
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
