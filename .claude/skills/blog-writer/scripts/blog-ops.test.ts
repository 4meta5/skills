import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  listPosts,
  readPost,
  writePost,
  renamePost,
  deletePost,
  updatePostLinks,
  type BlogPost
} from './blog-ops.js';

describe('blog-ops module', () => {
  let tempDir: string;
  let blogDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'blog-ops-test-'));
    blogDir = join(tempDir, 'src', 'content', 'blog');
    await mkdir(blogDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('listPosts', () => {
    it('should return empty array for empty blog directory', async () => {
      const posts = await listPosts(blogDir);
      expect(posts).toEqual([]);
    });

    it('should list all markdown posts', async () => {
      await writeFile(
        join(blogDir, 'first-post.md'),
        `---
title: First Post
description: My first post
date: 2026-01-01
published: true
---

Content here.`,
        'utf-8'
      );

      await writeFile(
        join(blogDir, 'second-post.md'),
        `---
title: Second Post
description: My second post
date: 2026-01-15
published: false
---

More content.`,
        'utf-8'
      );

      const posts = await listPosts(blogDir);

      expect(posts.length).toBe(2);
      expect(posts.map(p => p.slug).sort()).toEqual(['first-post', 'second-post']);
    });

    it('should ignore non-markdown files', async () => {
      await writeFile(join(blogDir, 'valid-post.md'), `---
title: Valid
description: A valid post
date: 2026-01-01
published: true
---

Content.`, 'utf-8');
      await writeFile(join(blogDir, 'readme.txt'), 'Not a post', 'utf-8');
      await mkdir(join(blogDir, 'subdir'));

      const posts = await listPosts(blogDir);

      expect(posts.length).toBe(1);
      expect(posts[0].slug).toBe('valid-post');
    });

    it('should extract frontmatter fields', async () => {
      await writeFile(
        join(blogDir, 'test-post.md'),
        `---
title: Test Title
description: Test description here
date: 2026-01-20
published: true
---

Body content.`,
        'utf-8'
      );

      const posts = await listPosts(blogDir);

      expect(posts[0].title).toBe('Test Title');
      expect(posts[0].description).toBe('Test description here');
      expect(posts[0].date).toBe('2026-01-20');
      expect(posts[0].published).toBe(true);
    });
  });

  describe('readPost', () => {
    it('should read post by slug', async () => {
      await writeFile(
        join(blogDir, 'my-post.md'),
        `---
title: My Post
description: Description
date: 2026-01-15
published: true
---

The body content here.`,
        'utf-8'
      );

      const post = await readPost(blogDir, 'my-post');

      expect(post.slug).toBe('my-post');
      expect(post.title).toBe('My Post');
      expect(post.content).toBe('The body content here.');
    });

    it('should throw for non-existent post', async () => {
      await expect(readPost(blogDir, 'nonexistent')).rejects.toThrow();
    });
  });

  describe('writePost', () => {
    it('should create new post file', async () => {
      const post: BlogPost = {
        slug: 'new-post',
        title: 'New Post Title',
        description: 'A new post',
        date: '2026-01-25',
        published: false,
        content: 'Post body content.'
      };

      await writePost(blogDir, post);

      const content = await readFile(join(blogDir, 'new-post.md'), 'utf-8');
      expect(content).toContain('title: New Post Title');
      expect(content).toContain('description: A new post');
      expect(content).toContain('date: 2026-01-25');
      expect(content).toContain('published: false');
      expect(content).toContain('Post body content.');
    });

    it('should overwrite existing post', async () => {
      await writeFile(
        join(blogDir, 'existing.md'),
        `---
title: Old Title
description: Old
date: 2026-01-01
published: true
---

Old content.`,
        'utf-8'
      );

      const post: BlogPost = {
        slug: 'existing',
        title: 'New Title',
        description: 'Updated',
        date: '2026-01-25',
        published: true,
        content: 'New content.'
      };

      await writePost(blogDir, post);

      const content = await readFile(join(blogDir, 'existing.md'), 'utf-8');
      expect(content).toContain('title: New Title');
      expect(content).toContain('New content.');
      expect(content).not.toContain('Old Title');
    });
  });

  describe('renamePost', () => {
    it('should rename post file', async () => {
      await writeFile(
        join(blogDir, 'old-slug.md'),
        `---
title: The Post
description: A post
date: 2026-01-15
published: true
---

Content.`,
        'utf-8'
      );

      await renamePost(blogDir, 'old-slug', 'new-slug');

      // Old file should not exist
      await expect(readFile(join(blogDir, 'old-slug.md'), 'utf-8')).rejects.toThrow();

      // New file should exist with same content
      const content = await readFile(join(blogDir, 'new-slug.md'), 'utf-8');
      expect(content).toContain('title: The Post');
      expect(content).toContain('Content.');
    });

    it('should throw if old post does not exist', async () => {
      await expect(renamePost(blogDir, 'nonexistent', 'new-slug')).rejects.toThrow();
    });
  });

  describe('deletePost', () => {
    it('should delete post file', async () => {
      await writeFile(
        join(blogDir, 'to-delete.md'),
        `---
title: Delete Me
description: To be deleted
date: 2026-01-15
published: false
---

Content.`,
        'utf-8'
      );

      await deletePost(blogDir, 'to-delete');

      await expect(readFile(join(blogDir, 'to-delete.md'), 'utf-8')).rejects.toThrow();
    });

    it('should throw if post does not exist', async () => {
      await expect(deletePost(blogDir, 'nonexistent')).rejects.toThrow();
    });
  });

  describe('updatePostLinks', () => {
    it('should update links in other posts when a slug changes', async () => {
      await writeFile(join(blogDir, 'post-a.md'), `---
title: Post A
description: Links to another post
date: 2026-01-01
published: true
---

Check out [Post B](/blog/old-slug) for more info.`, 'utf-8');

      await updatePostLinks(blogDir, 'old-slug', 'new-slug');

      const content = await readFile(join(blogDir, 'post-a.md'), 'utf-8');
      expect(content).toContain('/blog/new-slug');
      expect(content).not.toContain('/blog/old-slug');
    });

    it('should return list of updated files', async () => {
      await writeFile(join(blogDir, 'linking-post.md'), `---
title: Linker
description: Has a link
date: 2026-01-01
published: true
---

See [here](/blog/target-slug).`, 'utf-8');

      const updated = await updatePostLinks(blogDir, 'target-slug', 'renamed-slug');
      expect(updated).toContain('linking-post');
    });

    it('should not modify posts without matching links', async () => {
      await writeFile(join(blogDir, 'unrelated.md'), `---
title: Unrelated
description: No links
date: 2026-01-01
published: true
---

No links here.`, 'utf-8');

      const updated = await updatePostLinks(blogDir, 'some-slug', 'other-slug');
      expect(updated).toEqual([]);
    });
  });
});
