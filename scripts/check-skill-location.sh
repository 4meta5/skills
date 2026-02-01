#!/usr/bin/env bash
# Enforce skills are placed in skills/ (root level), not elsewhere
#
# Skills live at root skills/ for visibility.
# .claude/skills is a symlink to ../skills for Claude Code compatibility.
#
# This prevents the mistake of adding skills to packages/skills/skills/
# which is a different directory structure.

set -euo pipefail

# Get staged files that contain SKILL.md
staged_skills=$(git diff --cached --name-only | grep "SKILL.md" || true)

if [ -z "$staged_skills" ]; then
  # No SKILL.md files staged, nothing to check
  exit 0
fi

# Check each staged SKILL.md
errors=0
while IFS= read -r file; do
  # Allow skills/ at root (primary location) or .claude/skills (symlink)
  if [[ ! "$file" =~ ^skills/ ]] && [[ ! "$file" =~ ^\.claude/skills/ ]]; then
    echo "❌ ERROR: Skill in wrong location: $file"
    echo "   Skills MUST go in skills/, not elsewhere."
    echo "   Correct path: skills/$(basename $(dirname $file))/SKILL.md"
    errors=$((errors + 1))
  fi
done <<< "$staged_skills"

if [ $errors -gt 0 ]; then
  echo ""
  echo "🚫 BLOCKED: $errors skill(s) in wrong location."
  echo "   Move them to skills/<skill-name>/SKILL.md"
  exit 1
fi

echo "✅ All skills in correct location (skills/)"
exit 0
