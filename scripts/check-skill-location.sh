#!/usr/bin/env bash
# Enforce skills are placed at repo root level, not in packages/ or elsewhere
#
# Skills live at repo root: <skill-name>/SKILL.md
# .claude/skills is a symlink to .. for Claude Code compatibility.
#
# This prevents the mistake of adding skills to packages/skills/skills/
# or other nested locations.

set -euo pipefail

# Get staged files that contain SKILL.md (only ADDED files, not deletions)
staged_skills=$(git diff --cached --name-only --diff-filter=A | grep "SKILL.md" || true)

if [ -z "$staged_skills" ]; then
  # No SKILL.md files staged, nothing to check
  exit 0
fi

# Directories that are NOT skill directories
non_skill_dirs="packages|node_modules|docs|hooks|scripts|\.claude|\.git"

# Check each staged SKILL.md
errors=0
while IFS= read -r file; do
  # Skills should be at root level: <skill-name>/SKILL.md or <skill-name>/subdir/SKILL.md
  # But NOT in packages/, node_modules/, docs/, hooks/, scripts/, .claude/, .git/
  if [[ "$file" =~ ^($non_skill_dirs)/ ]]; then
    echo "❌ ERROR: Skill in wrong location: $file"
    echo "   Skills MUST go at repo root level, not in packages/ or system directories."
    skill_name=$(echo "$file" | cut -d'/' -f2)
    echo "   Correct path: $skill_name/SKILL.md"
    errors=$((errors + 1))
  fi
done <<< "$staged_skills"

if [ $errors -gt 0 ]; then
  echo ""
  echo "🚫 BLOCKED: $errors skill(s) in wrong location."
  echo "   Move them to <skill-name>/SKILL.md at repo root"
  exit 1
fi

exit 0
