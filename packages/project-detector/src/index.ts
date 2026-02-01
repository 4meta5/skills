/**
 * @4meta5/project-detector
 *
 * Detect project technology stack including languages, frameworks, databases, and more.
 *
 * @example
 * ```typescript
 * import { analyzeProject, getAllTags } from '@4meta5/project-detector';
 *
 * const analysis = await analyzeProject('./my-project');
 *
 * console.log('Languages:', analysis.languages.map(l => l.name));
 * console.log('Frameworks:', analysis.frameworks.map(f => f.name));
 * console.log('Databases:', analysis.databases.map(d => d.name));
 * console.log('All tags:', getAllTags(analysis));
 * ```
 *
 * @packageDocumentation
 */

// Types
export type {
  Confidence,
  TechnologyCategory,
  DetectedTechnology,
  ProjectAnalysis,
  PackageJson,
  CargoToml,
  CargoDependency,
  PyProjectToml,
  DetectionContext,
  AnalysisOptions
} from './types.js';

// Main detector
export {
  analyzeProject,
  getAllTechnologies,
  getAllTags,
  createDetectionContext
} from './detector.js';

// Individual detectors (for custom usage)
export { detectLanguages } from './language.js';
export { detectFrameworks } from './framework.js';
export { detectDeployment } from './deployment.js';
export { detectTesting } from './testing.js';
export { detectDatabases } from './database.js';
