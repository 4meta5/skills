#!/usr/bin/env bash
# Validate skills using the hooks CLI validator.
# Usage: ./validate.sh [skill-name]
#
# Requires: ../skillex repo with packages/skills-cli/bin/skills.js
set -euo pipefail

SKILLS_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOKS_CLI="${SKILLS_DIR}/../skillex/packages/skills-cli/bin/skills.js"

if [ ! -f "$HOOKS_CLI" ]; then
  echo "Error: skills CLI not found at $HOOKS_CLI"
  echo "Ensure ../skillex repo exists with packages/skills-cli/bin/skills.js"
  exit 1
fi

if [ $# -eq 1 ]; then
  node "$HOOKS_CLI" validate --path "${SKILLS_DIR}/$1"
else
  errors=0
  for skill_dir in "${SKILLS_DIR}"/*/; do
    [ -f "${skill_dir}SKILL.md" ] || continue
    node "$HOOKS_CLI" validate --path "$skill_dir" || errors=$((errors + 1))
  done
  [ "$errors" -eq 0 ] && echo "" && echo "All skills valid." || { echo ""; echo "Failed: $errors"; exit 1; }
fi
