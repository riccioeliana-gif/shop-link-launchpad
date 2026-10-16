// Blog posts live as markdown files in src/content/posts/. Each file starts
// with a small frontmatter block (title, date, excerpt, tags and an optional
// cover) and the slug is the filename. Cover and inline images are filenames from
// src/assets/carousel/, so the same photos can be reused in posts.
import { photoUrl } from "@/lib/shop";

const postFiles = import.meta.glob<string>("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
  tags: string[];
  body: string;
};

export function postImageUrl(filename: string): string {
  return photoUrl(filename, "A blog post");
}

function parsePost(slug: string, raw: string): Post {
  const match = raw.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Post "${slug}" is missing its --- frontmatter block.`);
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ["title", "date", "excerpt", "tags"]) {
    if (!meta[key]) throw new Error(`Post "${slug}" is missing "${key}" in its frontmatter.`);
  }
  const tags = meta.tags
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  if (tags.length === 0) {
    throw new Error(`Post "${slug}" has an empty "tags" frontmatter field.`);
  }
  return {
    slug,
    title: meta.title,
    date: meta.date,
    excerpt: meta.excerpt,
    cover: meta.cover || undefined,
    tags,
    body: match[2].trim(),
  };
}

const POSTS: Post[] = Object.entries(postFiles)
  .map(([path, raw]) => parsePost(path.split("/").pop()!.replace(/\.md$/, ""), raw))
  .sort((a, b) => b.date.localeCompare(a.date));

export function getPosts(): Post[] {
  return POSTS;
}

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

// ~200 words per minute is a comfortable pace for this kind of short article.
export function postReadingTime(post: Post): number {
  const words = post.body.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
