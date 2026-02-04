#!/usr/bin/env bash
# Prevent accidental commits to .claude/settings.local.json
# Allow override by setting ALLOW_CLAUDE_SETTINGS=1 or answering 'y' to prompt

set -euo pipefail

file=".claude/settings.local.json"

if ! git diff --cached --name-only | grep -q "^${file}$"; then
  exit 0
fi

if [ "${ALLOW_CLAUDE_SETTINGS:-}" = "1" ]; then
  echo "⚠️  ALLOW_CLAUDE_SETTINGS=1 set; allowing ${file} changes."
  exit 0
fi

echo ""
echo "⚠️  ${file} is staged."
echo "This file frequently accumulates bloaty allowlist entries."
echo ""

# Check if running in interactive mode (stdin is a terminal)
if [ -t 0 ]; then
  printf "Did you intend to commit these changes? [y/N] "
  read -r answer </dev/tty

  case "$answer" in
    [yY]|[yY][eE][sS])
      echo "✅ Allowing ${file} changes."
      exit 0
      ;;
    *)
      echo "🔄 Restoring ${file}..."
      git restore --staged "${file}"
      git checkout "${file}"
      echo "✅ Restored. Continuing with commit..."
      exit 0
      ;;
  esac
else
  # Non-interactive mode (CI, piped input, etc.)
  echo "❌ BLOCKED: ${file} is staged."
  echo ""
  echo "If you intentionally need to change it, re-run with:"
  echo "  ALLOW_CLAUDE_SETTINGS=1 git commit -m \"...\""
  echo ""
  echo "Otherwise, unstage it:"
  echo "  git restore --staged ${file}"
  exit 1
fi
