import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { StateManager, EvidenceChecker } from '../../session/index.js';
import { getSkillGuidance, formatGuidanceOutput } from '../../hooks/skill-guidance.js';

interface StatusOptions {
  skills?: string;
  profiles?: string;
  cwd?: string;
  json?: boolean;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');
  const cwd = options.cwd ?? process.cwd();

  try {
    const manager = new StateManager(cwd);
    const state = await manager.loadCurrent();

    if (!state) {
      if (options.json) {
        console.log(JSON.stringify({ active: false }, null, 2));
      } else {
        console.log('No active chain session.');
        console.log('Run `chain activate <profile>` to start a workflow.');
      }
      process.exit(0);
    }

    // Load configs for additional info
    const skillsConfig = await loadSkillsConfig(skillsPath);
    const profilesConfig = await loadProfilesConfig(profilesPath);

    const profile = profilesConfig.profiles.find(p => p.name === state.profile_id);
    const checker = new EvidenceChecker(cwd);

    // Check which capabilities are currently satisfied
    const satisfiedCaps = new Set(state.capabilities_satisfied.map(e => e.capability));
    const unsatisfiedCaps = state.capabilities_required.filter(c => !satisfiedCaps.has(c));

    // Check completion requirements if profile exists
    let completionStatus: { name: string; satisfied: boolean; error?: string }[] = [];
    if (profile) {
      const results = await checker.checkAllRequirements(profile.completion_requirements);
      completionStatus = profile.completion_requirements.map(req => ({
        name: req.name,
        satisfied: results.get(req.name)?.satisfied ?? false,
        error: results.get(req.name)?.error,
      }));
    }

    // Get skill guidance
    const guidance = getSkillGuidance(state, skillsConfig.skills);

    if (options.json) {
      console.log(JSON.stringify({
        active: true,
        session_id: state.session_id,
        profile_id: state.profile_id,
        strictness: state.strictness,
        activated_at: state.activated_at,
        chain: state.chain,
        capabilities: {
          required: state.capabilities_required,
          satisfied: Array.from(satisfiedCaps),
          unsatisfied: unsatisfiedCaps,
        },
        blocked_intents: state.blocked_intents,
        completion: completionStatus,
        guidance: {
          complete: guidance.complete,
          current_skill: guidance.currentSkill,
          next_capability: guidance.nextCapability,
          progress_percent: guidance.progressPercent,
        },
      }, null, 2));
      process.exit(0);
    }

    // Human-readable output
    console.log(`Profile: ${state.profile_id}`);
    console.log(`Session: ${state.session_id}`);
    console.log(`Strictness: ${state.strictness}`);
    console.log(`Activated: ${state.activated_at}`);
    console.log();

    console.log('Chain:');
    for (let i = 0; i < state.chain.length; i++) {
      const skill = state.chain[i];
      const skillSpec = skillsConfig.skills.find(s => s.name === skill);
      const capsProvided = skillSpec?.provides || [];
      const allProvided = capsProvided.every(c => satisfiedCaps.has(c));
      const someProvided = capsProvided.some(c => satisfiedCaps.has(c));

      let status = '○';
      if (allProvided && capsProvided.length > 0) {
        status = '✓';
      } else if (someProvided) {
        status = '◐';
      }

      console.log(`  ${status} ${i + 1}. ${skill}`);
    }
    console.log();

    console.log('Capabilities:');
    for (const cap of state.capabilities_required) {
      const satisfied = satisfiedCaps.has(cap);
      const status = satisfied ? '✓' : '○';
      const evidence = state.capabilities_satisfied.find(e => e.capability === cap);
      let extra = '';
      if (evidence) {
        extra = ` (${evidence.satisfied_by})`;
      }
      console.log(`  ${status} ${cap}${extra}`);
    }
    console.log();

    if (Object.keys(state.blocked_intents).length > 0) {
      console.log('Blocked Intents:');
      for (const [intent, reason] of Object.entries(state.blocked_intents)) {
        console.log(`  ✗ ${intent}: ${reason}`);
      }
      console.log();
    }

    if (completionStatus.length > 0) {
      console.log('Completion Requirements:');
      for (const req of completionStatus) {
        const status = req.satisfied ? '✓' : '○';
        console.log(`  ${status} ${req.name}`);
      }
      console.log();
    }

    const progress = satisfiedCaps.size / state.capabilities_required.length * 100;
    console.log(`Progress: ${satisfiedCaps.size}/${state.capabilities_required.length} capabilities (${progress.toFixed(0)}%)`);
    console.log();

    // Skill guidance
    if (guidance.complete) {
      console.log('Status: COMPLETE ✓');
      console.log('All capabilities satisfied. Workflow is complete.');
    } else {
      console.log(`Next Step: Skill(skill: "${guidance.currentSkill}")`);
      console.log(`To satisfy: ${guidance.nextCapability}`);
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
