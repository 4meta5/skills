#!/bin/bash
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
for dir in \
  "${HOME}/.npm-global/lib/node_modules/@anthropic/skills-cli/data" \
  "${HOME}/.local/lib/node_modules/@anthropic/skills-cli/data" \
  "$(npm root -g 2>/dev/null)/@anthropic/skills-cli/data" \
  "$(dirname "$(which skills 2>/dev/null)")/../lib/node_modules/@anthropic/skills-cli/data" \
  "${CLAUDE_PROJECT_DIR}/node_modules/@anthropic/skills-cli/data" \
  "${CLAUDE_PROJECT_DIR}/.skills/data"
do
  if [ -f "${dir}/vector_store.json" ]; then
    VECTOR_STORE="${dir}/vector_store.json"
    break
  fi
done

# If no vector store found, try the development location
if [ -z "$VECTOR_STORE" ] && [ -f "${CLAUDE_PROJECT_DIR}/packages/skills-cli/data/vector_store.json" ]; then
  VECTOR_STORE="${CLAUDE_PROJECT_DIR}/packages/skills-cli/data/vector_store.json"
fi

# If still no vector store, skip routing silently
if [ -z "$VECTOR_STORE" ] || [ ! -f "$VECTOR_STORE" ]; then
  exit 0
fi

# Export for the activate script
export SKILLS_VECTOR_STORE="$VECTOR_STORE"

# Find the activate script
ACTIVATE_SCRIPT=""
for script_dir in \
  "${CLAUDE_PROJECT_DIR}/packages/skills-cli/src/router" \
  "${CLAUDE_PROJECT_DIR}/node_modules/@anthropic/skills-cli/dist/src/router" \
  "$(npm root -g 2>/dev/null)/@anthropic/skills-cli/dist/src/router" \
  "${HOME}/.npm-global/lib/node_modules/@anthropic/skills-cli/dist/src/router"
do
  if [ -f "${script_dir}/activate.js" ]; then
    ACTIVATE_SCRIPT="${script_dir}/activate.js"
    break
  elif [ -f "${script_dir}/activate.ts" ]; then
    ACTIVATE_SCRIPT="${script_dir}/activate.ts"
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
