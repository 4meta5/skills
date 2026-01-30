import type { SkillSpec, ProfileSpec, ResolutionResult } from '../types/index.js';
import { CapabilityGraph } from './graph.js';

/**
 * Explanation for why a skill was selected
 */
export interface SkillExplanation {
  skill: string;
  reason: string;
  provides: string[];
  requires: string[];
}

/**
 * Conflict between two skills
 */
export interface ConflictError {
  skill1: string;
  skill2: string;
  reason: string;
}

/**
 * Resolver options
 */
export interface ResolveOptions {
  /**
   * If true, stop on first conflict. If false, collect all conflicts.
   */
  failFast?: boolean;
}

/**
 * Resolve a profile to an ordered skill chain
 *
 * Algorithm:
 * 1. Build capability→skills index
 * 2. For each required capability (in order):
 *    a. Skip if already satisfied
 *    b. Find skills that provide it
 *    c. Filter by satisfied requirements (recursive)
 *    d. Detect conflicts with selected skills
 *    e. Tie-break: lowest risk, lowest cost, alphabetical
 *    f. Add to chain, mark capabilities as satisfied
 * 3. Return chain with explanations
 */
export function resolve(
  profile: ProfileSpec,
  skills: SkillSpec[],
  options: ResolveOptions = {}
): ResolutionResult {
  const { failFast = true } = options;

  const chain: string[] = [];
  const explanations: SkillExplanation[] = [];
  const warnings: string[] = [];
  const blockedIntents: Record<string, string> = {};

  // Track satisfied capabilities
  const satisfiedCapabilities = new Set<string>();

  // Build skill index
  const skillByName = new Map(skills.map(s => [s.name, s]));

  // Build capability → providers index
  const capabilityProviders = new Map<string, SkillSpec[]>();
  for (const skill of skills) {
    for (const cap of skill.provides) {
      if (!capabilityProviders.has(cap)) {
        capabilityProviders.set(cap, []);
      }
      capabilityProviders.get(cap)!.push(skill);
    }
  }

  // Track selected skills for conflict detection
  const selectedSkills = new Set<string>();

  // Helper: check if a skill's requirements are satisfied
  const canSelect = (skill: SkillSpec): boolean => {
    return skill.requires.every(req => satisfiedCapabilities.has(req));
  };

  // Helper: check for conflicts with already selected skills
  const findConflicts = (skill: SkillSpec): ConflictError[] => {
    const conflicts: ConflictError[] = [];

    for (const selected of selectedSkills) {
      const selectedSkill = skillByName.get(selected)!;

      // Check if selected skill conflicts with new skill
      if (selectedSkill.conflicts.includes(skill.name)) {
        conflicts.push({
          skill1: selected,
          skill2: skill.name,
          reason: `Skill "${selected}" declares conflict with "${skill.name}"`,
        });
      }

      // Check if new skill conflicts with selected skill
      if (skill.conflicts.includes(selected)) {
        conflicts.push({
          skill1: skill.name,
          skill2: selected,
          reason: `Skill "${skill.name}" declares conflict with "${selected}"`,
        });
      }
    }

    return conflicts;
  };

  // Helper: compare skills for tie-breaking
  const compareSkills = (a: SkillSpec, b: SkillSpec): number => {
    // Risk order: low < medium < high < critical
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const riskDiff = riskOrder[a.risk] - riskOrder[b.risk];
    if (riskDiff !== 0) return riskDiff;

    // Cost order: low < medium < high
    const costOrder = { low: 0, medium: 1, high: 2 };
    const costDiff = costOrder[a.cost] - costOrder[b.cost];
    if (costDiff !== 0) return costDiff;

    // Alphabetical by name
    return a.name.localeCompare(b.name);
  };

  // Helper: select a skill and add to chain
  const selectSkill = (skill: SkillSpec, reason: string): void => {
    chain.push(skill.name);
    selectedSkills.add(skill.name);

    // Collect blocked intents from tool policy BEFORE marking capabilities satisfied
    // These represent what's blocked at the START of the workflow
    if (skill.tool_policy?.deny_until) {
      for (const [intent, rule] of Object.entries(skill.tool_policy.deny_until)) {
        // Always add the blocked intent - it's released when evidence is provided
        blockedIntents[intent] = rule.reason;
      }
    }

    // Mark provided capabilities as satisfied (for resolution purposes)
    for (const cap of skill.provides) {
      satisfiedCapabilities.add(cap);
    }

    explanations.push({
      skill: skill.name,
      reason,
      provides: [...skill.provides],
      requires: [...skill.requires],
    });
  };

  // Helper: recursively satisfy a capability
  const satisfyCapability = (cap: string, depth: number = 0): boolean => {
    if (depth > 100) {
      warnings.push(`Max recursion depth reached while satisfying "${cap}"`);
      return false;
    }

    if (satisfiedCapabilities.has(cap)) {
      return true;
    }

    const providers = capabilityProviders.get(cap);
    if (!providers || providers.length === 0) {
      warnings.push(`No skill provides capability "${cap}"`);
      return false;
    }

    // Find providers that can be selected (requirements met)
    const eligible: SkillSpec[] = [];

    for (const provider of providers) {
      // Skip if already selected
      if (selectedSkills.has(provider.name)) {
        continue;
      }

      // Check if requirements can be satisfied
      let canSatisfyRequirements = true;
      for (const req of provider.requires) {
        if (!satisfiedCapabilities.has(req)) {
          // Try to satisfy the requirement recursively
          if (!satisfyCapability(req, depth + 1)) {
            canSatisfyRequirements = false;
            break;
          }
        }
      }

      if (canSatisfyRequirements && canSelect(provider)) {
        // Check for conflicts
        const conflicts = findConflicts(provider);
        if (conflicts.length === 0) {
          eligible.push(provider);
        } else if (failFast) {
          throw new Error(conflicts[0].reason);
        } else {
          for (const conflict of conflicts) {
            warnings.push(conflict.reason);
          }
        }
      }
    }

    if (eligible.length === 0) {
      warnings.push(`Cannot satisfy capability "${cap}" - no eligible providers`);
      return false;
    }

    // Sort by tie-breaking rules and select the best
    eligible.sort(compareSkills);
    const selected = eligible[0];

    selectSkill(selected, `Provides "${cap}"`);
    return true;
  };

  // Process each required capability in order
  for (const cap of profile.capabilities_required) {
    satisfyCapability(cap, 0);
  }

  // Build final graph to get proper ordering
  const selectedSkillSpecs = chain.map(name => skillByName.get(name)!);
  const graph = new CapabilityGraph(selectedSkillSpecs);
  const sorted = graph.topologicalSort();

  if (sorted === null) {
    // This shouldn't happen if our logic is correct, but handle it
    warnings.push('Cycle detected in resolved chain');
    return {
      chain,
      explanations,
      blocked_intents: blockedIntents,
      warnings,
    };
  }

  // Re-order chain according to topological sort
  const orderedChain = sorted;
  const orderedExplanations = orderedChain.map(name =>
    explanations.find(e => e.skill === name)!
  );

  return {
    chain: orderedChain,
    explanations: orderedExplanations,
    blocked_intents: blockedIntents,
    warnings,
  };
}

/**
 * Detect conflicts in a set of skills
 */
export function detectConflicts(skills: SkillSpec[]): ConflictError[] {
  const conflicts: ConflictError[] = [];
  const skillByName = new Map(skills.map(s => [s.name, s]));

  for (const skill of skills) {
    for (const conflictName of skill.conflicts) {
      if (skillByName.has(conflictName)) {
        conflicts.push({
          skill1: skill.name,
          skill2: conflictName,
          reason: `Skill "${skill.name}" conflicts with "${conflictName}"`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Validate that a chain is well-formed
 */
export function validateChain(
  chain: string[],
  skills: SkillSpec[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const skillByName = new Map(skills.map(s => [s.name, s]));
  const graph = new CapabilityGraph(chain.map(name => skillByName.get(name)!).filter(Boolean));

  // Check for missing skills
  for (const name of chain) {
    if (!skillByName.has(name)) {
      errors.push(`Skill "${name}" not found`);
    }
  }

  // Check for cycles
  const cycleResult = graph.detectCycles();
  if (cycleResult.hasCycle) {
    errors.push(`Cycle detected: ${cycleResult.cycle.join(' → ')}`);
  }

  // Check for conflicts
  const chainSkills = chain.map(name => skillByName.get(name)!).filter(Boolean);
  const conflicts = detectConflicts(chainSkills);
  for (const conflict of conflicts) {
    errors.push(conflict.reason);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
