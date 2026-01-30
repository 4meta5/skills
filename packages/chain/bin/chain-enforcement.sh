#!/bin/bash
#
# Chain Enforcement Hook Script
#
# This script is called by Claude Code hooks to enforce workflow chains.
# It handles PreToolUse and Stop events.
#
# Usage:
#   PreToolUse: chain-enforcement.sh pre-tool-use <tool_json>
#   Stop:       chain-enforcement.sh stop
#
# Environment:
#   CHAIN_CWD - Working directory (defaults to current directory)
#   CHAIN_SKILLS_PATH - Path to skills.yaml (optional)
#   CHAIN_PROFILES_PATH - Path to profiles.yaml (optional)
#
# Exit codes:
#   0 - Allow (tool/stop permitted)
#   1 - Block (tool/stop denied, message in stderr)
#

set -e

# Find the chain CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAIN_CLI="${SCRIPT_DIR}/chain.js"

# Default to current directory
CWD="${CHAIN_CWD:-$(pwd)}"

# Function to run chain command
run_chain() {
  node "$CHAIN_CLI" "$@"
}

# Handle PreToolUse event
handle_pre_tool_use() {
  local tool_json="$1"

  if [[ -z "$tool_json" ]]; then
    echo "Error: Missing tool JSON argument" >&2
    exit 1
  fi

  # Parse tool name and input from JSON
  local tool_name=$(echo "$tool_json" | jq -r '.tool // empty')

  if [[ -z "$tool_name" ]]; then
    # No tool specified, allow by default
    exit 0
  fi

  # Check with chain CLI
  # The chain CLI handles the actual enforcement logic
  local result
  local exit_code

  result=$(run_chain hook pre-tool-use --tool "$tool_json" --cwd "$CWD" 2>&1) || exit_code=$?

  if [[ ${exit_code:-0} -eq 0 ]]; then
    # Allowed
    if [[ -n "$result" ]]; then
      echo "$result"
    fi
    exit 0
  else
    # Blocked
    echo "$result" >&2
    exit 1
  fi
}

# Handle Stop event
handle_stop() {
  # Check with chain CLI
  local result
  local exit_code

  result=$(run_chain hook stop --cwd "$CWD" 2>&1) || exit_code=$?

  if [[ ${exit_code:-0} -eq 0 ]]; then
    # Allowed
    if [[ -n "$result" ]]; then
      echo "$result"
    fi
    exit 0
  else
    # Blocked
    echo "$result" >&2
    exit 1
  fi
}

# Main entry point
main() {
  local event="$1"
  shift || true

  case "$event" in
    pre-tool-use)
      handle_pre_tool_use "$@"
      ;;
    stop)
      handle_stop "$@"
      ;;
    *)
      echo "Usage: chain-enforcement.sh <pre-tool-use|stop> [args...]" >&2
      exit 1
      ;;
  esac
}

main "$@"
