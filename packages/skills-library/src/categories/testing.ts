import type { SkillCategory } from '../types.js';

/**
 * Testing category metadata
 */
export const testingCategory: SkillCategory = 'testing';

/**
 * Skills that belong to the testing category
 */
export const testingSkills = [
  'test-first-bugfix',
  'unit-testing',
  'integration-testing'
] as const;

export type TestingSkill = typeof testingSkills[number];
