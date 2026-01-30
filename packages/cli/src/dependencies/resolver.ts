/**
 * Skill Dependency Resolution
 *
 * Handles dependency resolution for skills, including:
 * - Resolving transitive dependencies
 * - Detecting missing dependencies
 * - Finding dependents (skills that depend on a given skill)
 * - Circular dependency detection
 */

/**
 * Represents a skill with its dependencies
 */
export interface SkillDependency {
  skillName: string;
  dependencies: string[];
}

/**
 * A graph mapping skill names to their dependencies
 */
export type DependencyGraph = Record<string, string[]>;

/**
 * Error thrown when a circular dependency is detected
 */
export interface CircularDependencyError extends Error {
  cycle: string[];
}

/**
 * Creates a circular dependency error with the cycle path
 */
function createCircularDependencyError(cycle: string[]): CircularDependencyError {
  const error = new Error(
    `Circular dependency detected: ${cycle.join(' -> ')}`
  ) as CircularDependencyError;
  error.cycle = cycle;
  return error;
}

/**
 * Resolves all dependencies for a skill in installation order.
 *
 * Returns dependencies in topological order (deepest dependencies first),
 * excluding any skills that are already installed.
 *
 * @param skill - The skill to resolve dependencies for
 * @param installed - List of already installed skill names
 * @param graph - The dependency graph
 * @returns Array of skill names to install in order
 * @throws {CircularDependencyError} If a circular dependency is detected
 */
export function resolveDependencies(
  skill: string,
  installed: string[],
  graph: DependencyGraph
): string[] {
  const installedSet = new Set(installed);
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>(); // For cycle detection

  function visit(current: string, path: string[]): void {
    // Skip if already installed
    if (installedSet.has(current)) {
      return;
    }

    // Check for circular dependency
    if (visiting.has(current)) {
      const cycleStart = path.indexOf(current);
      const cycle = [...path.slice(cycleStart), current];
      throw createCircularDependencyError(cycle);
    }

    // Skip if already visited in this resolution
    if (visited.has(current)) {
      return;
    }

    // Get dependencies for current skill
    const deps = graph[current];
    if (!deps) {
      // Unknown skill, no dependencies
      return;
    }

    // Mark as currently visiting (for cycle detection)
    visiting.add(current);

    // Visit all dependencies first (depth-first)
    for (const dep of deps) {
      visit(dep, [...path, current]);
    }

    // Done visiting this node
    visiting.delete(current);
    visited.add(current);

    // Add to result after all dependencies are added
    // (but don't add the original skill being resolved)
    if (current !== skill && !installedSet.has(current)) {
      result.push(current);
    }
  }

  // Start resolution from the target skill
  visit(skill, []);

  return result;
}

/**
 * Detects missing dependencies for a skill.
 *
 * Returns a list of skills that need to be installed for the given skill
 * to have all its dependencies satisfied. This includes checking that
 * installed dependencies also have their transitive dependencies satisfied.
 *
 * @param skill - The skill to check dependencies for
 * @param installed - List of already installed skill names
 * @param graph - The dependency graph
 * @returns Array of missing dependency names in installation order
 */
export function detectMissingDependencies(
  skill: string,
  installed: string[],
  graph: DependencyGraph
): string[] {
  const installedSet = new Set(installed);
  const missing: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(current: string): void {
    // Check for circular dependency (avoid infinite loop)
    if (visiting.has(current)) {
      return;
    }

    // Skip if already visited
    if (visited.has(current)) {
      return;
    }

    // Get dependencies for current skill
    const deps = graph[current];
    if (!deps) {
      return;
    }

    visiting.add(current);

    // Check all dependencies
    for (const dep of deps) {
      visit(dep);

      // If this dependency is not installed, add it to missing
      if (!installedSet.has(dep) && !missing.includes(dep)) {
        missing.push(dep);
      }
    }

    visiting.delete(current);
    visited.add(current);
  }

  // Start from the target skill and also check all installed dependencies
  visit(skill);

  // Also check installed dependencies for their missing transitive deps
  for (const installedSkill of installed) {
    visit(installedSkill);
  }

  return missing;
}

/**
 * Gets all skills that directly depend on the given skill.
 *
 * Useful for warning when removing a skill that others depend on.
 *
 * @param skill - The skill to find dependents for
 * @param graph - The dependency graph
 * @returns Array of skill names that depend on the given skill
 */
export function getDependentsOf(
  skill: string,
  graph: DependencyGraph
): string[] {
  const dependents: string[] = [];
  const visited = new Set<string>();

  function findDependents(target: string): void {
    for (const [skillName, deps] of Object.entries(graph)) {
      if (visited.has(skillName)) {
        continue;
      }

      if (deps.includes(target)) {
        visited.add(skillName);
        dependents.push(skillName);
      }
    }
  }

  findDependents(skill);

  return dependents;
}
