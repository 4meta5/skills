#!/bin/bash
#
# Feedback Loop Shell Hook
#
# Validates Claude's responses against required skill calls.
# Reads response from stdin, validates, and outputs retry prompt to stdout if non-compliant.
#
# Environment variables:
#   REQUIRED_SKILLS - Comma-separated list of required skill names (REQUIRED)
#   SUGGESTED_SKILLS - Comma-separated list of suggested skill names (optional)
#   MAX_RETRIES - Maximum retry attempts (default: 3)
#   ATTEMPT_NUMBER - Current attempt number (default: 1)
#
# Exit codes:
#   0 - Response is compliant (all required skills were called)
#   1 - Response is non-compliant, retry prompt written to stdout
#   2 - Error (invalid input, missing REQUIRED_SKILLS)
#
# Usage:
#   echo "I will use Skill(\"tdd\") now." | REQUIRED_SKILLS="tdd" ./feedback-loop.sh
#   cat response.txt | REQUIRED_SKILLS="tdd,no-workarounds" ./feedback-loop.sh
#

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find the CLI root directory (go up from src/hooks to package root)
CLI_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Read response from stdin
response=$(cat)

# Check if REQUIRED_SKILLS is set
if [ -z "${REQUIRED_SKILLS+x}" ]; then
  echo "Error: REQUIRED_SKILLS environment variable is required" >&2
  exit 2
fi

# Run the Node.js script
# The script is in dist/src/hooks/feedback-loop-cli.js after build
# For development, use tsx to run TypeScript directly
if [ -f "$CLI_ROOT/dist/src/hooks/feedback-loop-cli.js" ]; then
  # Use compiled JavaScript
  echo "$response" | node "$CLI_ROOT/dist/src/hooks/feedback-loop-cli.js"
else
  # Use TypeScript with tsx for development
  echo "$response" | npx tsx "$SCRIPT_DIR/feedback-loop-cli.ts"
fi
