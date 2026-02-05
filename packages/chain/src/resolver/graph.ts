import type { SkillSpec } from '../types/index.js';

/**
 * Edge in the capability graph
 */
export interface GraphEdge {
  from: string;      // Skill that provides the capability
  to: string;        // Skill that requires the capability
  capability: string; // The capability that creates this dependency
}

/**
 * Result of cycle detection
 */
export interface CycleResult {
  hasCycle: boolean;
  cycle: string[];   // Skills in the cycle, empty if no cycle
}

/**
 * Capability graph for skill dependency resolution
 *
 * Nodes are skills, edges represent capability dependencies.
 * Edge from A to B means: A provides a capability that B requires.
 */
export class CapabilityGraph {
  private skills: Map<string, SkillSpec> = new Map();
  private capabilityProviders: Map<string, string[]> = new Map();
  private edges: GraphEdge[] = [];
  private adjacency: Map<string, string[]> = new Map();

  constructor(skills: SkillSpec[]) {
    // Index skills by name
    for (const skill of skills) {
      this.skills.set(skill.name, skill);
      this.adjacency.set(skill.name, []);
    }

    // Index capability providers
    for (const skill of skills) {
      for (const cap of skill.provides) {
        if (!this.capabilityProviders.has(cap)) {
          this.capabilityProviders.set(cap, []);
        }
        // INVARIANT: cap was just set on line 43 if not present
        this.capabilityProviders.get(cap)!.push(skill.name);
      }
    }

    // Build edges: for each skill's requirement, find providers
    for (const skill of skills) {
      for (const req of skill.requires) {
        const providers = this.capabilityProviders.get(req) || [];
        for (const provider of providers) {
          if (provider !== skill.name) {
            this.edges.push({
              from: provider,
              to: skill.name,
              capability: req,
            });
            // INVARIANT: adjacency initialized for all skills in constructor at line 36
            this.adjacency.get(provider)!.push(skill.name);
          }
        }
      }
    }
  }

  /**
   * Get all skills in the graph
   */
  getSkills(): SkillSpec[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get a skill by name
   */
  getSkill(name: string): SkillSpec | undefined {
    return this.skills.get(name);
  }

  /**
   * Get skills that provide a capability
   */
  getProviders(capability: string): SkillSpec[] {
    const names = this.capabilityProviders.get(capability) || [];
    return names.map(n => this.skills.get(n)!).filter(Boolean);
  }

  /**
   * Get all edges in the graph
   */
  getEdges(): GraphEdge[] {
    return [...this.edges];
  }

  /**
   * Get skills that depend on a given skill (successors in DAG)
   */
  getDependents(skillName: string): string[] {
    return this.adjacency.get(skillName) || [];
  }

  /**
   * Get skills that a given skill depends on (predecessors in DAG)
   */
  getDependencies(skillName: string): string[] {
    return this.edges
      .filter(e => e.to === skillName)
      .map(e => e.from);
  }

  /**
   * Detect cycles in the graph using DFS
   */
  detectCycles(): CycleResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): string[] | null => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const neighbor of this.adjacency.get(node) || []) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor);
          if (cycle) return cycle;
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle - extract it from path
          const cycleStart = path.indexOf(neighbor);
          return [...path.slice(cycleStart), neighbor];
        }
      }

      recursionStack.delete(node);
      path.pop();
      return null;
    };

    for (const skill of this.skills.keys()) {
      if (!visited.has(skill)) {
        const cycle = dfs(skill);
        if (cycle) {
          return { hasCycle: true, cycle };
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  /**
   * Topological sort using Kahn's algorithm
   * Returns skills in dependency order (dependencies first)
   */
  topologicalSort(): string[] | null {
    // Calculate in-degrees
    const inDegree = new Map<string, number>();
    for (const skill of this.skills.keys()) {
      inDegree.set(skill, 0);
    }
    for (const edge of this.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
    }

    // Find nodes with no incoming edges
    const queue: string[] = [];
    for (const [skill, degree] of inDegree) {
      if (degree === 0) {
        queue.push(skill);
      }
    }

    // Sort queue by skill properties for determinism
    queue.sort((a, b) => this.compareSkills(a, b));

    const result: string[] = [];

    while (queue.length > 0) {
      // Always take the first (sorted) element for determinism
      // INVARIANT: loop condition guarantees queue.length > 0
      const node = queue.shift()!;
      result.push(node);

      // Reduce in-degree of neighbors
      for (const neighbor of this.adjacency.get(node) || []) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) {
          queue.push(neighbor);
          // Re-sort to maintain determinism
          queue.sort((a, b) => this.compareSkills(a, b));
        }
      }
    }

    // If we didn't process all nodes, there's a cycle
    if (result.length !== this.skills.size) {
      return null;
    }

    return result;
  }

  /**
   * Compare skills for tie-breaking: risk (asc) → cost (asc) → name (alpha)
   */
  private compareSkills(a: string, b: string): number {
    // INVARIANT: compareSkills only called for skill names that exist in this.skills
    const skillA = this.skills.get(a)!;
    const skillB = this.skills.get(b)!;

    // Risk order: low < medium < high < critical
    const riskOrder = { low: 0, medium: 1, high: 2, critical: 3 };
    const riskDiff = riskOrder[skillA.risk] - riskOrder[skillB.risk];
    if (riskDiff !== 0) return riskDiff;

    // Cost order: low < medium < high
    const costOrder = { low: 0, medium: 1, high: 2 };
    const costDiff = costOrder[skillA.cost] - costOrder[skillB.cost];
    if (costDiff !== 0) return costDiff;

    // Alphabetical by name
    return a.localeCompare(b);
  }

  /**
   * Get subgraph containing only skills needed for given capabilities
   */
  getSubgraph(capabilities: string[]): CapabilityGraph {
    const needed = new Set<string>();
    const queue = [...capabilities];

    // Find all skills that provide needed capabilities
    while (queue.length > 0) {
      // INVARIANT: loop condition guarantees queue.length > 0
      const cap = queue.shift()!;
      const providers = this.capabilityProviders.get(cap) || [];

      for (const provider of providers) {
        if (!needed.has(provider)) {
          needed.add(provider);
          // Add this skill's requirements to the queue
          // INVARIANT: provider from capabilityProviders contains only existing skill names
          const skill = this.skills.get(provider)!;
          for (const req of skill.requires) {
            if (!queue.includes(req)) {
              queue.push(req);
            }
          }
        }
      }
    }

    // Create new graph with only needed skills
    // INVARIANT: needed set only contains verified skill names added through provider lookup
    const neededSkills = Array.from(needed).map(n => this.skills.get(n)!);
    return new CapabilityGraph(neededSkills);
  }
}
