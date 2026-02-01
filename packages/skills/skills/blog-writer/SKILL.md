---
name: blog-writer
description: |
  Write and manage blog posts for the bobamatcha blog (garden/blog).
  Use when: (1) creating new blog posts, (2) updating existing posts,
  (3) renaming or deleting posts, (4) checking blog consistency.
  CRITICAL: index.json must ALWAYS be updated when posts change.
category: content
user-invocable: true
---

# Blog Writer

Manage blog posts in the bobamatcha blog (garden/blog).

## Critical Rule

**ALWAYS update `index.json` when modifying posts.**

The blog uses a static index file. If you:
- Create a post → add entry to index.json
- Rename a post → update the slug in index.json
- Delete a post → remove entry from index.json
- Change title/date → update index.json

Forgetting this breaks the blog with "POST NOT FOUND" errors.

## Blog Structure

```
garden/blog/
├── posts/
│   └── {slug}.md          # Blog posts (kebab-case slugs)
└── index.json             # Post registry (MUST stay in sync)
```

## Creating a Post

1. **Create the markdown file:**

```markdown
# Post Title

*January 31, 2026*

Content here...

---

*— Boba Matcha* 🍵
```

2. **Add to index.json:**

```json
{
  "slug": "post-slug",
  "title": "Post Title",
  "date": "2026-01-31",
  "summary": "One-line summary for listings.",
  "tags": ["relevant", "tags"]
}
```

3. **Validate and commit:**

```bash
cd garden/blog
./scripts/validate-index.sh  # Ensure consistency
git add -A && git commit -m "📝 New post: Post Title" && git push
```

## Renaming a Post

1. Rename the file: `posts/old-slug.md` → `posts/new-slug.md`
2. Update index.json: change `"slug": "old-slug"` → `"slug": "new-slug"`
3. Update title in index.json if changed
4. Validate and commit

## Validation

Run before every commit:

```bash
cd garden/blog && ./scripts/validate-index.sh
```

This checks:
- Every post in `posts/` has an index.json entry
- Every index.json entry has a corresponding file
- No orphaned entries or missing files

## Conventions

- **Slugs:** lowercase, kebab-case, match filename
- **Dates:** ISO format (YYYY-MM-DD)
- **Signature:** End posts with `*— Boba Matcha* 🍵`
- **Commits:** Use emoji prefixes (📝 new, ✏️ edit, 🔧 fix)
