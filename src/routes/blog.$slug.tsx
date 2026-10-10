import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { useTrack } from "@/lib/analytics";
import { formatPostDate, getPost, postImageUrl } from "@/lib/posts";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    return {
      meta: [
        { title: `${post.title} — Isar Things Shop` },
        { name: "description", content: post.excerpt },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://isarthingshop.com/blog/${post.slug}` },
        { property: "og:image", content: "https://isarthingshop.com/og-image.png" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center bg-background p-6 text-center font-body">
      <div>
        <h1 className="font-display text-4xl font-bold">Post not found</h1>
        <Link to="/blog" className="mt-4 inline-block font-extrabold underline">
          ← All posts
        </Link>
      </div>
    </div>
  ),
  component: BlogPost,
});

function BlogPost() {
  const { post } = Route.useLoaderData();
  const track = useTrack();
  const articleRef = useRef<HTMLElement>(null);

  // How much of the article visitors read: fires once per threshold per post,
  // measured on the article itself (100 = they reached the last line).
  useEffect(() => {
    const thresholds = [25, 50, 75, 100];
    const reached = new Set<number>();
    const onScroll = () => {
      const article = articleRef.current;
      if (!article) return;
      const { top, height } = article.getBoundingClientRect();
      const depth = ((window.innerHeight - top) / height) * 100;
      for (const threshold of thresholds) {
        if (depth >= threshold - 1 && !reached.has(threshold)) {
          reached.add(threshold);
          track("blog_post_read", { slug: post.slug, percent: threshold });
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [post.slug]);

  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-10 font-body text-foreground sm:px-6">
      <article ref={articleRef} className="mx-auto max-w-2xl">
        <Link
          to="/blog"
          className="font-extrabold underline decoration-brand-yellow decoration-4 underline-offset-4 hover:text-brand-yellow-text"
        >
          ← All posts
        </Link>

        <p className="mt-8 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          {formatPostDate(post.date)}
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">{post.title}</h1>

        <div className="mt-8">
          <Markdown
            components={{
              h2: ({ children }) => (
                <h2 className="mb-3 mt-10 font-display text-2xl font-bold sm:text-3xl">
                  {children}
                </h2>
              ),
              p: ({ children }) => (
                <p className="my-4 text-lg font-semibold leading-relaxed text-ink/90">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-extrabold text-ink">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="my-4 list-disc space-y-2 pl-6 text-lg font-semibold marker:text-brand-pink">
                  {children}
                </ul>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    track("blog_link_clicked", {
                      slug: post.slug,
                      domain: linkDomain(href),
                    })
                  }
                  className="font-extrabold text-ink underline decoration-brand-pink decoration-4 underline-offset-4 hover:text-brand-pink-text"
                >
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                <img
                  src={postImageUrl(String(src))}
                  alt={alt ?? ""}
                  loading="lazy"
                  className="toy-piece my-6 w-full rounded-[2rem] object-cover"
                  style={{
                    ["--piece-border" as string]: "var(--ink)",
                    ["--piece-shadow" as string]: "var(--brand-yellow)",
                  }}
                />
              ),
              blockquote: ({ children }) => (
                <blockquote className="my-10 rounded-3xl border-2 border-ink bg-brand-yellow p-5 [&_p]:my-0 [&_p]:text-ink">
                  {children}
                </blockquote>
              ),
            }}
          >
            {post.body}
          </Markdown>
        </div>
      </article>
    </div>
  );
}

// Only the site name of an outbound link (e.g. "vogue.com"), never the full URL.
function linkDomain(href: string | undefined): string {
  try {
    return new URL(href ?? "", window.location.href).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}
