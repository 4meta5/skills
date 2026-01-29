import { mkdir, writeFile, readdir, stat, chmod, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trackProjectInstallation, untrackProjectInstallation } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface HookOptions {
  cwd?: string;
}

/**
 * Get the path to bundled hooks directory
 * From dist/src/commands/hook.js -> ../../../hooks
 */
function getBundledHooksDir(): string {
  return join(__dirname, '..', '..', '..', 'hooks');
}

/**
 * Get the target hooks directory for a project
 */
function getProjectHooksDir(cwd: string): string {
  return join(cwd, '.claude', 'hooks');
}

/**
 * Bundled hooks with their content
 * These are embedded directly to avoid file path issues
 */
const BUNDLED_HOOKS: Record<string, { filename: string; content: string }> = {
  'usage-tracker': {
    filename: 'usage-tracker.sh',
    content: `#!/bin/bash
# Usage Tracker Hook - Tracks skill activation metrics
# Captures: session events, skill availability, skill activation, skill ignores
# Data stored in ~/.claude/usage.jsonl for analysis with 'skills stats'

# Read the input JSON (contains the user's prompt and session info)
INPUT=$(cat)

# Extract session ID and prompt
SESSION_ID="\${CLAUDE_SESSION_ID:-unknown}"
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || echo "")

# Ensure storage directory exists
STORAGE_DIR="\${HOME}/.claude"
STORAGE_FILE="\${STORAGE_DIR}/usage.jsonl"
mkdir -p "$STORAGE_DIR"

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Track prompt submission event
EVENT=$(jq -n \\
  --arg type "prompt_submitted" \\
  --arg timestamp "$TIMESTAMP" \\
  --arg sessionId "$SESSION_ID" \\
  --arg prompt "\${PROMPT:0:200}" \\
  '{type: $type, timestamp: $timestamp, sessionId: $sessionId, data: {prompt: $prompt}}')

echo "$EVENT" >> "$STORAGE_FILE"

# Track session start if this is a new session
# (Check if we've seen this session before in last 100 events)
SESSION_SEEN=$(tail -100 "$STORAGE_FILE" 2>/dev/null | grep -c "\\"sessionId\\":\\"$SESSION_ID\\"" || echo "0")
if [ "$SESSION_SEEN" -eq "0" ]; then
  SESSION_EVENT=$(jq -n \\
    --arg type "session_start" \\
    --arg timestamp "$TIMESTAMP" \\
    --arg sessionId "$SESSION_ID" \\
    '{type: $type, timestamp: $timestamp, sessionId: $sessionId, data: {}}')
  echo "$SESSION_EVENT" >> "$STORAGE_FILE"
fi

# Check for manual skill invocations in prompt (e.g., "/tdd", "Skill(tdd)")
if echo "$PROMPT" | grep -qiE '(/[a-z][-a-z]+|Skill\\s*\\([^)]+\\))'; then
  # Extract skill name
  SKILL_NAME=$(echo "$PROMPT" | grep -oiE '(/[a-z][-a-z]+|Skill\\s*\\(([^)]+)\\))' | head -1 | sed 's|^/||; s|Skill(||; s|)||; s|"||g; s| ||g')
  if [ -n "$SKILL_NAME" ]; then
    MANUAL_EVENT=$(jq -n \\
      --arg type "skill_activated" \\
      --arg timestamp "$TIMESTAMP" \\
      --arg sessionId "$SESSION_ID" \\
      --arg skillName "$SKILL_NAME" \\
      --arg source "manual" \\
      '{type: $type, timestamp: $timestamp, sessionId: $sessionId, data: {skillName: $skillName, source: $source}}')
    echo "$MANUAL_EVENT" >> "$STORAGE_FILE"
  fi
fi

# Exit successfully (don't block the prompt)
exit 0
`
  },
  'skill-forced-eval': {
    filename: 'skill-forced-eval.sh',
    content: `#!/bin/bash
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

\`\`\`
SKILL EVALUATION (Step 1):
- tdd: YES - fixing a bug in the CLI
- no-workarounds: YES - fixing CLI tool code
- dogfood-skills: NO - not completing a feature yet

ACTIVATING SKILLS (Step 2):
[Calls Skill("tdd")]
[Calls Skill("no-workarounds")]

IMPLEMENTING (Step 3):
[Now proceeds with implementation following both activated skills]
\`\`\`

## BLOCKING CONDITIONS - NO EXCEPTIONS

- If tdd = YES: You are BLOCKED until Phase 1 (RED) is complete - failing test required
- If no-workarounds = YES: You are BLOCKED from manual workarounds
- Skills CHAIN: If both tdd AND no-workarounds are YES, follow BOTH

## NO EXCEPTIONS

These rationalizations are REJECTED:
- "It's a simple change" → BLOCKED. Write the test.
- "Just this once" → BLOCKED. That's what you said last time.
- "I'll add tests after" → BLOCKED. Tests after = not TDD.
- "It's faster to do it manually" → BLOCKED. Fix the tool.
- "The tool is mostly working" → BLOCKED. Mostly = broken.
- "One-time migration" → BLOCKED. Build the feature.

If you are unsure whether a skill applies, ASK THE USER:
"Should I skip the [skill-name] skill for this task?"

Only proceed without activation if user EXPLICITLY says yes.

This activation sequence is MANDATORY. Skipping Step 2 violates project policy.

ACTIVATION_CONTEXT

exit 0
`
  },
  'semantic-router': {
    filename: 'semantic-router.sh',
    content: `#!/bin/bash
# Semantic Router Hook - Deterministic Skill Activation
# Uses local embeddings to match user prompts to relevant skills
# Based on "Iris" architecture from NEW_RESEARCH.md
#
# Thresholds:
#   > 0.85: IMMEDIATE ACTIVATION (force skill use)
#   0.70-0.85: SUGGESTION MODE (recommend skills)
#   < 0.70: CHAT MODE (no activation)
#
# Environment variables:
#   SKILLS_VECTOR_STORE - Path to vector_store.json (default: auto-detect)
#   SKILLS_IMMEDIATE_THRESHOLD - Threshold for immediate activation (default: 0.85)
#   SKILLS_SUGGESTION_THRESHOLD - Threshold for suggestions (default: 0.70)

# Read the input JSON (contains the user's prompt)
INPUT=$(cat)

# Find the skills-cli installation directory
# Look for vector store in common locations
VECTOR_STORE=""
for dir in \\
  "\${HOME}/.npm-global/lib/node_modules/@anthropic/skills-cli/data" \\
  "\${HOME}/.local/lib/node_modules/@anthropic/skills-cli/data" \\
  "$(npm root -g 2>/dev/null)/@anthropic/skills-cli/data" \\
  "$(dirname "$(which skills 2>/dev/null)")/../lib/node_modules/@anthropic/skills-cli/data" \\
  "\${CLAUDE_PROJECT_DIR}/node_modules/@anthropic/skills-cli/data" \\
  "\${CLAUDE_PROJECT_DIR}/.skills/data"
do
  if [ -f "\${dir}/vector_store.json" ]; then
    VECTOR_STORE="\${dir}/vector_store.json"
    break
  fi
done

# If no vector store found, try the development location
if [ -z "$VECTOR_STORE" ] && [ -f "\${CLAUDE_PROJECT_DIR}/packages/skills-cli/data/vector_store.json" ]; then
  VECTOR_STORE="\${CLAUDE_PROJECT_DIR}/packages/skills-cli/data/vector_store.json"
fi

# If still no vector store, skip routing silently
if [ -z "$VECTOR_STORE" ] || [ ! -f "$VECTOR_STORE" ]; then
  exit 0
fi

# Export for the activate script
export SKILLS_VECTOR_STORE="$VECTOR_STORE"

# Find the activate script
ACTIVATE_SCRIPT=""
for script_dir in \\
  "\${CLAUDE_PROJECT_DIR}/packages/skills-cli/src/router" \\
  "\${CLAUDE_PROJECT_DIR}/node_modules/@anthropic/skills-cli/dist/src/router" \\
  "$(npm root -g 2>/dev/null)/@anthropic/skills-cli/dist/src/router" \\
  "\${HOME}/.npm-global/lib/node_modules/@anthropic/skills-cli/dist/src/router"
do
  if [ -f "\${script_dir}/activate.js" ]; then
    ACTIVATE_SCRIPT="\${script_dir}/activate.js"
    break
  elif [ -f "\${script_dir}/activate.ts" ]; then
    ACTIVATE_SCRIPT="\${script_dir}/activate.ts"
    break
  fi
done

# If no activate script found, skip routing silently
if [ -z "$ACTIVATE_SCRIPT" ]; then
  exit 0
fi

# Run the semantic router activation script
if [[ "$ACTIVATE_SCRIPT" == *.ts ]]; then
  echo "$INPUT" | npx tsx "$ACTIVATE_SCRIPT" 2>/dev/null
else
  echo "$INPUT" | node "$ACTIVATE_SCRIPT" 2>/dev/null
fi

# Always exit successfully to not block the prompt
exit 0
`
  }
};

/**
 * List available bundled hooks
 */
function listBundledHooks(): string[] {
  return Object.keys(BUNDLED_HOOKS);
}

/**
 * Get a bundled hook by name
 */
function getBundledHook(name: string): { filename: string; content: string } | undefined {
  return BUNDLED_HOOKS[name];
}

/**
 * Hook command handler
 */
export async function hookCommand(
  subcommand: 'add' | 'list' | 'remove' | 'available',
  args: string[],
  options: HookOptions = {}
): Promise<void> {
  const projectDir = options.cwd || process.cwd();

  switch (subcommand) {
    case 'add':
      await addHooks(args, projectDir);
      break;
    case 'list':
      await listHooks(projectDir);
      break;
    case 'remove':
      await removeHooks(args, projectDir);
      break;
    case 'available':
      listAvailableHooks();
      break;
    default:
      console.log('Usage: skills hook <add|list|remove|available> [names...]');
  }
}

/**
 * Add hooks to project
 */
async function addHooks(names: string[], projectDir: string): Promise<void> {
  if (names.length === 0) {
    console.log('Usage: skills hook add <hook-names...>');
    console.log('Available hooks:');
    listBundledHooks().forEach(name => console.log(`  - ${name}`));
    return;
  }

  const hooksDir = getProjectHooksDir(projectDir);
  await mkdir(hooksDir, { recursive: true });

  let installed = 0;

  for (const name of names) {
    const hook = getBundledHook(name);
    if (!hook) {
      console.error(`x ${name} - not found`);
      continue;
    }

    const hookPath = join(hooksDir, hook.filename);
    await writeFile(hookPath, hook.content, 'utf-8');
    await chmod(hookPath, 0o755); // Make executable

    // Track hook installation in project
    await trackProjectInstallation(projectDir, name, 'hook');

    console.log(`+ ${name} -> .claude/hooks/${hook.filename}`);
    installed++;
  }

  if (installed > 0) {
    console.log(`\nInstalled ${installed} hook(s) to .claude/hooks`);

    // Auto-configure settings.local.json
    await configureHooksInSettings(names, projectDir);
  }
}

/**
 * Configure hooks in settings.local.json
 */
async function configureHooksInSettings(hookNames: string[], projectDir: string): Promise<void> {
  const settingsPath = join(projectDir, '.claude', 'settings.local.json');

  let settings: Record<string, unknown> = {};

  // Try to read existing settings
  try {
    const content = await readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist or is invalid, start fresh
  }

  // Ensure hooks structure exists
  if (!settings.hooks) {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown>;

  if (!hooks.UserPromptSubmit) {
    hooks.UserPromptSubmit = [];
  }
  const userPromptSubmitHooks = hooks.UserPromptSubmit as Array<{ hooks: Array<{ type: string; command: string }> }>;

  // Add each hook if not already present
  for (const hookName of hookNames) {
    const hook = getBundledHook(hookName);
    if (!hook) continue;

    const hookCommand = `"$CLAUDE_PROJECT_DIR"/.claude/hooks/${hook.filename}`;

    // Check if this hook is already configured
    const alreadyConfigured = userPromptSubmitHooks.some(entry =>
      entry.hooks?.some(h => h.command === hookCommand)
    );

    if (!alreadyConfigured) {
      userPromptSubmitHooks.push({
        hooks: [
          {
            type: 'command',
            command: hookCommand
          }
        ]
      });
      console.log(`Configured ${hookName} in settings.local.json`);
    } else {
      console.log(`${hookName} already configured in settings.local.json`);
    }
  }

  // Write updated settings
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

/**
 * List installed hooks in project
 */
async function listHooks(projectDir: string): Promise<void> {
  const hooksDir = getProjectHooksDir(projectDir);

  try {
    const files = await readdir(hooksDir);
    if (files.length === 0) {
      console.log('No hooks installed.');
      return;
    }

    console.log('Installed hooks:');
    for (const file of files) {
      const filePath = join(hooksDir, file);
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        const executable = (fileStat.mode & 0o111) !== 0;
        console.log(`  - ${file}${executable ? ' (executable)' : ''}`);
      }
    }
  } catch {
    console.log('No hooks directory found.');
  }
}

/**
 * Remove hooks from project
 */
async function removeHooks(names: string[], projectDir: string): Promise<void> {
  const hooksDir = getProjectHooksDir(projectDir);

  if (names.length === 0) {
    console.log('Usage: skills hook remove <hook-names...>');
    return;
  }

  const { unlink } = await import('fs/promises');

  for (const name of names) {
    const hook = getBundledHook(name);
    const filename = hook?.filename || `${name}.sh`;
    const hookPath = join(hooksDir, filename);

    try {
      await unlink(hookPath);

      // Untrack hook from project
      await untrackProjectInstallation(projectDir, name, 'hook');

      console.log(`- ${name}`);
    } catch {
      console.error(`x ${name} - not found`);
    }
  }
}

/**
 * List available bundled hooks
 */
function listAvailableHooks(): void {
  console.log('Available hooks:');
  for (const name of listBundledHooks()) {
    const hook = getBundledHook(name);
    console.log(`  - ${name} (${hook?.filename})`);
  }
}
