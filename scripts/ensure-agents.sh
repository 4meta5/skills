#!/bin/sh
# Ensure AGENTS.md symlinks to CLAUDE.md in one or more repos.
# Usage: ./scripts/ensure-agents.sh [repo...]

if [ "$#" -eq 0 ]; then
  set -- .
fi

for repo in "$@"; do
  if [ ! -d "$repo" ]; then
    echo "ERROR $repo: not a directory"
    continue
  fi

  if [ ! -e "$repo/CLAUDE.md" ]; then
    echo "ERROR $repo: missing CLAUDE.md"
    continue
  fi

  if [ -L "$repo/AGENTS.md" ]; then
    link_target=$(readlink "$repo/AGENTS.md" 2>/dev/null)
    if [ "$link_target" = "./CLAUDE.md" ]; then
      echo "OK $repo"
      continue
    fi
  fi

  (cd "$repo" && ln -sf ./CLAUDE.md ./AGENTS.md)
  if [ $? -eq 0 ]; then
    echo "FIXED $repo"
  else
    echo "ERROR $repo: failed to link"
  fi

done
