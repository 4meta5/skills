import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('evaluate command', () => {
  let targetDir: string;
  let skillsDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(join(tmpdir(), 'skills-evaluate-test-'));
    skillsDir = join(targetDir, '.claude', 'skills');
    await mkdir(skillsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('extractSkillTriggers', () => {
    it('should extract trigger patterns from SKILL.md', async () => {
      const skillDir = join(skillsDir, 'tdd');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: tdd
description: Test-Driven Development workflow
---

# TDD Workflow

## When to Use

- Implementing new features
- Fixing bugs
- Refactoring code

## Core Principle

RED → GREEN → REFACTOR
`);

      const { extractSkillTriggers } = await import('./evaluate.js');
      const triggers = await extractSkillTriggers(join(skillDir, 'SKILL.md'));

      expect(triggers.skillName).toBe('tdd');
      expect(triggers.triggerPatterns).toContain('Implementing new features');
      expect(triggers.triggerPatterns).toContain('Fixing bugs');
      expect(triggers.triggerPatterns).toContain('Refactoring code');
    });

    it('should handle Trigger Conditions sections', async () => {
      const skillDir = join(skillsDir, 'no-workarounds');
      await mkdir(skillDir, { recursive: true });

      await writeFile(join(skillDir, 'SKILL.md'), `---
name: no-workarounds
description: Prevents manual workarounds when building tools
---

# No Workarounds

## Trigger Conditions

- Building tools
- CLI features
- Automation
`);

      const { extractSkillTriggers } = await import('./evaluate.js');
      const triggers = await extractSkillTriggers(join(skillDir, 'SKILL.md'));

      expect(triggers.skillName).toBe('no-workarounds');
      expect(triggers.triggerPatterns).toContain('Building tools');
      expect(triggers.triggerPatterns).toContain('CLI features');
    });
  });

  describe('discoverInstalledSkills', () => {
    it('should discover all skills in directory', async () => {
      // Create multiple skills
      const skill1 = join(skillsDir, 'skill-1');
      const skill2 = join(skillsDir, 'skill-2');
      await mkdir(skill1, { recursive: true });
      await mkdir(skill2, { recursive: true });

      await writeFile(join(skill1, 'SKILL.md'), `---
name: skill-1
description: First skill
---

# Skill 1

## When to Use
- Scenario A
`);

      await writeFile(join(skill2, 'SKILL.md'), `---
name: skill-2
description: Second skill
---

# Skill 2

## When to Use
- Scenario B
`);

      const { discoverInstalledSkills } = await import('./evaluate.js');
      const skills = await discoverInstalledSkills(skillsDir);

      expect(skills).toHaveLength(2);
      expect(skills.map(s => s.skillName)).toContain('skill-1');
      expect(skills.map(s => s.skillName)).toContain('skill-2');
    });

    it('should skip non-skill directories', async () => {
      const validSkill = join(skillsDir, 'valid');
      const invalidDir = join(skillsDir, 'not-a-skill');
      await mkdir(validSkill, { recursive: true });
      await mkdir(invalidDir, { recursive: true });

      await writeFile(join(validSkill, 'SKILL.md'), `---
name: valid
description: Valid skill
---

# Valid Skill
`);

      // invalidDir has no SKILL.md

      const { discoverInstalledSkills } = await import('./evaluate.js');
      const skills = await discoverInstalledSkills(skillsDir);

      expect(skills).toHaveLength(1);
      expect(skills[0].skillName).toBe('valid');
    });
  });

  describe('generateEvaluationPrompt', () => {
    it('should generate evaluation prompt with all skills', async () => {
      const skill1 = join(skillsDir, 'tdd');
      const skill2 = join(skillsDir, 'no-workarounds');
      await mkdir(skill1, { recursive: true });
      await mkdir(skill2, { recursive: true });

      await writeFile(join(skill1, 'SKILL.md'), `---
name: tdd
description: Test-Driven Development
---

# TDD

## When to Use
- Implementing features
- Fixing bugs
`);

      await writeFile(join(skill2, 'SKILL.md'), `---
name: no-workarounds
description: No manual workarounds
---

# No Workarounds

## When to Use
- Building tools
- CLI features
`);

      const { generateEvaluationPrompt } = await import('./evaluate.js');
      const prompt = await generateEvaluationPrompt(skillsDir);

      // Should include section header
      expect(prompt).toContain('MANDATORY SKILL ACTIVATION');

      // Should include both skills
      expect(prompt).toContain('tdd');
      expect(prompt).toContain('no-workarounds');

      // Should include trigger patterns
      expect(prompt).toContain('Implementing features');
      expect(prompt).toContain('Building tools');
    });

    it('should format skills in readable format', async () => {
      const skill = join(skillsDir, 'test-skill');
      await mkdir(skill, { recursive: true });

      await writeFile(join(skill, 'SKILL.md'), `---
name: test-skill
description: A test skill for unit testing
---

# Test Skill

## When to Use
- Running unit tests
- Writing test cases
`);

      const { generateEvaluationPrompt } = await import('./evaluate.js');
      const prompt = await generateEvaluationPrompt(skillsDir);

      // Should have skill with trigger description
      expect(prompt).toMatch(/test-skill.*Trigger/i);
    });
  });

  describe('evaluateCommand', () => {
    it('should output evaluation prompt to stdout', async () => {
      const skill = join(skillsDir, 'sample');
      await mkdir(skill, { recursive: true });

      await writeFile(join(skill, 'SKILL.md'), `---
name: sample
description: Sample skill
---

# Sample

## When to Use
- Example trigger
`);

      // Capture console output
      const originalLog = console.log;
      let output = '';
      console.log = (msg: string) => { output += msg + '\n'; };

      const { evaluateCommand } = await import('./evaluate.js');
      await evaluateCommand({ cwd: targetDir });

      console.log = originalLog;

      expect(output).toContain('sample');
      expect(output).toContain('SKILL ACTIVATION');
    });

    it('should return JSON format when requested', async () => {
      const skill = join(skillsDir, 'json-test');
      await mkdir(skill, { recursive: true });

      await writeFile(join(skill, 'SKILL.md'), `---
name: json-test
description: JSON test skill
---

# JSON Test

## When to Use
- Testing JSON output
`);

      const { evaluateCommand } = await import('./evaluate.js');
      const result = await evaluateCommand({ cwd: targetDir, json: true });

      expect(result).toBeDefined();
      expect(Array.isArray(result?.skills)).toBe(true);
      expect(result?.skills[0].skillName).toBe('json-test');
    });
  });
});
