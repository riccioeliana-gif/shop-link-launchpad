import { createFileRoute, Link } from "@tanstack/react-router";
import { ColorWords } from "./index";
import { formatPostDate, getPosts, postImageUrl } from "@/lib/posts";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — Isar Things Shop" },
      {
        name: "description",
        content: "Trends, styling ideas and little treasures from Isar Things Shop.",
      },
      { property: "og:title", content: "Blog — Isar Things Shop" },
      { property: "og:url", content: "https://isarthingshop.com/blog" },
    ],
  }),
  component: BlogIndex,
});

const PIECE_COLORS = ["brand-pink", "brand-blue", "brand-yellow", "brand-purple", "brand-green"];

function BlogIndex() {
  const posts = getPosts();
  return (
    <div className="min-h-screen bg-background px-4 pb-20 pt-10 font-body text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="font-extrabold underline decoration-brand-yellow decoration-4 underline-offset-4 hover:text-brand-yellow-text"
        >
          ← Back to the shop
        </Link>

        <h1 className="mt-8 font-display text-4xl font-bold sm:text-5xl">
          <ColorWords words={["The", "Isar", "blog"]} />
        </h1>
        <p className="mt-3 font-semibold text-muted-foreground">
          Trends, styling ideas and the stories behind our little treasures.
        </p>

        <div className="mt-10 space-y-8">
          {posts.map((post, i) => {
            const color = PIECE_COLORS[i % PIECE_COLORS.length];
            return (
              <Link
                key={post.slug}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="toy-piece block overflow-hidden rounded-[2.5rem] bg-card"
                style={{
                  ["--piece-border" as string]: "var(--ink)",
                  ["--piece-shadow" as string]: `var(--${color})`,
                }}
              >
                <img
                  src={postImageUrl(post.cover)}
                  alt=""
                  className="aspect-[4/3] w-full border-b-[3px] border-ink object-cover"
                />
                <div className="p-6 sm:p-8">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    {formatPostDate(post.date)}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{post.title}</h2>
                  <p className="mt-2 font-semibold text-muted-foreground">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-extrabold text-ink">
                    Read more →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} Isar Things Shop
        </p>
      </div>
    </div>
  );
}
