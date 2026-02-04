#!/usr/bin/env bash
# Prevent accidental commits to .claude/settings.local.json
# Allow override by setting ALLOW_CLAUDE_SETTINGS=1

set -euo pipefail

file=".claude/settings.local.json"

if ! git diff --cached --name-only | grep -q "^${file}$"; then
  exit 0
fi

if [ "${ALLOW_CLAUDE_SETTINGS:-}" = "1" ]; then
  echo "⚠️  ALLOW_CLAUDE_SETTINGS=1 set; allowing ${file} changes."
  exit 0
fi

echo "❌ BLOCKED: ${file} is staged."
echo "This file frequently accumulates bloaty allowlist entries."
echo ""
echo "If you intentionally need to change it, re-run with:"
echo "  ALLOW_CLAUDE_SETTINGS=1 git commit -m \"...\""
echo ""
echo "Otherwise, unstage it:"
echo "  git restore --staged ${file}"
exit 1
