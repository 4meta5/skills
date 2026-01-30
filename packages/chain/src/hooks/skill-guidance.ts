import type { SessionState, SkillSpec } from '../types/index.js';

/**
 * Result of skill guidance calculation
 */
export interface SkillGuidanceResult {
  /** Whether all capabilities are satisfied */
  complete: boolean;
  /** The skill that provides the next unsatisfied capability, or null if complete */
  currentSkill: string | null;
  /** The next capability that needs to be satisfied, or null if complete */
  nextCapability: string | null;
  /** Number of satisfied capabilities */
  satisfiedCount: number;
  /** Total number of required capabilities */
  totalCount: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
}

/**
 * Calculate skill guidance from session state and skills.
 * Determines which skill should be activated next based on unsatisfied capabilities.
 */
export function getSkillGuidance(
  state: SessionState,
  skills: SkillSpec[]
): SkillGuidanceResult {
  const satisfiedSet = new Set(state.capabilities_satisfied.map(e => e.capability));
  const satisfiedCount = state.capabilities_satisfied.length;
  const totalCount = state.capabilities_required.length;
  const progressPercent = totalCount > 0 ? Math.round((satisfiedCount / totalCount) * 100) : 100;

  // Find the first unsatisfied capability in required order
  for (const capability of state.capabilities_required) {
    if (!satisfiedSet.has(capability)) {
      // Find the skill in the chain that provides this capability
      for (const skillName of state.chain) {
        const skill = skills.find(s => s.name === skillName);
        if (skill && skill.provides.includes(capability)) {
          return {
            complete: false,
            currentSkill: skill.name,
            nextCapability: capability,
            satisfiedCount,
            totalCount,
            progressPercent,
          };
        }
      }
    }
  }

  // All capabilities satisfied
  return {
    complete: true,
    currentSkill: null,
    nextCapability: null,
    satisfiedCount,
    totalCount,
    progressPercent,
  };
}

/**
 * Format the guidance result as a status line for hook output.
 *
 * Format when in progress:
 * [chain] bug-fix: 1/4 (25%) - CURRENT: tdd (need: test_written)
 * → Skill(skill: "tdd")
 *
 * Format when complete:
 * [chain] bug-fix: 4/4 (100%) - COMPLETE
 */
export function formatGuidanceOutput(
  guidance: SkillGuidanceResult,
  profileId: string
): string {
  const { complete, currentSkill, nextCapability, satisfiedCount, totalCount, progressPercent } = guidance;

  const statusLine = `[chain] ${profileId}: ${satisfiedCount}/${totalCount} (${progressPercent}%)`;

  if (complete) {
    return `${statusLine} - COMPLETE`;
  }

  const lines = [
    `${statusLine} - CURRENT: ${currentSkill} (need: ${nextCapability})`,
    `→ Skill(skill: "${currentSkill}")`,
  ];

  return lines.join('\n');
}

/**
 * Format a concise next command output.
 * Just the Skill() call for easy copy-paste.
 */
export function formatNextCommand(guidance: SkillGuidanceResult): string | null {
  if (guidance.complete || !guidance.currentSkill) {
    return null;
  }
  return `Skill(skill: "${guidance.currentSkill}")`;
}
