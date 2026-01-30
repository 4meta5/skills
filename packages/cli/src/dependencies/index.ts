/**
 * Skill Dependency Management
 *
 * This module provides tools for:
 * - Resolving transitive dependencies
 * - Detecting missing dependencies
 * - Finding dependents (reverse dependency lookup)
 * - Detecting conflicts between skills
 */

export {
  resolveDependencies,
  detectMissingDependencies,
  getDependentsOf,
  type SkillDependency,
  type DependencyGraph,
  type CircularDependencyError
} from './resolver.js';

export {
  detectConflicts,
  blockInstallIfConflict,
  type SkillConflict
} from './conflicts.js';
