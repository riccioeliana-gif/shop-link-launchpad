import { createFileRoute } from "@tanstack/react-router";
import { usePostHog } from "posthog-js/react";
import logoUrl from "@/assets/isar-logo.jpg";
import heroUrl from "@/assets/clothes-rack.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Isar Things Shop — Clothes, things & little treasures",
      },
      {
        name: "description",
        content:
          "Carefully selected, pre-loved and unique clothes, things & little treasures. Shop our drops on Vinted and follow along on Instagram.",
      },
      {
        property: "og:title",
        content: "Isar Things Shop — Clothes, things & little treasures",
      },
      {
        property: "og:description",
        content:
          "Carefully selected, pre-loved and unique. Shop our drops on Vinted and follow along on Instagram.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const INSTAGRAM_URL = "https://www.instagram.com/isar_things_shop/";
const VINTED_URL = "https://www.vinted.it/member/57442722";
const EMAIL = "helloisarthingshop@gmail.com";

const BRAND_TEXT_COLORS = [
  "text-brand-blue",
  "text-brand-pink-text",
  "text-brand-green",
  "text-brand-purple-text",
  "text-brand-yellow-text",
  "text-brand-red",
];

function ColorWords({ words }: { words: string[] }) {
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className={`color-word ${BRAND_TEXT_COLORS[index % BRAND_TEXT_COLORS.length]}`}>
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

function Index() {
  const posthog = usePostHog();

  const captureOutboundClick = (
    event: "instagram_link_clicked" | "vinted_link_clicked" | "contact_email_clicked",
    placement: "header" | "hero" | "content_card" | "footer",
  ) => {
    if (
      !import.meta.env.VITE_PUBLIC_POSTHOG_KEY ||
      !import.meta.env.VITE_PUBLIC_POSTHOG_HOST
    ) {
      return;
    }
    posthog.capture(event, { placement });
  };

  return (
    <div className="tile-page min-h-screen overflow-x-hidden bg-background font-body text-foreground">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b-2 border-brand-yellow/40 bg-background/95 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <a
            href="/"
            aria-label="Isar Things Shop home"
            className="group block size-14 shrink-0 overflow-hidden rounded-2xl"
          >
            <img
              src={logoUrl}
              alt="Isar Things Shop"
              className="size-full scale-[1.25] object-cover transition-transform group-hover:-rotate-3"
            />
          </a>
          <div className="flex items-center gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("instagram_link_clicked", "header")}
              className="toy-block rounded-full border-2 border-brand-yellow bg-card px-3.5 py-1.5 text-sm font-extrabold text-ink"
              style={{ ["--block-shadow" as string]: "var(--brand-yellow)" }}
            >
              Instagram
            </a>
            <a
              href={VINTED_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("vinted_link_clicked", "header")}
              className="toy-block rounded-full border-2 border-brand-pink bg-brand-pink px-3.5 py-1.5 text-sm font-extrabold text-ink"
              style={{ ["--block-shadow" as string]: "var(--brand-pink-text)" }}
            >
              Shop on Vinted
            </a>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────── */}
      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 sm:pt-8 md:grid-cols-[1fr_1.6fr]">
          <div className="relative">
            <span className="mb-5 inline-block -rotate-2 rounded-full border-2 border-brand-purple bg-card px-4 py-1.5 text-sm font-extrabold text-ink">
              Pre-loved, unique, carefully selected
            </span>
            <h1 className="font-display text-4xl font-bold leading-[1.15] sm:text-5xl lg:text-6xl">
              <ColorWords words={["Clothes,", "things", "&", "little", "treasures", "made", "for", "everyone."]} />
            </h1>
            <p className="mt-5 max-w-md text-lg font-semibold text-muted-foreground">
              A colorful corner for unique pre-loved finds — every piece picked
              with a smile. Once they're gone, they won't be coming back!
            </p>
            <div className="mt-8 flex flex-nowrap items-center gap-3">
              <a
                href={VINTED_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => captureOutboundClick("vinted_link_clicked", "hero")}
                className="toy-block whitespace-nowrap rounded-2xl border-2 border-brand-pink bg-brand-pink px-4 py-2.5 text-sm font-extrabold text-ink sm:px-5 sm:py-3 sm:text-base"
                style={{ ["--block-shadow" as string]: "var(--brand-pink-text)" }}
              >
                Shop on Vinted →
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => captureOutboundClick("instagram_link_clicked", "hero")}
                className="whitespace-nowrap rounded-2xl border-2 border-brand-yellow bg-card px-4 py-2.5 text-sm font-extrabold text-ink underline decoration-brand-yellow decoration-4 underline-offset-4 transition-colors hover:bg-muted sm:px-5 sm:py-3 sm:text-base"
              >
                Follow on Instagram
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full">
            <div
              aria-hidden="true"
              className="absolute inset-4 rotate-3 rounded-[3rem] bg-brand-yellow/30"
            />
            <img
              src={heroUrl}
              alt="Isar Things Shop sign on a white brick wall next to a red rack of colorful knitted sweaters and a pink chair"
              className="toy-piece relative w-full -rotate-2 rounded-[2.5rem] object-cover"
              style={{ ["--piece-border" as string]: "var(--brand-purple)", ["--piece-shadow" as string]: "var(--brand-pink)" }}
            />
          </div>
        </section>


        {/* ── Shape-cutout content cards ─────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            <ColorWords words={["Pick", "your", "shape", "↓"]} />
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {/* Circle — Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("instagram_link_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{ ["--piece-border" as string]: "var(--brand-yellow)", ["--piece-shadow" as string]: "var(--brand-yellow)" }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-full border-[3px] border-ink bg-brand-yellow transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="size-9 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-yellow-text">Instagram</h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Daily drops, styling inspo &amp; behind the scenes.
              </p>
              <span className="mt-4 inline-block text-sm font-extrabold text-ink">
                @isar_things_shop →
              </span>
            </a>

            {/* Square — Vinted */}
            <a
              href={VINTED_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("vinted_link_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{ ["--piece-border" as string]: "var(--brand-pink)", ["--piece-shadow" as string]: "var(--brand-pink)" }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-2xl border-[3px] border-ink bg-brand-pink transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="size-9 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 7h12l1.5 13h-15z" />
                  <path d="M9 10V6a3 3 0 0 1 6 0v4" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-pink-text">Shop on Vinted</h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Browse the full collection &amp; grab the latest drop.
              </p>
              <span className="mt-4 inline-block text-sm font-extrabold text-ink">
                Visit our Vinted shop →
              </span>
            </a>

            {/* Star — Say hello */}
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => captureOutboundClick("contact_email_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{ ["--piece-border" as string]: "var(--brand-purple)", ["--piece-shadow" as string]: "var(--brand-purple)" }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-full border-[3px] border-ink bg-brand-purple transition-transform group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="size-9 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-purple-text">Say hello</h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Questions, size checks or just a hi — we reply with a smile.
              </p>
              <span className="mt-4 inline-block break-all text-sm font-extrabold text-ink">
                {EMAIL} →
              </span>
            </a>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t-2 border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center sm:px-6">
          <div className="flex gap-2" aria-hidden="true">
            {[
              "bg-brand-red",
              "bg-brand-pink",
              "bg-brand-yellow",
              "bg-brand-blue",
              "bg-brand-green",
              "bg-brand-purple",
            ].map((c) => (
              <span key={c} className={`size-3 rounded-full border border-ink/20 ${c}`} />
            ))}
          </div>
          <p className="font-display text-lg font-bold">
            <ColorWords words={["A", "safe", "space,", "bold", "colors", "—", "everyone's", "welcome", "here."]} />
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-extrabold">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("instagram_link_clicked", "footer")}
              className="text-ink underline decoration-brand-yellow decoration-4 underline-offset-4 hover:text-brand-yellow-text"
            >
              Instagram
            </a>
            <a
              href={VINTED_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("vinted_link_clicked", "footer")}
              className="text-ink underline decoration-brand-pink decoration-4 underline-offset-4 hover:text-brand-pink-text"
            >
              Vinted
            </a>
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => captureOutboundClick("contact_email_clicked", "footer")}
              className="underline decoration-brand-purple decoration-4 underline-offset-4 hover:text-brand-purple-text"
            >
              {EMAIL}
            </a>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            © {new Date().getFullYear()} Isar Things Shop
          </p>
        </div>
      </footer>
    </div>
  );
}
