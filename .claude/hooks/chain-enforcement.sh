#!/bin/bash
# Chain Enforcement Hook - PreToolUse
# Enforces skill chain ordering via the chain system
#
# This hook checks if tools are allowed based on the active profile
# and outputs skill guidance even when tools are allowed.

# Read the input JSON (contains tool info)
INPUT=$(cat)

# Path to chain CLI
CHAIN_CLI="${CLAUDE_PROJECT_DIR}/packages/chain/bin/chain.js"

# If chain CLI not found, allow all tools
if [ ! -f "$CHAIN_CLI" ]; then
  exit 0
fi

# Check if a session is active
SESSION_FILE="${CLAUDE_PROJECT_DIR}/.claude/chain_state/current_session"
if [ ! -f "$SESSION_FILE" ]; then
  # No active chain session, allow all tools
  exit 0
fi

# Extract tool name and input from the hook input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // .tool // ""')
TOOL_INPUT=$(echo "$INPUT" | jq -c '.tool_input // .input // {}')

# Build tool JSON for the chain CLI
TOOL_JSON=$(jq -n --arg tool "$TOOL_NAME" --argjson input "$TOOL_INPUT" '{tool: $tool, input: $input}')

# Run the chain hook and capture output
OUTPUT=$(node "$CHAIN_CLI" hook-pre-tool-use \
  --tool "$TOOL_JSON" \
  --cwd "$CLAUDE_PROJECT_DIR" \
  --skills "${CLAUDE_PROJECT_DIR}/packages/chain/chains/skills.yaml" \
  --profiles "${CLAUDE_PROJECT_DIR}/packages/chain/chains/profiles.yaml" \
  2>&1)
EXIT_CODE=$?

# Output any messages from the chain system
if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT"
fi

# Exit with the chain CLI's exit code
# 0 = allowed, 1 = blocked
exit $EXIT_CODE
