#!/bin/bash
# Blog Writer Hook
# Triggers skill activation for blog-related operations
#
# Trigger conditions:
# - Prompt mentions "blog post", "write post", "update post"
# - Prompt mentions "amarsingh.dev"
# - Prompt mentions specific blog operations

# Read the input JSON (contains the user's prompt)
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# Convert to lowercase for matching
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# Check for blog-related triggers
TRIGGERS=(
  "blog.?post"
  "write.?post"
  "update.?post"
  "new.?post"
  "create.?post"
  "rename.?post"
  "delete.?post"
  "amarsingh\.dev"
  "/blog/"
  "src/content/blog"
)

MATCHED=false
for pattern in "${TRIGGERS[@]}"; do
  if echo "$PROMPT_LOWER" | grep -qiE "$pattern"; then
    MATCHED=true
    break
  fi
done

# If no match, exit silently
if [ "$MATCHED" = false ]; then
  exit 0
fi

# Output skill activation context
cat << 'BLOG_CONTEXT'

## SKILL ACTIVATION: blog-writer

The prompt mentions blog post operations. Use Skill(blog-writer) for this task.

### Available Operations

1. **Create new post**: Write to `src/content/blog/[slug].md`
2. **Update post**: Modify existing file
3. **Rename post**: Change filename (slug)
4. **Delete post**: Remove file

### Post Structure

```yaml
---
title: Post Title (claim, not topic)
description: One sentence summary
date: YYYY-MM-DD
published: true/false
---

Post content following Paul Graham style.
```

### Writing Style Reminders

- Short sentences. Direct claims.
- **Never use em dashes (—)**
- Start with the point, not background
- One idea per paragraph
- Headers should be claims

### Blog Directory

Default: `src/content/blog/`

Use the blog-writer skill for consistent post management.

BLOG_CONTEXT

exit 0
