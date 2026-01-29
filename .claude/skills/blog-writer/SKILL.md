---
name: blog-writer
description: |
  Write and manage blog posts for amarsingh.dev. Use when:
  (1) Creating new blog posts, (2) Updating existing posts,
  (3) Renaming or rewriting posts, (4) Removing posts.
  Follows Paul Graham writing style from CLAUDE.md guidelines.
category: documentation
user-invocable: true
allowed-tools: Read,Write,Glob,Grep
---

# Blog Writer

Manage blog posts for amarsingh.dev. Posts live at `src/content/blog/`.

## Post Schema

Every post is a markdown file with YAML frontmatter:

```yaml
---
title: Your Post Title
description: One sentence summary for SEO and previews
date: YYYY-MM-DD
published: true
---
```

The filename becomes the slug. Use kebab-case: `my-post-title.md` → `/blog/my-post-title`.

## Writing Style

Follow the Paul Graham style from CLAUDE.md:

**Voice**
- Write like speaking to an intelligent friend
- Short sentences. Direct claims. No hedging.
- First person for opinions and experience
- Active voice, not passive
- State claims confidently. No waffling.

**Punctuation Rules**
- **Never use em dashes (—)**
- Use periods and new sentences for separate thoughts
- Use commas for simple asides
- Use parentheses for clarifying information
- Use colons for lists or elaboration

**Structure**
- Start with the point, not background
- One idea per paragraph
- Headers should be claims, not topics
- End sections when the point is made

**Technical Writing**
- Code examples should be minimal and functional
- Explain the why, not just the what
- Link to deeper resources rather than over-explaining

## Operations

### Create New Post

1. Determine the slug (kebab-case filename without .md)
2. Create file at `src/content/blog/{slug}.md`
3. Add frontmatter with title, description, today's date, published: false
4. Write content following the style guide
5. Set published: true when ready

### Update Existing Post

1. Read the current post content
2. Make requested changes while preserving style
3. Update the date if the content changed substantially
4. Preserve the slug unless explicitly asked to rename

### Rename/Rewrite Post

1. Read the current post
2. Create new file with new slug
3. Delete old file
4. Update any internal links to the old slug

### Remove Post

1. Verify the correct file
2. Delete the file from `src/content/blog/`
3. Note: removal is permanent

## Quality Checklist

Before finalizing any post:

- [ ] Title is a claim, not a topic
- [ ] Description is one clear sentence
- [ ] Date is correct (YYYY-MM-DD format)
- [ ] No em dashes in content
- [ ] Sentences are short and direct
- [ ] Opens with the main point
- [ ] Code examples are minimal
- [ ] Internal links use relative paths (/blog/slug)

## Blog Directory

Default location: `/src/content/blog/`

List existing posts with:
```bash
ls -la src/content/blog/
```
