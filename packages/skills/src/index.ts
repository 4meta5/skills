// Main library exports
export { createSkillsLibrary } from './library.js';
export { loadSkillFromPath, loadSkillsFromDirectory, parseFrontmatter } from './loader.js';

// Types
export type {
  Skill,
  SkillMetadata,
  SkillCategory,
  ProjectTemplate,
  FileStructure,
  InstallOptions,
  SkillsLibraryOptions,
  SkillsLibrary,
  ParsedFrontmatter
} from './types.js';

// Categories
export * from './categories/index.js';

// Templates
export { newTsProject } from './templates/new-project.js';
export { extendWithTesting, extendWithSecurity } from './templates/extend-project.js';

// Bundled skills
export {
  tdd,
  unitTestWorkflow,
  suggestTests,
  noWorkarounds,
  codeReview,
  codeReviewTs,
  codeReviewJs,
  codeReviewRust,
  prDescription,
  refactorSuggestions,
  securityAnalysis,
  describeCodebase,
  bundledSkills,
  getBundledSkill,
  listBundledSkillNames
} from './bundled.js';
