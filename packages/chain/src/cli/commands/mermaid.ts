import { join } from 'path';
import { loadSkillsConfig, loadProfilesConfig, getDefaultChainsDir } from '../../loader/index.js';
import { resolve, CapabilityGraph } from '../../resolver/index.js';
import type { SkillSpec } from '../../types/index.js';

interface MermaidOptions {
  skills?: string;
  profiles?: string;
  capabilities?: boolean;  // Show capability nodes instead of skills
}

export async function mermaidCommand(
  profileName: string,
  options: MermaidOptions
): Promise<void> {
  const chainsDir = getDefaultChainsDir();
  const skillsPath = options.skills ?? join(chainsDir, 'skills.yaml');
  const profilesPath = options.profiles ?? join(chainsDir, 'profiles.yaml');

  try {
    const skillsConfig = await loadSkillsConfig(skillsPath);
    const profilesConfig = await loadProfilesConfig(profilesPath);

    const profile = profilesConfig.profiles.find(p => p.name === profileName);
    if (!profile) {
      console.error(`Profile "${profileName}" not found`);
      process.exit(1);
    }

    const result = resolve(profile, skillsConfig.skills, { failFast: false });

    if (options.capabilities) {
      // Generate capability-focused diagram
      generateCapabilityDiagram(result.chain, skillsConfig.skills);
    } else {
      // Generate skill-focused diagram
      generateSkillDiagram(result.chain, skillsConfig.skills);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

function generateSkillDiagram(chain: string[], allSkills: SkillSpec[]): void {
  const skillByName = new Map(allSkills.map(s => [s.name, s]));
  const chainSkills = chain.map(name => skillByName.get(name)!).filter(Boolean);
  const graph = new CapabilityGraph(chainSkills);

  console.log('```mermaid');
  console.log('graph TD');

  // Add nodes with styling based on risk
  for (const skill of chainSkills) {
    const riskClass = getRiskClass(skill.risk);
    const label = `${skill.name}`;
    console.log(`    ${sanitizeId(skill.name)}["${label}"]:::${riskClass}`);
  }

  console.log();

  // Add edges
  const edges = graph.getEdges();
  for (const edge of edges) {
    console.log(`    ${sanitizeId(edge.from)} -->|"${edge.capability}"| ${sanitizeId(edge.to)}`);
  }

  console.log();

  // Add class definitions
  console.log('    classDef low fill:#90EE90,stroke:#228B22');
  console.log('    classDef medium fill:#FFD700,stroke:#DAA520');
  console.log('    classDef high fill:#FFA07A,stroke:#FF4500');
  console.log('    classDef critical fill:#FF6B6B,stroke:#DC143C');

  console.log('```');
}

function generateCapabilityDiagram(chain: string[], allSkills: SkillSpec[]): void {
  const skillByName = new Map(allSkills.map(s => [s.name, s]));
  const chainSkills = chain.map(name => skillByName.get(name)!).filter(Boolean);

  // Build capability dependency graph
  const capabilityProviders = new Map<string, string>();
  for (const skill of chainSkills) {
    for (const cap of skill.provides) {
      capabilityProviders.set(cap, skill.name);
    }
  }

  console.log('```mermaid');
  console.log('graph TD');

  // Add capability nodes
  const allCapabilities = new Set<string>();
  for (const skill of chainSkills) {
    for (const cap of skill.provides) {
      allCapabilities.add(cap);
    }
  }

  for (const cap of allCapabilities) {
    const provider = capabilityProviders.get(cap) || 'unknown';
    console.log(`    ${sanitizeId(cap)}["${cap}<br/><small>${provider}</small>"]`);
  }

  console.log();

  // Add edges based on skill requirements
  for (const skill of chainSkills) {
    for (const req of skill.requires) {
      for (const provided of skill.provides) {
        if (allCapabilities.has(req)) {
          console.log(`    ${sanitizeId(req)} --> ${sanitizeId(provided)}`);
        }
      }
    }
  }

  console.log('```');
}

function sanitizeId(name: string): string {
  // Replace characters that aren't valid in Mermaid IDs
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function getRiskClass(risk: 'low' | 'medium' | 'high' | 'critical'): string {
  return risk;
}
