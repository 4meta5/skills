#!/usr/bin/env bash
# prompt-append.sh — quick-add a prompt to wip/scratch.md
# Only asks for the prompt text. Metadata defaults can be filled in later.
set -euo pipefail

SKILLS_REPO="${SKILLS_REPO:-$HOME/agi/skills}"
SCRATCH="$SKILLS_REPO/wip/scratch.md"

if [[ ! -f "$SCRATCH" ]]; then
  echo "Scratchpad not found: $SCRATCH" >&2
  exit 1
fi

today=$(date +%Y-%m-%d)

# Prompt text is the only required input
printf 'Prompt: ' >&2
read -r pattern

if [[ -z "$pattern" ]]; then
  echo "Empty prompt. Nothing added." >&2
  exit 1
fi

# Optional short name; auto-generate from first 4 words if skipped
printf 'Short name (enter to auto-generate): ' >&2
read -r short_name

if [[ -z "$short_name" ]]; then
  short_name=$(echo "$pattern" | tr '[:upper:]' '[:lower:]' | tr -cs '[:alnum:]' '-' | cut -c1-40 | sed 's/-$//')
fi

# Append with sensible defaults
{
  echo ""
  echo "---"
  echo ""
  echo "### $today | $short_name"
  echo ""
  echo "**Pattern:** $pattern"
  echo ""
  echo "**Source:** manual"
  echo "**Tags:**"
  echo "**Status:** new"
} >> "$SCRATCH"

echo "Added '$short_name' to scratchpad." >&2
