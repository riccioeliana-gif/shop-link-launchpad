import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";
import { z } from "zod";
import { joinWaitlist } from "@/lib/waitlist";
import logoUrl from "@/assets/isar-logo-clear.webp";
import ginghamPouchUrl from "@/assets/carousel/gingham-pouch.webp";
import teddyHeartPouchUrl from "@/assets/carousel/teddy-heart-pouch.webp";
import heartEarringsUrl from "@/assets/carousel/heart-earrings.webp";
import sageBagUrl from "@/assets/carousel/sage-bag.webp";
import heartEarringWornUrl from "@/assets/carousel/heart-earring-worn.webp";
import smileyEarringWornUrl from "@/assets/carousel/smiley-earring-worn.webp";
import purpleNecklaceUrl from "@/assets/carousel/purple-heart-necklace.webp";

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
const EMAIL = "info@isarthingshop.com";

const VINTED_ITEM_URLS = {
  heartPouch: "https://www.vinted.it/items/10048925795-makeup-pouch-with-burgundyred-heart-details",
  heartEarrings: "https://www.vinted.it/items/10046950419-gold-earrings-with-brown-heart-stone",
  purpleNecklace: "https://www.vinted.it/items/10003869656-purple-necklace-with-hearths",
};

// Swap each `href` for the direct Instagram post URL when you have it.
// `product` groups Vinted clicks by item even when two photos show the same
// piece (e.g. the product shot and the "worn" shot). Only Vinted links have it.
type CarouselItem = { id: string; src: string; alt: string; href: string; product?: string };

const CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: "gingham-pouch",
    src: ginghamPouchUrl,
    alt: "Red and pink gingham makeup pouch on a bathtub edge",
    href: INSTAGRAM_URL,
  },
  {
    id: "heart-earrings",
    src: heartEarringsUrl,
    alt: "Gold and chocolate-brown heart earrings on a lilac background",
    href: VINTED_ITEM_URLS.heartEarrings,
    product: "heart earrings",
  },
  {
    id: "purple-heart-necklace",
    src: purpleNecklaceUrl,
    alt: "Lilac heart-shaped bead necklace with gold details, worn over a white t-shirt",
    href: VINTED_ITEM_URLS.purpleNecklace,
    product: "purple heart necklace",
  },
  {
    id: "teddy-heart-pouch",
    src: teddyHeartPouchUrl,
    alt: "Cream teddy-fleece pouch with red hearts, held in one hand",
    href: VINTED_ITEM_URLS.heartPouch,
    product: "teddy heart pouch",
  },
  {
    id: "heart-earring-worn",
    src: heartEarringWornUrl,
    alt: "Gold and brown heart earring worn on an ear",
    href: VINTED_ITEM_URLS.heartEarrings,
    product: "heart earrings",
  },
  {
    id: "sage-bag",
    src: sageBagUrl,
    alt: "Sage green crescent shoulder bag worn with a pink skirt",
    href: INSTAGRAM_URL,
  },
  {
    id: "smiley-earring-worn",
    src: smileyEarringWornUrl,
    alt: "Gold smiley-face drop earring worn on an ear",
    href: INSTAGRAM_URL,
  },
];

const HEADLINE_INTRO = ["Clothes,", "things", "&", "little", "treasures", "made", "for"];
const HEADLINE_LINES = ["All kinds of beautiful."];

const CAROUSEL_INTERVAL_MS = 4500;

const CAROUSEL_COLORS = ["yellow", "pink", "purple", "blue", "green", "red"] as const;

const BRAND_TEXT_COLORS = [
  "text-brand-blue",
  "text-brand-pink-text",
  "text-brand-green",
  "text-brand-purple-text",
  "text-brand-yellow-text",
  "text-brand-red",
];

function ColorWords({ words, offset = 0 }: { words: string[]; offset?: number }) {
  return (
    <>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span
            className={`color-word ${BRAND_TEXT_COLORS[(index + offset) % BRAND_TEXT_COLORS.length]}`}
          >
            {word}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

type WaitlistState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; message: string };

function WaitlistForm({
  onJoin,
  onEvent,
}: {
  onJoin: (email: string) => void;
  onEvent?: (
    event: "waitlist_submit_clicked" | "waitlist_error",
    properties?: Record<string, string>,
  ) => void;
}) {
  const [state, setState] = useState<WaitlistState>({ status: "idle" });
  const [email, setEmail] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.status === "submitting") return;
    onEvent?.("waitlist_submit_clicked");
    setState({ status: "submitting" });
    try {
      await joinWaitlist({ data: email });
      onJoin(email.trim().toLowerCase());
      setState({ status: "done" });
    } catch (error) {
      const invalidEmail =
        error instanceof z.ZodError || (error instanceof Error && /email/i.test(error.message));
      onEvent?.("waitlist_error", { reason: invalidEmail ? "invalid_email" : "server" });
      const message = invalidEmail
        ? "Hmm, that email doesn't look right — mind checking it?"
        : "Something went wrong. Please try again in a moment!";
      setState({ status: "error", message });
    }
  };

  if (state.status === "done") {
    return (
      <div
        className="toy-piece rounded-[2.5rem] bg-brand-green p-8 text-center"
        style={{
          ["--piece-border" as string]: "var(--ink)",
          ["--piece-shadow" as string]: "var(--brand-yellow)",
        }}
        role="status"
      >
        <span className="mx-auto grid size-16 place-items-center rounded-full border-[3px] border-ink bg-card">
          <svg
            viewBox="0 0 24 24"
            className="size-8 text-ink"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
        </span>
        <h2 className="mt-4 font-display text-3xl font-bold text-ink">You're on the list! 🎉</h2>
        <p className="mt-2 font-semibold text-ink/80">
          We'll drop you a line as soon as something exciting lands.
        </p>
      </div>
    );
  }

  return (
    <div
      className="toy-piece rounded-[2.5rem] bg-card p-8 text-center sm:p-10"
      style={{
        ["--piece-border" as string]: "var(--brand-blue)",
        ["--piece-shadow" as string]: "var(--brand-blue)",
      }}
    >
      <span className="mx-auto grid size-16 place-items-center rounded-full border-[3px] border-ink bg-brand-blue">
        <svg
          viewBox="0 0 24 24"
          className="size-8 text-ink"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </span>
      <h2 className="mt-4 font-display text-3xl font-bold text-brand-blue-text sm:text-4xl">
        Get notified of new drops
      </h2>
      <p className="mx-auto mt-2 max-w-sm font-semibold text-muted-foreground">
        Leave your email and we'll let you know when new treasures arrive — no spam, just the good
        stuff.
      </p>
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row"
        noValidate
      >
        <label className="sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state.status === "error") setState({ status: "idle" });
          }}
          aria-invalid={state.status === "error"}
          className="min-w-0 flex-1 rounded-2xl border-2 border-ink bg-background px-4 py-3 font-semibold text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-brand-blue/40"
        />
        <button
          type="submit"
          disabled={state.status === "submitting"}
          className="toy-block whitespace-nowrap rounded-2xl border-2 border-brand-blue bg-brand-blue px-5 py-3 text-sm font-extrabold text-ink disabled:cursor-wait disabled:opacity-70 sm:text-base"
          style={{ ["--block-shadow" as string]: "var(--brand-blue-text)" }}
        >
          {state.status === "submitting" ? "Sending…" : "Notify me →"}
        </button>
      </form>
      {state.status === "error" ? (
        <p className="mt-3 text-sm font-extrabold text-brand-red" role="alert">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function Index() {
  const posthog = usePostHog();
  const trackRef = useRef<HTMLUListElement>(null);
  const waitlistSectionRef = useRef<HTMLElement>(null);
  const autoplayPaused = useRef(false);

  const scrollCarousel = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const atStart = track.scrollLeft <= 4;
    if (direction === 1 && atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
    else if (direction === -1 && atStart)
      track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
    else track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  // Advance one photo every few seconds. Pauses while the visitor hovers, touches
  // or focuses the carousel, and never runs for people who prefer reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!autoplayPaused.current && !document.hidden) scrollCarousel(1);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const track = (event: string, properties?: Record<string, string | number>) => {
    if (!import.meta.env.VITE_PUBLIC_POSTHOG_KEY || !import.meta.env.VITE_PUBLIC_POSTHOG_HOST) {
      return;
    }
    posthog.capture(event, properties);
  };

  const captureOutboundClick = (
    event:
      | "instagram_link_clicked"
      | "instagram_post_clicked"
      | "vinted_item_clicked"
      | "vinted_link_clicked"
      | "contact_email_clicked",
    placement: "hero" | "carousel" | "content_card" | "footer",
    properties?: Record<string, string | number>,
  ) => track(event, { placement, ...properties });

  // First time a visitor reaches the email form, so PostHog can compare
  // waitlist form views against actual signups.
  useEffect(() => {
    const section = waitlistSectionRef.current;
    if (!section || !("IntersectionObserver" in window)) return;

    let tracked = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!tracked && entry?.isIntersecting) {
          tracked = true;
          track("waitlist_form_viewed");
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // First time a visitor moves the carousel themselves (autoplay doesn't count).
  const carouselInteracted = useRef(false);
  const trackCarouselInteraction = (method: "arrow" | "swipe") => {
    if (carouselInteracted.current) return;
    carouselInteracted.current = true;
    track("carousel_interacted", { method });
  };

  // How far down the page visitors get: fires once per threshold per page view.
  useEffect(() => {
    const thresholds = [25, 50, 75, 100];
    const reached = new Set<number>();
    const onScroll = () => {
      const { scrollHeight } = document.documentElement;
      const depth = ((window.scrollY + window.innerHeight) / scrollHeight) * 100;
      for (const threshold of thresholds) {
        if (depth >= threshold - 1 && !reached.has(threshold)) {
          reached.add(threshold);
          track("scroll_depth", { percent: threshold });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="tile-page min-h-screen overflow-x-hidden bg-background font-body text-foreground">
      {/* ── Hero ───────────────────────────────────────────── */}
      <main>
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-12 md:grid-cols-[1.25fr_1fr]">
          <div className="relative">
            <img
              src={logoUrl}
              alt="Isar Things Shop"
              width={480}
              height={313}
              className="mb-6 h-auto w-44 sm:w-56"
            />
            <h1 className="font-display text-4xl font-bold leading-[1.15] sm:text-5xl">
              <ColorWords words={HEADLINE_INTRO} />
              {HEADLINE_LINES.map((line, index) => (
                <span key={line} className="block">
                  <ColorWords
                    words={line.split(" ")}
                    offset={
                      HEADLINE_INTRO.length +
                      HEADLINE_LINES.slice(0, index).reduce(
                        (count, previous) => count + previous.split(" ").length,
                        0,
                      )
                    }
                  />
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-md text-lg font-semibold text-muted-foreground">
              A colorful corner for unique pre-loved finds — every piece picked with a smile. Once
              they're gone, they won't be coming back!
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

          <div
            className="min-w-0"
            role="region"
            aria-roledescription="carousel"
            aria-label="Latest finds from Instagram"
            onPointerEnter={() => (autoplayPaused.current = true)}
            onPointerLeave={() => (autoplayPaused.current = false)}
            onFocus={() => (autoplayPaused.current = true)}
            onBlur={() => (autoplayPaused.current = false)}
          >
            <div className="relative">
              <ul
                ref={trackRef}
                onTouchMove={() => trackCarouselInteraction("swipe")}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {CAROUSEL_ITEMS.map((item, index) => {
                  const color = CAROUSEL_COLORS[index % CAROUSEL_COLORS.length];
                  return (
                    <li
                      key={item.src}
                      className="w-full shrink-0 snap-center flex justify-center px-4 pb-6 pt-3"
                    >
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          const isVinted = item.href.includes("vinted.");
                          captureOutboundClick(
                            isVinted ? "vinted_item_clicked" : "instagram_post_clicked",
                            "carousel",
                            isVinted
                              ? {
                                  post_index: index + 1,
                                  photo: item.id,
                                  ...(item.product ? { product: item.product } : {}),
                                }
                              : { post_index: index + 1, photo: item.id },
                          );
                        }}
                        className={`toy-piece block w-full max-w-[19rem] sm:max-w-[24rem] lg:max-w-[28rem] overflow-hidden rounded-[2rem] bg-card ${index % 2 === 0 ? "-rotate-1" : "rotate-1"}`}
                        style={{
                          ["--piece-border" as string]: `var(--brand-${color})`,
                          ["--piece-shadow" as string]: `var(--brand-${color})`,
                        }}
                      >
                        <img
                          src={item.src}
                          alt={item.alt}
                          width={720}
                          height={900}
                          loading={index === 0 ? "eager" : "lazy"}
                          decoding="async"
                          draggable={false}
                          className="aspect-[4/5] w-full object-cover"
                        />
                        {item.href.includes("vinted.") ? (
                          <span className="absolute left-3 top-3 rounded-full border-2 border-ink bg-brand-pink px-3 py-1 text-sm font-extrabold text-ink">
                            Buy on Vinted →
                          </span>
                        ) : null}
                      </a>
                    </li>
                  );
                })}
                <li className="w-full shrink-0 snap-center flex justify-center px-4 pb-6 pt-3">
                  <a
                    href={VINTED_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => captureOutboundClick("vinted_link_clicked", "carousel")}
                    className="toy-piece flex aspect-[4/5] w-full max-w-[19rem] sm:max-w-[24rem] lg:max-w-[28rem] flex-col items-center justify-center gap-4 rounded-[2rem] bg-brand-pink p-6 text-center"
                    style={{
                      ["--piece-border" as string]: "var(--ink)",
                      ["--piece-shadow" as string]: "var(--brand-yellow)",
                    }}
                  >
                    <span className="grid size-24 place-items-center rounded-3xl border-[3px] border-ink bg-card">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-12 text-ink"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 7h12l1.5 13h-15z" />
                        <path d="M9 10V6a3 3 0 0 1 6 0v4" />
                      </svg>
                    </span>
                    <span className="font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
                      Every item is on Vinted
                    </span>
                    <span className="mt-2 rounded-2xl border-2 border-ink bg-card px-5 py-2.5 text-base font-extrabold text-ink shadow-[0_5px_0_0_var(--ink)]">
                      Browse the shop →
                    </span>
                  </a>
                </li>
                <li className="w-full shrink-0 snap-center flex justify-center px-4 pb-6 pt-3">
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => captureOutboundClick("instagram_link_clicked", "carousel")}
                    className="toy-piece flex aspect-[4/5] w-full max-w-[19rem] sm:max-w-[24rem] lg:max-w-[28rem] flex-col items-center justify-center gap-4 rounded-[2rem] bg-brand-yellow p-6 text-center"
                    style={{
                      ["--piece-border" as string]: "var(--ink)",
                      ["--piece-shadow" as string]: "var(--brand-pink)",
                    }}
                  >
                    <span className="grid size-24 place-items-center rounded-full border-[3px] border-ink bg-card">
                      <svg
                        viewBox="0 0 24 24"
                        className="size-12 text-ink"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="5" />
                        <circle cx="12" cy="12" r="4" />
                        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
                      </svg>
                    </span>
                    <span className="font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
                      More on Instagram
                    </span>
                    <span className="mt-2 rounded-2xl border-2 border-ink bg-card px-5 py-2.5 text-base font-extrabold text-ink shadow-[0_5px_0_0_var(--ink)]">
                      @isar_things_shop →
                    </span>
                  </a>
                </li>
              </ul>
              <span className="pointer-events-none absolute bottom-0 left-1/2 z-10 w-max max-w-[92%] -translate-x-1/2 -rotate-2 rounded-full border-2 border-brand-purple bg-card px-5 py-2 text-center text-base font-extrabold text-ink shadow-[0_4px_0_0_var(--brand-purple)] sm:text-lg">
                Pre-loved, unique, carefully selected
              </span>
            </div>
            <div className="mt-6 flex justify-center gap-4">
              {([-1, 1] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => {
                    trackCarouselInteraction("arrow");
                    scrollCarousel(direction);
                  }}
                  aria-label={direction === -1 ? "Previous photo" : "Next photo"}
                  className="toy-block grid size-12 place-items-center rounded-full border-2 border-brand-purple bg-card text-xl font-extrabold text-ink"
                  style={{ ["--block-shadow" as string]: "var(--brand-purple)" }}
                >
                  {direction === -1 ? "←" : "→"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Shop / follow / contact cards ─────────────────────── */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            <ColorWords words={["Shop,", "follow", "or", "say", "hi"]} />
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {/* Square — Vinted */}
            <a
              href={VINTED_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("vinted_link_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{
                ["--piece-border" as string]: "var(--brand-pink)",
                ["--piece-shadow" as string]: "var(--brand-pink)",
              }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-2xl border-[3px] border-ink bg-brand-pink transition-transform group-hover:scale-110">
                <svg
                  viewBox="0 0 24 24"
                  className="size-9 text-ink"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 7h12l1.5 13h-15z" />
                  <path d="M9 10V6a3 3 0 0 1 6 0v4" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-pink-text">
                Shop on Vinted
              </h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Browse the full collection &amp; grab the latest drop.
              </p>
              <span className="mt-4 inline-block text-sm font-extrabold text-ink">
                Visit our Vinted shop →
              </span>
            </a>

            {/* Circle — Instagram */}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => captureOutboundClick("instagram_link_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{
                ["--piece-border" as string]: "var(--brand-yellow)",
                ["--piece-shadow" as string]: "var(--brand-yellow)",
              }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-full border-[3px] border-ink bg-brand-yellow transition-transform group-hover:scale-110">
                <svg
                  viewBox="0 0 24 24"
                  className="size-9 text-ink"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-yellow-text">
                Instagram
              </h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Daily drops, styling inspo &amp; behind the scenes.
              </p>
              <span className="mt-4 inline-block text-sm font-extrabold text-ink">
                @isar_things_shop →
              </span>
            </a>

            {/* Star — Say hello */}
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => captureOutboundClick("contact_email_clicked", "content_card")}
              className="toy-piece group rounded-[2.5rem] bg-card p-8 text-center"
              style={{
                ["--piece-border" as string]: "var(--brand-purple)",
                ["--piece-shadow" as string]: "var(--brand-purple)",
              }}
            >
              <span className="mx-auto grid size-20 place-items-center rounded-full border-[3px] border-ink bg-brand-purple transition-transform group-hover:scale-110">
                <svg
                  viewBox="0 0 24 24"
                  className="size-9 text-ink"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <path d="m2 7 10 7 10-7" />
                </svg>
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-purple-text">
                Say hello
              </h3>
              <p className="mt-2 font-semibold text-muted-foreground">
                Questions, size checks or just a hi — we reply with a smile.
              </p>
              <span className="mt-4 inline-block break-all text-sm font-extrabold text-ink">
                {EMAIL} →
              </span>
            </a>
          </div>
        </section>

        {/* ── Waitlist ───────────────────────────────────────── */}
        <section ref={waitlistSectionRef} className="mx-auto max-w-2xl px-4 pb-20 sm:px-6">
          <WaitlistForm
            onJoin={(email) =>
              track("waitlist_joined", { email_domain: email.split("@")[1] ?? "" })
            }
            onEvent={track}
          />
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
            <ColorWords
              words={[
                "A",
                "safe",
                "space,",
                "bold",
                "colors",
                "—",
                "everyone's",
                "welcome",
                "here.",
              ]}
            />
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
