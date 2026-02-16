#!/usr/bin/env bash
# prompt-improve.sh — print prompts for LLM-assisted improvement, then apply updates
set -euo pipefail

SKILLS_REPO="${SKILLS_REPO:-$HOME/agi/skills}"
SCRATCH="$SKILLS_REPO/wip/scratch.md"

if [[ ! -f "$SCRATCH" ]]; then
  echo "Scratchpad not found: $SCRATCH" >&2
  exit 1
fi

# Parse all entries: collect index, name, pattern
declare -a names=()
declare -a patterns=()
declare -a line_nums=()
idx=0
line_num=0
current_name=""
current_pattern=""
current_line=0

while IFS= read -r line; do
  ((line_num++)) || true

  if [[ "$line" =~ ^###\ [0-9]{4}-[0-9]{2}-[0-9]{2}\ \|\ (.+) ]]; then
    # Flush previous
    if [[ -n "$current_name" && -n "$current_pattern" ]]; then
      names+=("$current_name")
      patterns+=("$current_pattern")
      line_nums+=("$current_line")
      ((idx++)) || true
    fi
    current_name="${BASH_REMATCH[1]}"
    current_pattern=""
    current_line=$line_num
    continue
  fi

  if [[ "$line" =~ ^\*\*Pattern:\*\*\ (.+) ]]; then
    current_pattern="${BASH_REMATCH[1]}"
  fi
done < "$SCRATCH"

# Flush last
if [[ -n "$current_name" && -n "$current_pattern" ]]; then
  names+=("$current_name")
  patterns+=("$current_pattern")
  line_nums+=("$current_line")
fi

total=${#names[@]}

if [[ $total -eq 0 ]]; then
  echo "No entries found in scratchpad." >&2
  exit 1
fi

# Print the worksheet
cat >&2 <<'HEADER'
╔══════════════════════════════════════════════════════╗
║           PROMPT IMPROVEMENT WORKSHEET               ║
╠══════════════════════════════════════════════════════╣
║  1. Copy everything between the ── lines below       ║
║  2. Paste it into your LLM                           ║
║  3. Copy the LLM's response                          ║
║  4. Paste it back here when prompted                  ║
╚══════════════════════════════════════════════════════╝

HEADER

echo "────────────────── COPY START ──────────────────"
cat <<INSTRUCTIONS

You are a prompt engineering assistant. Below are $total reusable prompt patterns from a scratchpad. Your job is to improve each one.

For each prompt:
- Make it clearer and more specific
- Remove filler words
- Strengthen the action verbs
- Keep the core intent intact
- If a prompt is already strong, return it unchanged

IMPORTANT: Return your response in EXACTLY this format, one line per prompt:

INSTRUCTIONS

for ((i=0; i<total; i++)); do
  echo "[$((i+1))] IMPROVED: <your improved version>"
done

cat <<'RULES'

Rules:
- Use the [N] IMPROVED: prefix for every entry, even unchanged ones
- Do not add explanations or commentary between entries
- Do not change the numbering
- One prompt per line, no line breaks within a prompt

Here are the prompts to improve:

RULES

for ((i=0; i<total; i++)); do
  echo "[$((i+1))] ${names[$i]}"
  echo "    CURRENT: ${patterns[$i]}"
  echo ""
done

echo "────────────────── COPY END ────────────────────"
echo "" >&2
echo "Paste the LLM's response below (blank line to finish):" >&2

# Read multi-line response until blank line
response=""
while IFS= read -r rline; do
  [[ -z "$rline" ]] && break
  response="${response}${response:+$'\n'}${rline}"
done

if [[ -z "$response" ]]; then
  echo "No response pasted. No changes made." >&2
  exit 0
fi

# Parse response: extract [N] IMPROVED: lines
declare -a improved=()
for ((i=0; i<total; i++)); do
  improved+=("")
done

while IFS= read -r rline; do
  if [[ "$rline" =~ ^\[([0-9]+)\]\ IMPROVED:\ (.+) ]]; then
    num="${BASH_REMATCH[1]}"
    text="${BASH_REMATCH[2]}"
    idx=$((num - 1))
    if (( idx >= 0 && idx < total )); then
      improved[$idx]="$text"
    fi
  fi
done <<< "$response"

# Apply improvements
changes=0
for ((i=0; i<total; i++)); do
  if [[ -n "${improved[$i]}" && "${improved[$i]}" != "${patterns[$i]}" ]]; then
    # Escape sed special chars in old and new
    old_escaped=$(printf '%s\n' "${patterns[$i]}" | sed 's/[&/\]/\\&/g')
    new_escaped=$(printf '%s\n' "${improved[$i]}" | sed 's/[&/\]/\\&/g')
    sed -i '' "s|^\\*\\*Pattern:\\*\\* ${old_escaped}$|**Pattern:** ${new_escaped}|" "$SCRATCH"
    echo "  Updated [$((i+1))] ${names[$i]}" >&2
    ((changes++)) || true
  else
    echo "  Kept    [$((i+1))] ${names[$i]}" >&2
  fi
done

echo "" >&2
echo "$changes prompt(s) updated in $SCRATCH" >&2
