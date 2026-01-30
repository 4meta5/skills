import { readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Source types for skill provenance
 */
export type ProvenanceSourceType = 'git' | 'bundled' | 'custom';

/**
 * Security risk levels
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Source information for a skill
 */
export interface ProvenanceSource {
  type: ProvenanceSourceType;
  url?: string;        // Git URL (for git type)
  path?: string;       // Path within repo or to local source
  ref?: string;        // Git ref (branch/tag)
  commit?: string;     // Git commit hash
}

/**
 * Installation metadata
 */
export interface InstallationInfo {
  at: string;          // ISO timestamp
  by: string;          // Tool that installed (e.g., "skills-cli@1.0.0")
}

/**
 * Update metadata
 */
export interface UpdateInfo {
  at: string;          // ISO timestamp
}

/**
 * Security review metadata
 */
export interface SecurityInfo {
  lastReview: string;  // ISO timestamp
  riskLevel: RiskLevel;
  reviewedBy?: string; // "auto" or "differential-review" or user
  reviewReport?: string; // Path to review report file
}

/**
 * Complete provenance record for a skill
 */
export interface Provenance {
  source: ProvenanceSource;
  installed: InstallationInfo;
  updated?: UpdateInfo;
  security?: SecurityInfo;
}

/**
 * Options for creating provenance
 */
export interface CreateProvenanceOptions {
  security?: SecurityInfo;
}

/**
 * Partial update for provenance
 */
export interface ProvenanceUpdate {
  source?: Partial<ProvenanceSource>;
  updated?: UpdateInfo;
  security?: SecurityInfo;
}

const PROVENANCE_FILE = '.provenance.json';

/**
 * Get the CLI version for tracking
 */
function getCliVersion(): string {
  // In a real implementation, this would read from package.json
  return 'skills-cli@1.0.0';
}

/**
 * Create a provenance file for a skill
 */
export async function createProvenance(
  skillDir: string,
  source: ProvenanceSource,
  options: CreateProvenanceOptions = {}
): Promise<void> {
  const provenance: Provenance = {
    source,
    installed: {
      at: new Date().toISOString(),
      by: getCliVersion()
    }
  };

  if (options.security) {
    provenance.security = options.security;
  }

  const provenancePath = join(skillDir, PROVENANCE_FILE);
  await writeFile(provenancePath, JSON.stringify(provenance, null, 2), 'utf-8');
}

/**
 * Read provenance from a skill directory
 */
export async function readProvenance(skillDir: string): Promise<Provenance | null> {
  const provenancePath = join(skillDir, PROVENANCE_FILE);

  try {
    await stat(provenancePath);
  } catch {
    return null;
  }

  try {
    const content = await readFile(provenancePath, 'utf-8');
    return JSON.parse(content) as Provenance;
  } catch {
    return null;
  }
}

/**
 * Update provenance for a skill
 */
export async function updateProvenance(
  skillDir: string,
  update: ProvenanceUpdate
): Promise<void> {
  const existing = await readProvenance(skillDir);
  if (!existing) {
    throw new Error(`No provenance found at ${skillDir}`);
  }

  // Merge source updates
  if (update.source) {
    existing.source = { ...existing.source, ...update.source };
  }

  // Set updated timestamp
  if (update.updated) {
    existing.updated = update.updated;
  }

  // Update security info
  if (update.security) {
    existing.security = update.security;
  }

  const provenancePath = join(skillDir, PROVENANCE_FILE);
  await writeFile(provenancePath, JSON.stringify(existing, null, 2), 'utf-8');
}

/**
 * Check if a skill has provenance tracking
 */
export async function hasProvenance(skillDir: string): Promise<boolean> {
  const provenance = await readProvenance(skillDir);
  return provenance !== null;
}

/**
 * Determine if a skill is from an upstream source (has git provenance)
 */
export async function isUpstreamSkill(skillDir: string): Promise<boolean> {
  const provenance = await readProvenance(skillDir);
  return provenance?.source.type === 'git';
}

/**
 * Determine if a skill is custom (no provenance or custom type)
 */
export async function isCustomSkill(skillDir: string): Promise<boolean> {
  const provenance = await readProvenance(skillDir);
  return !provenance || provenance.source.type === 'custom';
}
