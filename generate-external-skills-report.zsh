#!/usr/bin/env zsh
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
OUT_DIR="$PROJECT_DIR/x"

CLONES_DIR="${CLONES_DIR:-/Users/amar/clones}"
CLAUDETTE_DIR="${CLAUDETTE_DIR:-/Users/amar/agi/claudette}"
CLUNKERS_DIR="${CLUNKERS_DIR:-/Users/amar/agi/clunkers}"

RUN_CLAUDETTE=1
DEBUG_ARTIFACTS=0

for arg in "$@"; do
  case "$arg" in
    --no-claudette) RUN_CLAUDETTE=0 ;;
    --debug) DEBUG_ARTIFACTS=1 ;;
    *) ;;
  esac
done

TS="$(date -u +%Y-%m-%dT%H%M%SZ)"
DATE_UTC="$(date -u +%Y-%m-%d)"

REPORT_MD="$OUT_DIR/report-${TS}.md"
LATEST_LINK="$OUT_DIR/latest-report.md"

if (( DEBUG_ARTIFACTS == 1 )); then
  CONTEXT_JSON="$OUT_DIR/context-${TS}.json"
  PROMPT_MD="$OUT_DIR/prompt-${TS}.md"
  INVENTORY_MD="$OUT_DIR/inventory-${TS}.md"
else
  TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/skills-report-${TS}-XXXXXX")"
  trap 'rm -rf "$TMP_DIR"' EXIT
  CONTEXT_JSON="$TMP_DIR/context.json"
  PROMPT_MD="$TMP_DIR/prompt.md"
  INVENTORY_MD="$TMP_DIR/inventory.md"
fi

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2
}

die() {
  log "FATAL: $*"
  exit 1
}

[[ -d "$CLONES_DIR" ]] || die "clones directory not found: $CLONES_DIR"
mkdir -p "$OUT_DIR" || die "cannot create output directory: $OUT_DIR"

LATEST_CLUNKERS_REPORT="$(ls -1t "$CLUNKERS_DIR"/artifacts/reports/*.md 2>/dev/null | head -1 || true)"
LATEST_CLUNKERS_RUNS="$(ls -1t "$CLUNKERS_DIR"/runs/*.md 2>/dev/null | head -1 || true)"

log "Building clone inventory context"
python3 - "$CLONES_DIR" "$CONTEXT_JSON" "$INVENTORY_MD" "$TS" "$DATE_UTC" "$LATEST_CLUNKERS_REPORT" "$LATEST_CLUNKERS_RUNS" <<'PY'
import json
import os
import re
import sys
from pathlib import Path

clones_dir = Path(sys.argv[1])
context_json = Path(sys.argv[2])
inventory_md = Path(sys.argv[3])
ts = sys.argv[4]
date_utc = sys.argv[5]
latest_report_path = Path(sys.argv[6]) if sys.argv[6] else None
latest_runs_path = Path(sys.argv[7]) if sys.argv[7] else None

repos = sorted([p for p in clones_dir.iterdir() if p.is_dir()])

def list_skill_paths(repo: Path):
    out = []
    for p in repo.rglob("SKILL.md"):
        if ".git" in p.parts:
            continue
        out.append(str(p))
    out.sort()
    return out

repo_entries = []
all_skill_paths = []
for repo in repos:
    skills = list_skill_paths(repo)
    repo_entries.append(
        {
            "repo": repo.name,
            "skill_count": len(skills),
            "skill_paths": skills,
        }
    )
    all_skill_paths.extend(skills)

repo_entries.sort(key=lambda x: x["repo"].lower())
repo_counts_desc = sorted(repo_entries, key=lambda x: (-x["skill_count"], x["repo"].lower()))

priority = {
    "pi_mono": [p for p in all_skill_paths if "/pi-mono/" in p],
    "pi_skills": [p for p in all_skill_paths if "/pi-skills/" in p],
    "openclaw": [p for p in all_skill_paths if "/openclaw/" in p],
}

other_pi = []
for e in repo_entries:
    name = e["repo"]
    if "pi" in name.lower() and name not in {"pi-mono", "pi-skills"}:
        other_pi.extend(e["skill_paths"])
priority["other_pi_related"] = sorted(other_pi)

def safe_read(path: Path | None, max_chars: int = 20000):
    if not path or not path.exists():
        return ""
    try:
        txt = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""
    if len(txt) > max_chars:
        return txt[:max_chars] + "\n\n[truncated]\n"
    return txt

clunkers_report_text = safe_read(latest_report_path)
clunkers_runs_text = safe_read(latest_runs_path)

context = {
    "timestamp": ts,
    "date_utc": date_utc,
    "clones_dir": str(clones_dir),
    "repo_count": len(repo_entries),
    "total_skill_files": len(all_skill_paths),
    "repo_entries": repo_entries,
    "top_repos_by_skill_count": repo_counts_desc[:20],
    "priority_groups": priority,
    "latest_clunkers_artifacts": {
        "report_path": str(latest_report_path) if latest_report_path else "",
        "runs_path": str(latest_runs_path) if latest_runs_path else "",
        "report_text": clunkers_report_text,
        "runs_text": clunkers_runs_text,
    },
}

context_json.write_text(json.dumps(context, indent=2), encoding="utf-8")

lines = []
lines.append(f"# Clone Skill Inventory ({date_utc})")
lines.append("")
lines.append(f"- Repos scanned: {len(repo_entries)}")
lines.append(f"- SKILL.md files found: {len(all_skill_paths)}")
lines.append("")
lines.append("## Per Clone Counts")
lines.append("")
for e in repo_entries:
    lines.append(f"- {e['repo']}: {e['skill_count']}")
lines.append("")
lines.append("## Priority Groups")
lines.append("")
lines.append("### pi-mono")
for p in priority["pi_mono"]:
    lines.append(f"- {p}")
lines.append("")
lines.append("### pi-skills")
for p in priority["pi_skills"]:
    lines.append(f"- {p}")
lines.append("")
lines.append("### openclaw")
for p in priority["openclaw"]:
    lines.append(f"- {p}")
lines.append("")
lines.append("### other pi-related")
for p in priority["other_pi_related"]:
    lines.append(f"- {p}")
lines.append("")

inventory_md.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

log "Assembling prompt"
cat > "$PROMPT_MD" <<EOF
You are generating a self-contained external skills report for coding-agent profiles.
Date context: ${DATE_UTC}.

Goals:
1) List all clones with SKILL.md counts (including zero counts).
2) Provide complete skill path lists with this order:
   a) pi-mono
   b) pi-skills
   c) openclaw
   d) other pi-related repos
3) Summarize generally useful learnings from the latest clunkers report and runs report.
4) Recommend top 3-5 external skills to add for each profile:
   - coder
   - auditor
   - devops
   - interactive
   - compound
5) Include SOTA-informed missing skill themes for these profiles and cite sources with links.

Output requirements:
- Must be fully self-contained and ready to paste to another agent.
- Use clear section headings.
- Keep recommendations concrete and directly actionable.

JSON context:
\`\`\`json
$(cat "$CONTEXT_JSON")
\`\`\`
EOF

if (( RUN_CLAUDETTE == 0 )); then
  cp "$INVENTORY_MD" "$REPORT_MD"
  cp "$REPORT_MD" "$LATEST_LINK"
  log "Skipped claudette (--no-claudette). Wrote inventory as report."
else
  [[ -d "$CLAUDETTE_DIR" ]] || die "claudette directory not found: $CLAUDETTE_DIR"
  log "Invoking claudette"
  (
    cd "$CLAUDETTE_DIR" && \
    CLAUDETTE_SKIP_FORCED_EVAL=1 node --import tsx bin/claudette.ts \
      --no-session \
      -p "$(cat "$PROMPT_MD")"
  ) > "$REPORT_MD"
  [[ -s "$REPORT_MD" ]] || die "report is empty: $REPORT_MD"
  cp "$REPORT_MD" "$LATEST_LINK"
fi

log "Done"
log "Report: $REPORT_MD"
log "Latest: $LATEST_LINK"
if (( DEBUG_ARTIFACTS == 1 )); then
  log "Debug artifacts:"
  log "  Context: $CONTEXT_JSON"
  log "  Prompt: $PROMPT_MD"
  log "  Inventory: $INVENTORY_MD"
fi
