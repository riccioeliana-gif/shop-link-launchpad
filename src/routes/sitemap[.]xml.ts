import { createFileRoute } from "@tanstack/react-router";
import { getPosts } from "@/lib/posts";

// /sitemap.xml, built from the blog posts so a new post is listed as soon as
// its markdown file exists. Add new top-level pages to PAGES.
const SITE_URL = "https://isarthingshop.com";

const PAGES: Array<{ path: string; changefreq: string }> = [
  { path: "/", changefreq: "weekly" },
  { path: "/blog", changefreq: "weekly" },
  { path: "/waitlist", changefreq: "monthly" },
  { path: "/privacy", changefreq: "yearly" },
];

function sitemapXml(): string {
  const urls = [
    ...PAGES.map(({ path, changefreq }) => ({ loc: `${SITE_URL}${path}`, changefreq })),
    ...getPosts().map((post) => ({
      loc: `${SITE_URL}/blog/${post.slug}`,
      changefreq: "monthly",
      lastmod: post.date,
    })),
  ];
  const entries = urls.map(
    (url) =>
      `  <url>\n    <loc>${url.loc}</loc>\n` +
      ("lastmod" in url ? `    <lastmod>${url.lastmod}</lastmod>\n` : "") +
      `    <changefreq>${url.changefreq}</changefreq>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () =>
        new Response(sitemapXml(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
