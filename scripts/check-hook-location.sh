#!/usr/bin/env bash
# Enforce shell scripts are in allowed directories only
#
# Allowed locations:
#   - hooks/     (Claude Code hooks, canonical location)
#   - scripts/   (Build/CI scripts)
#   - packages/  (Package-specific scripts)
#
# This prevents scripts from being added to .claude/hooks/ directly
# or other non-standard locations.

set -euo pipefail

# Get staged .sh files (only ADDED files, not deletions)
staged_scripts=$(git diff --cached --name-only --diff-filter=A | grep -E '\.sh$' || true)

if [ -z "$staged_scripts" ]; then
  exit 0
fi

errors=0
while IFS= read -r file; do
  # Allow only hooks/, scripts/, or packages/
  if [[ "$file" =~ ^hooks/ ]] || [[ "$file" =~ ^scripts/ ]] || [[ "$file" =~ ^packages/ ]]; then
    continue
  fi

  # Allow skill scripts (single directory depth with scripts/ subdir)
  # Pattern: <skill-name>/scripts/<script>.sh (skills at repo root)
  if [[ "$file" =~ ^[^/]+/scripts/[^/]+\.sh$ ]]; then
    continue
  fi

  # Special message for .claude/hooks/ mistake
  if [[ "$file" =~ ^\.claude/hooks/ ]]; then
    echo "❌ ERROR: Hook in wrong location: $file"
    echo "   Hooks MUST go in hooks/, not .claude/hooks/"
    echo "   .claude/hooks/ is a symlink to hooks/"
    echo "   Correct path: hooks/$(basename "$file")"
  else
    echo "❌ ERROR: Script in non-standard location: $file"
    echo "   Shell scripts must be in one of:"
    echo "     - hooks/     (Claude Code hooks)"
    echo "     - scripts/   (Build/CI scripts)"
    echo "     - packages/  (Package scripts)"
  fi
  errors=$((errors + 1))
done <<< "$staged_scripts"

if [ $errors -gt 0 ]; then
  echo ""
  echo "🚫 BLOCKED: $errors script(s) in non-standard location."
  exit 1
fi

exit 0
