/**
 * Confidence level for detections
 */
export type Confidence = 'high' | 'medium' | 'low';

/**
 * Category classification for skills
 * Used for functional deduplication - skills in the same category
 * serve similar purposes and only the best one should be recommended
 */
export type SkillCategory =
  | 'testing'
  | 'security'
  | 'framework'
  | 'deployment'
  | 'database'
  | 'code-quality'
  | 'documentation'
  | 'workflow';

/**
 * Category of detected technology
 */
export type TechnologyCategory =
  | 'language'
  | 'framework'
  | 'deployment'
  | 'testing'
  | 'database';

/**
 * A detected technology with confidence and evidence
 */
export interface DetectedTechnology {
  name: string;
  category: TechnologyCategory;
  confidence: Confidence;
  version?: string;
  evidence: string;  // How it was detected (e.g., "package.json", "wrangler.toml")
  tags: string[];    // Tags for skill matching
}

/**
 * Complete project analysis result
 */
export interface ProjectAnalysis {
  languages: DetectedTechnology[];
  frameworks: DetectedTechnology[];
  deployment: DetectedTechnology[];
  testing: DetectedTechnology[];
  databases: DetectedTechnology[];
  existingSkills: string[];
  projectPath: string;
  workspaces?: string[];  // List of scanned workspace paths (relative to projectPath)
}

/**
 * Package.json structure (partial)
 */
export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
}

/**
 * Cargo dependency specification
 */
export type CargoDependency = string | {
  version?: string;
  features?: string[];
  optional?: boolean;
  path?: string;
  git?: string;
};

/**
 * Cargo.toml structure (partial)
 */
export interface CargoToml {
  package?: {
    name?: string;
    version?: string;
  };
  dependencies?: Record<string, CargoDependency>;
  'dev-dependencies'?: Record<string, CargoDependency>;
}

/**
 * pyproject.toml structure (partial)
 */
export interface PyProjectToml {
  project?: {
    name?: string;
    dependencies?: string[];
  };
  tool?: {
    poetry?: {
      dependencies?: Record<string, string>;
      'dev-dependencies'?: Record<string, string>;
    };
  };
}

/**
 * Detection context passed to detector functions
 */
export interface DetectionContext {
  projectPath: string;
  packageJson?: PackageJson;
  cargoToml?: CargoToml;
  pyProjectToml?: PyProjectToml;
  envVars?: Record<string, string>;
  configFiles: string[];  // List of config files found
}

/**
 * Detector function signature
 */
export type DetectorFunction = (ctx: DetectionContext) => Promise<DetectedTechnology[]>;
