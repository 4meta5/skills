import { createSkillsLibrary, type Skill, type SkillCategory } from '@4meta5/skills';
import { getSources } from '../config.js';
import { listRemoteSkills, loadAllRemoteSkills, type SkillWithSource } from '../registry.js';
import { readProvenance, isUpstreamSkill, isCustomSkill, type Provenance } from '../provenance.js';

interface ListOptions {
  category?: string;
  json?: boolean;
  remote?: boolean;  // List skills from remote sources
  all?: boolean;     // List both local and remote
  custom?: boolean;  // List only custom skills (provenance type: custom or no provenance)
  upstream?: boolean; // List only upstream skills (provenance type: git)
  provenance?: boolean; // Show provenance type for each skill
}

export async function listCommand(options: ListOptions = {}): Promise<void> {
  if (options.remote) {
    await listRemoteCommand(options);
    return;
  }

  if (options.all) {
    await listAllCommand(options);
    return;
  }

  const library = createSkillsLibrary();
  const category = options.category as SkillCategory | undefined;

  let skills = await library.listSkills(category);

  // Filter by provenance type
  if (options.custom || options.upstream) {
    const filteredSkills: Skill[] = [];
    for (const skill of skills) {
      if (options.custom && await isCustomSkill(skill.path)) {
        filteredSkills.push(skill);
      } else if (options.upstream && await isUpstreamSkill(skill.path)) {
        filteredSkills.push(skill);
      }
    }
    skills = filteredSkills;
  }

  if (skills.length === 0) {
    const filterLabel = options.custom ? 'custom ' : options.upstream ? 'upstream ' : '';
    console.log(category ? `No ${filterLabel}skills found in category: ${category}` : `No ${filterLabel}skills found.`);
    return;
  }

  // Get provenance info if needed
  const provenanceMap = new Map<string, Provenance | null>();
  if (options.provenance || options.json) {
    for (const skill of skills) {
      provenanceMap.set(skill.path, await readProvenance(skill.path));
    }
  }

  if (options.json) {
    console.log(JSON.stringify(skills.map(s => formatSkillJsonWithProvenance(s, provenanceMap.get(s.path))), null, 2));
    return;
  }

  const filterLabel = options.custom ? ' (custom only)' : options.upstream ? ' (upstream only)' : '';
  console.log(`\nAvailable skills${category ? ` (${category})` : ''}${filterLabel}:\n`);

  const byCategory = groupByCategory(skills);

  for (const [cat, catSkills] of Object.entries(byCategory)) {
    console.log(`  ${cat || 'uncategorized'}:`);
    for (const skill of catSkills) {
      const invocable = skill.metadata['user-invocable'] ? ' [invocable]' : '';
      const provenanceLabel = options.provenance ? getProvenanceLabel(provenanceMap.get(skill.path)) : '';
      console.log(`    - ${skill.metadata.name}${invocable}${provenanceLabel}`);
      console.log(`      ${skill.metadata.description}`);
    }
    console.log();
  }

  console.log(`Total: ${skills.length} skill(s)\n`);
}

async function listRemoteCommand(options: ListOptions): Promise<void> {
  const sources = await getSources();

  if (sources.length === 0) {
    console.log('No sources configured.');
    console.log('\nAdd a source with:');
    console.log('  skills source add <url>');
    return;
  }

  console.log('Fetching skills from remote sources...\n');

  const remoteSkills = await loadAllRemoteSkills(true);

  if (remoteSkills.length === 0) {
    console.log('No skills found in configured sources.');
    return;
  }

  const category = options.category as SkillCategory | undefined;
  let filtered = remoteSkills;
  if (category) {
    filtered = remoteSkills.filter(s => s.metadata.category === category);
  }

  if (options.json) {
    console.log(JSON.stringify(filtered.map(formatRemoteSkillJson), null, 2));
    return;
  }

  // Group by source
  const bySource = groupBySource(filtered);

  for (const [source, skills] of Object.entries(bySource)) {
    console.log(`  ${source}:`);
    for (const skill of skills) {
      const invocable = skill.metadata['user-invocable'] ? ' [invocable]' : '';
      console.log(`    - ${skill.metadata.name}${invocable}`);
      console.log(`      ${skill.metadata.description}`);
    }
    console.log();
  }

  console.log(`Total: ${filtered.length} skill(s) from ${Object.keys(bySource).length} source(s)\n`);
}

async function listAllCommand(options: ListOptions): Promise<void> {
  const library = createSkillsLibrary();
  const category = options.category as SkillCategory | undefined;

  // Get local skills
  const localSkills = await library.listSkills(category);

  // Get remote skills
  const sources = await getSources();
  let remoteSkills: SkillWithSource[] = [];
  if (sources.length > 0) {
    console.log('Fetching skills from remote sources...\n');
    remoteSkills = await loadAllRemoteSkills(true);
    if (category) {
      remoteSkills = remoteSkills.filter(s => s.metadata.category === category);
    }
  }

  if (localSkills.length === 0 && remoteSkills.length === 0) {
    console.log('No skills found.');
    return;
  }

  if (options.json) {
    const combined = [
      ...localSkills.map(s => ({ ...formatSkillJson(s), source: 'local' })),
      ...remoteSkills.map(formatRemoteSkillJson)
    ];
    console.log(JSON.stringify(combined, null, 2));
    return;
  }

  if (localSkills.length > 0) {
    console.log(`Local/Bundled skills${category ? ` (${category})` : ''}:\n`);
    const byCategory = groupByCategory(localSkills);

    for (const [cat, catSkills] of Object.entries(byCategory)) {
      console.log(`  ${cat || 'uncategorized'}:`);
      for (const skill of catSkills) {
        const invocable = skill.metadata['user-invocable'] ? ' [invocable]' : '';
        console.log(`    - ${skill.metadata.name}${invocable}`);
        console.log(`      ${skill.metadata.description}`);
      }
      console.log();
    }
  }

  if (remoteSkills.length > 0) {
    console.log(`Remote skills${category ? ` (${category})` : ''}:\n`);
    const bySource = groupBySource(remoteSkills);

    for (const [source, skills] of Object.entries(bySource)) {
      console.log(`  ${source}:`);
      for (const skill of skills) {
        const invocable = skill.metadata['user-invocable'] ? ' [invocable]' : '';
        console.log(`    - ${skill.metadata.name}${invocable}`);
        console.log(`      ${skill.metadata.description}`);
      }
      console.log();
    }
  }

  console.log(`Total: ${localSkills.length} local + ${remoteSkills.length} remote = ${localSkills.length + remoteSkills.length} skill(s)\n`);
}

function groupByCategory(skills: Skill[]): Record<string, Skill[]> {
  const groups: Record<string, Skill[]> = {};

  for (const skill of skills) {
    const cat = skill.metadata.category || 'uncategorized';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(skill);
  }

  return groups;
}

function formatSkillJson(skill: Skill) {
  return {
    name: skill.metadata.name,
    description: skill.metadata.description,
    category: skill.metadata.category,
    userInvocable: skill.metadata['user-invocable'] || false,
    path: skill.path
  };
}

function formatRemoteSkillJson(skill: SkillWithSource) {
  return {
    name: skill.metadata.name,
    description: skill.metadata.description,
    category: skill.metadata.category,
    userInvocable: skill.metadata['user-invocable'] || false,
    source: skill.source,
    fullName: skill.fullName,
    path: skill.path
  };
}

function groupBySource(skills: SkillWithSource[]): Record<string, SkillWithSource[]> {
  const groups: Record<string, SkillWithSource[]> = {};

  for (const skill of skills) {
    const source = skill.source;
    if (!groups[source]) {
      groups[source] = [];
    }
    groups[source].push(skill);
  }

  return groups;
}

function getProvenanceLabel(provenance: Provenance | null | undefined): string {
  if (!provenance) {
    return ' [custom]';
  }
  switch (provenance.source.type) {
    case 'git':
      return ' [upstream]';
    case 'bundled':
      return ' [bundled]';
    case 'custom':
    default:
      return ' [custom]';
  }
}

function formatSkillJsonWithProvenance(skill: Skill, provenance: Provenance | null | undefined) {
  return {
    name: skill.metadata.name,
    description: skill.metadata.description,
    category: skill.metadata.category,
    userInvocable: skill.metadata['user-invocable'] || false,
    path: skill.path,
    provenance: provenance ? {
      type: provenance.source.type,
      url: provenance.source.url,
      ref: provenance.source.ref,
      commit: provenance.source.commit
    } : { type: 'custom' }
  };
}
