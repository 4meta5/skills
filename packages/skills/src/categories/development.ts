import type { SkillCategory } from '../types.js';

/**
 * Development category metadata
 */
export const developmentCategory: SkillCategory = 'development';

/**
 * Skills that belong to the development category
 */
export const developmentSkills = [
  'code-review',
  'refactoring',
  'debugging'
] as const;

export type DevelopmentSkill = typeof developmentSkills[number];
