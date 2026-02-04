#!/bin/bash
# Sync bundled skills from root skills/ to packages/skills/skills/
# Run before npm publish to ensure latest skills are included

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PKG_DIR")")"
SRC_SKILLS="$ROOT_DIR/skills"
DEST_SKILLS="$PKG_DIR/skills"

# List of skills to bundle with the package
# Add skills here that should be shipped with @4meta5/skills
BUNDLED_SKILLS=(
  "code-review"
  "code-review-js"
  "code-review-rust"
  "code-review-ts"
  "describe-codebase"
  "dogfood-skills"
  "engram-generate"
  "engram-recall"
  "no-workarounds"
  "pr-description"
  "refactor-suggestions"
  "security-analysis"
  "suggest-tests"
  "tdd"
  "unit-test-workflow"
)

echo "Syncing bundled skills from $SRC_SKILLS to $DEST_SKILLS"

# Create destination if needed
mkdir -p "$DEST_SKILLS"

# Clean destination
rm -rf "$DEST_SKILLS"/*

# Copy each bundled skill
for skill in "${BUNDLED_SKILLS[@]}"; do
  if [ -d "$SRC_SKILLS/$skill" ]; then
    echo "  Copying $skill"
    cp -r "$SRC_SKILLS/$skill" "$DEST_SKILLS/"
  else
    echo "  WARNING: $skill not found in $SRC_SKILLS"
  fi
done

echo "Done. Synced ${#BUNDLED_SKILLS[@]} skills."
