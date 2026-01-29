/**
 * Blog operations helper for amarsingh.dev
 *
 * Provides functions for listing, reading, writing, renaming,
 * and deleting blog posts.
 */

import { readFile, writeFile, readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

/**
 * Represents a blog post with frontmatter and content
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  published: boolean;
  content: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');

  // Match frontmatter delimited by ---
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      frontmatter: {},
      body: normalized
    };
  }

  const yamlContent = match[1].trim();
  const body = match[2].trim();

  try {
    const frontmatter = parseYaml(yamlContent) || {};
    return { frontmatter, body };
  } catch {
    return { frontmatter: {}, body: normalized };
  }
}

/**
 * Format a blog post as markdown with frontmatter
 */
function formatPost(post: BlogPost): string {
  const frontmatter = {
    title: post.title,
    description: post.description,
    date: post.date,
    published: post.published
  };

  const yaml = stringifyYaml(frontmatter).trim();
  return `---\n${yaml}\n---\n\n${post.content}\n`;
}

/**
 * Extract slug from filename (removes .md extension)
 */
function filenameToSlug(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * Convert slug to filename (adds .md extension)
 */
function slugToFilename(slug: string): string {
  return `${slug}.md`;
}

/**
 * List all blog posts in the directory
 */
export async function listPosts(blogDir: string): Promise<BlogPost[]> {
  const posts: BlogPost[] = [];

  try {
    const entries = await readdir(blogDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const slug = filenameToSlug(entry.name);
      const filePath = join(blogDir, entry.name);

      try {
        const content = await readFile(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);

        posts.push({
          slug,
          title: frontmatter.title || slug,
          description: frontmatter.description || '',
          date: frontmatter.date || '',
          published: frontmatter.published ?? false,
          content: body
        });
      } catch {
        // Skip files that can't be read
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return posts;
}

/**
 * Read a single post by slug
 *
 * @throws Error if post does not exist
 */
export async function readPost(blogDir: string, slug: string): Promise<BlogPost> {
  const filePath = join(blogDir, slugToFilename(slug));

  // Check file exists
  try {
    await stat(filePath);
  } catch {
    throw new Error(`Post not found: ${slug}`);
  }

  const content = await readFile(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    slug,
    title: frontmatter.title || slug,
    description: frontmatter.description || '',
    date: frontmatter.date || '',
    published: frontmatter.published ?? false,
    content: body
  };
}

/**
 * Write a post to disk
 *
 * Creates or overwrites the post file.
 */
export async function writePost(blogDir: string, post: BlogPost): Promise<void> {
  const filePath = join(blogDir, slugToFilename(post.slug));
  const content = formatPost(post);
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Rename a post (change its slug)
 *
 * @throws Error if old post does not exist
 */
export async function renamePost(blogDir: string, oldSlug: string, newSlug: string): Promise<void> {
  const oldPath = join(blogDir, slugToFilename(oldSlug));
  const newPath = join(blogDir, slugToFilename(newSlug));

  // Verify old post exists
  try {
    await stat(oldPath);
  } catch {
    throw new Error(`Post not found: ${oldSlug}`);
  }

  // Read content
  const content = await readFile(oldPath, 'utf-8');

  // Write to new path
  await writeFile(newPath, content, 'utf-8');

  // Delete old file
  await unlink(oldPath);
}

/**
 * Delete a post
 *
 * @throws Error if post does not exist
 */
export async function deletePost(blogDir: string, slug: string): Promise<void> {
  const filePath = join(blogDir, slugToFilename(slug));

  // Verify post exists
  try {
    await stat(filePath);
  } catch {
    throw new Error(`Post not found: ${slug}`);
  }

  await unlink(filePath);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update internal links across all posts when a slug changes
 *
 * @returns Array of slugs that were updated
 */
export async function updatePostLinks(
  blogDir: string,
  oldSlug: string,
  newSlug: string
): Promise<string[]> {
  const posts = await listPosts(blogDir);
  const updatedSlugs: string[] = [];

  const oldLink = `/blog/${oldSlug}`;
  const newLink = `/blog/${newSlug}`;

  for (const post of posts) {
    if (post.content.includes(oldLink)) {
      const updatedContent = post.content.replace(
        new RegExp(escapeRegExp(oldLink), 'g'),
        newLink
      );
      await writePost(blogDir, { ...post, content: updatedContent });
      updatedSlugs.push(post.slug);
    }
  }

  return updatedSlugs;
}
