#!/usr/bin/env bash
# Enforce skills are placed in .claude/skills/, not elsewhere
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
  if [[ ! "$file" =~ ^\.claude/skills/ ]]; then
    echo "❌ ERROR: Skill in wrong location: $file"
    echo "   Skills MUST go in .claude/skills/, not elsewhere."
    echo "   Correct path: .claude/skills/$(basename $(dirname $file))/SKILL.md"
    errors=$((errors + 1))
  fi
done <<< "$staged_skills"

if [ $errors -gt 0 ]; then
  echo ""
  echo "🚫 BLOCKED: $errors skill(s) in wrong location."
  echo "   Move them to .claude/skills/<skill-name>/SKILL.md"
  exit 1
fi

echo "✅ All skills in correct location (.claude/skills/)"
exit 0
