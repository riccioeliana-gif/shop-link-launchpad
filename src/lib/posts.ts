// Blog posts live as markdown files in src/content/posts/. Each file starts
// with a small frontmatter block (title, date, excerpt, cover) and the slug
// is the filename. Cover and inline images are filenames from
// src/assets/carousel/, so the same photos can be reused in posts.
const postFiles = import.meta.glob<string>("../content/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const imageFiles = import.meta.glob<{ default: string }>("../assets/carousel/*.webp", {
  eager: true,
});

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  body: string;
};

export function postImageUrl(filename: string): string {
  const entry = Object.entries(imageFiles).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`A blog post references "${filename}", but it isn't in src/assets/carousel/.`);
  }
  return entry[1].default;
}

function parsePost(slug: string, raw: string): Post {
  const match = raw.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error(`Post "${slug}" is missing its --- frontmatter block.`);
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const key of ["title", "date", "excerpt", "cover"]) {
    if (!meta[key]) throw new Error(`Post "${slug}" is missing "${key}" in its frontmatter.`);
  }
  return {
    slug,
    title: meta.title,
    date: meta.date,
    excerpt: meta.excerpt,
    cover: meta.cover,
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

export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
