#!/usr/bin/env bash
# Prevent accidental commits to .claude/settings.local.json

set -euo pipefail

file=".claude/settings.local.json"

if ! git diff --cached --name-only | grep -q "^${file}$"; then
  exit 0
fi

echo ""
echo "⚠️  ${file} is staged."
printf "Did you intend to commit these changes? [y/N] "
read -r answer </dev/tty

case "$answer" in
  [yY]|[yY][eE][sS])
    echo "✅ Allowing changes."
    exit 0
    ;;
  *)
    git restore --staged "${file}"
    git checkout "${file}"
    echo "✅ Restored. Continuing..."
    exit 0
    ;;
esac
