#!/bin/bash
# Skill Forced Evaluation Hook - SOTA 3-Step Activation
# Forces Claude to ACTIVATE skills via Skill() tool, not just evaluate them
# Achieves ~84% skill activation vs ~20% baseline (per Scott Spence's research)

# This hook intercepts UserPromptSubmit and forces actual skill activation

# Read the input JSON (contains the user's prompt)
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

cat << 'ACTIVATION_CONTEXT'

## MANDATORY SKILL ACTIVATION SEQUENCE

### Step 1 - EVALUATE (do this in your response):
For each installed skill, state: [skill-name] - YES/NO - [reason]

Installed skills to evaluate:
- tdd: Trigger = implementing features, fixing bugs, refactoring code (RED→GREEN→REFACTOR)
- no-workarounds: Trigger = building tools, CLI features, automation
- dogfood-skills: Trigger = completing features in skills-cli

### Step 2 - ACTIVATE (do this immediately after Step 1):
IF any skills are YES → Use Skill(skill-name) tool for EACH relevant skill NOW
IF no skills are YES → State "No skills activated" and proceed

### Step 3 - IMPLEMENT:
Only after Step 2 is complete, proceed with implementation.

## CRITICAL REQUIREMENTS

1. You MUST call Skill() tool in Step 2 for every YES skill
2. The evaluation (Step 1) is WORTHLESS unless you ACTIVATE (Step 2) the skills
3. Do NOT skip to implementation without completing Step 2

## Example of Correct Sequence:

```
SKILL EVALUATION (Step 1):
- tdd: YES - fixing a bug in the CLI
- no-workarounds: YES - fixing CLI tool code
- dogfood-skills: NO - not completing a feature yet

ACTIVATING SKILLS (Step 2):
[Calls Skill("tdd")]
[Calls Skill("no-workarounds")]

IMPLEMENTING (Step 3):
[Now proceeds with implementation following both activated skills]
```

## BLOCKING CONDITIONS

- If tdd = YES: You are BLOCKED until Phase 1 (RED) is complete - failing test required
- If no-workarounds = YES: You are BLOCKED from manual workarounds
- Skills CHAIN: If both tdd AND no-workarounds are YES, follow BOTH

This activation sequence is MANDATORY. Skipping Step 2 violates project policy.

ACTIVATION_CONTEXT

exit 0
