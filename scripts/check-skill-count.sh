#!/usr/bin/env bash
set -euo pipefail

# Validate that README.md, CLAUDE.md, and disk all agree on skill count and names.
# Run from repo root: ./scripts/check-skill-count.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

errors=0

# 1. Skills on disk (directories containing SKILL.md, excluding hidden dirs)
disk_skills=$(find . -maxdepth 2 -name "SKILL.md" -not -path './.claude/*' -not -path './scripts/*' | sed 's|^./||;s|/SKILL.md$||' | sort)
disk_count=$(echo "$disk_skills" | wc -l | tr -d ' ')

# 2. README count (first line matching "N curated")
readme_count=$(grep -oE '[0-9]+ curated' README.md | grep -oE '[0-9]+')

# 3. README listed skills (table rows linking to ./skill-name/SKILL.md)
readme_skills=$(grep -oE '\[([a-z0-9-]+)\]\(\./[a-z0-9-]+/SKILL\.md\)' README.md | sed 's/\[//;s/\](.*)//' | sort)
readme_listed=$(echo "$readme_skills" | wc -l | tr -d ' ')

# 4. CLAUDE.md skills (from ## Skills section, lines starting with "- ")
claude_skills=$(awk '/^## Skills$/{found=1;next} /^## /{found=0} found && /^- /{print}' CLAUDE.md | sed 's/^- //' | sort)
claude_count=$(echo "$claude_skills" | wc -l | tr -d ' ')

# 5. CLAUDE.md installed skills
claude_installed=$(grep '@.claude/skills/' CLAUDE.md | sed 's|.*@.claude/skills/||;s|/SKILL.md||' | sort)
claude_installed_count=$(echo "$claude_installed" | wc -l | tr -d ' ')

echo "=== Skill Count Check ==="
echo "Disk:              $disk_count"
echo "README count:      $readme_count"
echo "README listed:     $readme_listed"
echo "CLAUDE.md skills:  $claude_count"
echo "CLAUDE.md installs: $claude_installed_count"
echo ""

# Check counts match
if [ "$disk_count" != "$readme_count" ]; then
  echo "FAIL: README says $readme_count but disk has $disk_count"
  errors=$((errors + 1))
fi

if [ "$disk_count" != "$readme_listed" ]; then
  echo "FAIL: README lists $readme_listed skills but disk has $disk_count"
  errors=$((errors + 1))
fi

if [ "$disk_count" != "$claude_count" ]; then
  echo "FAIL: CLAUDE.md lists $claude_count skills but disk has $disk_count"
  errors=$((errors + 1))
fi

if [ "$disk_count" != "$claude_installed_count" ]; then
  echo "FAIL: CLAUDE.md has $claude_installed_count installed refs but disk has $disk_count"
  errors=$((errors + 1))
fi

# Check for missing/extra skills by name
readme_missing=$(comm -23 <(echo "$disk_skills") <(echo "$readme_skills"))
if [ -n "$readme_missing" ]; then
  echo "FAIL: Missing from README table:"
  echo "$readme_missing" | sed 's/^/  - /'
  errors=$((errors + 1))
fi

readme_extra=$(comm -13 <(echo "$disk_skills") <(echo "$readme_skills"))
if [ -n "$readme_extra" ]; then
  echo "FAIL: In README but not on disk:"
  echo "$readme_extra" | sed 's/^/  - /'
  errors=$((errors + 1))
fi

claude_missing=$(comm -23 <(echo "$disk_skills") <(echo "$claude_skills"))
if [ -n "$claude_missing" ]; then
  echo "FAIL: Missing from CLAUDE.md Skills section:"
  echo "$claude_missing" | sed 's/^/  - /'
  errors=$((errors + 1))
fi

installed_missing=$(comm -23 <(echo "$disk_skills") <(echo "$claude_installed"))
if [ -n "$installed_missing" ]; then
  echo "FAIL: Missing from CLAUDE.md Installed Skills:"
  echo "$installed_missing" | sed 's/^/  - /'
  errors=$((errors + 1))
fi

if [ "$errors" -eq 0 ]; then
  echo "OK: All $disk_count skills consistent across disk, README, and CLAUDE.md"
  exit 0
else
  echo ""
  echo "FAILED: $errors issue(s) found"
  exit 1
fi
