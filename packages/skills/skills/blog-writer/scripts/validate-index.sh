#!/usr/bin/env bash
# Validate blog index.json against posts/ directory
# Exit 0 if valid, exit 1 if issues found

set -euo pipefail

BLOG_DIR="${1:-$(dirname "$0")/..}"
POSTS_DIR="$BLOG_DIR/posts"
INDEX_FILE="$BLOG_DIR/index.json"

if [[ ! -f "$INDEX_FILE" ]]; then
    echo "❌ index.json not found at $INDEX_FILE"
    exit 1
fi

if [[ ! -d "$POSTS_DIR" ]]; then
    echo "❌ posts/ directory not found at $POSTS_DIR"
    exit 1
fi

errors=0

# Get slugs from index.json
index_slugs=$(jq -r '.posts[].slug' "$INDEX_FILE" 2>/dev/null || echo "")

if [[ -z "$index_slugs" ]]; then
    echo "❌ Could not parse index.json or no posts found"
    exit 1
fi

# Check each index entry has a file
echo "Checking index.json entries..."
while IFS= read -r slug; do
    if [[ ! -f "$POSTS_DIR/$slug.md" ]]; then
        echo "❌ Missing file: posts/$slug.md (referenced in index.json)"
        ((errors++))
    fi
done <<< "$index_slugs"

# Check each file has an index entry
echo "Checking posts/ files..."
for file in "$POSTS_DIR"/*.md; do
    [[ -f "$file" ]] || continue
    slug=$(basename "$file" .md)
    if ! echo "$index_slugs" | grep -qx "$slug"; then
        echo "❌ Orphaned file: posts/$slug.md (not in index.json)"
        ((errors++))
    fi
done

if [[ $errors -eq 0 ]]; then
    echo "✅ Blog index is valid"
    exit 0
else
    echo ""
    echo "Found $errors error(s). Update index.json to match posts/."
    exit 1
fi
