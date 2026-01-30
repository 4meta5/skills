import type { SessionState, SkillSpec, CompletionRequirement } from '../types/index.js';
import type { EvidenceResult } from '../session/evidence-checker.js';

/**
 * Format a denial message for a blocked tool intent
 */
export function formatIntentDenial(
  blockedIntents: Array<{ intent: string; reason: string }>,
  sessionState: SessionState,
  skills: SkillSpec[]
): string {
  const lines: string[] = [];

  lines.push('## CHAIN ENFORCEMENT: BLOCKED');
  lines.push('');

  // Primary reason
  const primary = blockedIntents[0];
  lines.push(`**Reason:** ${primary.reason}`);
  lines.push('');

  // Find skills that provide the blocked capabilities
  const skillByName = new Map(skills.map(s => [s.name, s]));
  const unsatisfiedCaps = new Set<string>();

  for (const skill of skills) {
    if (skill.tool_policy?.deny_until) {
      for (const [intent, rule] of Object.entries(skill.tool_policy.deny_until)) {
        if (blockedIntents.some(b => b.intent === intent)) {
          const satisfied = sessionState.capabilities_satisfied.some(
            e => e.capability === rule.until
          );
          if (!satisfied) {
            unsatisfiedCaps.add(rule.until);
          }
        }
      }
    }
  }

  // Prerequisites not met
  lines.push('### Prerequisites Not Met:');
  for (const cap of unsatisfiedCaps) {
    // Find skill that provides this capability
    const provider = skills.find(s => s.provides.includes(cap));
    const hint = provider
      ? `Activate skill '${provider.name}' to satisfy`
      : 'Unknown provider';
    lines.push(`- [ ] ${cap}: ${hint}`);
  }
  lines.push('');

  // How to proceed
  lines.push('### How to Proceed:');

  const nextSkill = sessionState.chain.find(name => {
    const skill = skillByName.get(name);
    if (!skill) return false;
    return skill.provides.some(cap => unsatisfiedCaps.has(cap));
  });

  if (nextSkill) {
    lines.push(`1. Run \`Skill(skill: "${nextSkill}")\` to enter the required workflow`);
    lines.push('2. Complete the skill requirements');
    lines.push('3. Then this action will be allowed');
  } else {
    lines.push('1. Complete the required workflow steps');
    lines.push('2. Satisfy the prerequisites listed above');
    lines.push('3. Then retry this action');
  }

  lines.push('');

  // Add the direct command for easy copy-paste
  if (nextSkill) {
    lines.push(`**NEXT STEP:** Skill(skill: "${nextSkill}")`);
  }

  return lines.join('\n');
}

/**
 * Format a denial message for incomplete completion requirements
 */
export function formatCompletionDenial(
  missing: Array<{ requirement: CompletionRequirement; result: EvidenceResult }>,
  sessionState: SessionState
): string {
  const lines: string[] = [];

  lines.push('## CHAIN ENFORCEMENT: STOP BLOCKED');
  lines.push('');
  lines.push(`**Profile:** ${sessionState.profile_id}`);
  lines.push(`**Strictness:** ${sessionState.strictness}`);
  lines.push('');
  lines.push('Cannot complete the workflow until all completion requirements are met.');
  lines.push('');

  lines.push('### Missing Requirements:');
  for (const { requirement, result } of missing) {
    lines.push(`- [ ] **${requirement.name}** (${requirement.type})`);
    if (requirement.description) {
      lines.push(`      ${requirement.description}`);
    }
    if (result.error) {
      lines.push(`      Error: ${result.error}`);
    }
  }
  lines.push('');

  lines.push('### How to Proceed:');
  lines.push('1. Complete all missing requirements above');
  lines.push('2. The workflow will auto-complete when all requirements are satisfied');
  lines.push('3. Or run `chain clear --force` to abandon the workflow');

  return lines.join('\n');
}

/**
 * Format a status summary for hook output
 */
export function formatStatusSummary(
  sessionState: SessionState,
  action: 'allowed' | 'blocked'
): string {
  const satisfied = sessionState.capabilities_satisfied.length;
  const total = sessionState.capabilities_required.length;
  const progress = Math.round((satisfied / total) * 100);

  if (action === 'allowed') {
    return `[chain] ${sessionState.profile_id}: ${satisfied}/${total} (${progress}%) - allowed`;
  } else {
    return `[chain] ${sessionState.profile_id}: ${satisfied}/${total} (${progress}%) - BLOCKED`;
  }
}
