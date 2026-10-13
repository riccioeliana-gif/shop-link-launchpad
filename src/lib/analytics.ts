import { useCallback, useEffect, useRef, type RefObject } from "react";
import { usePostHog } from "posthog-js/react";

const SCROLL_DEPTHS = [25, 50, 75, 100] as const;
export type ScrollDepth = (typeof SCROLL_DEPTHS)[number];

type Placement = "hero" | "carousel" | "content_card" | "footer";
type CarouselClick = { placement: "carousel"; post_index: number; photo: string };

/**
 * Every event the site sends to PostHog, with its properties. Renaming one
 * splits its history in PostHog, so add new names rather than changing old
 * ones. scripts/posthog-dashboard.ts charts these same names.
 */
export type AnalyticsEvents = {
  // Outbound links
  vinted_link_clicked: { placement: Placement };
  instagram_link_clicked: { placement: Placement };
  contact_email_clicked: { placement: Placement };
  // `product` groups clicks on two photos of the same piece.
  vinted_item_clicked: CarouselClick & { product?: string };
  instagram_post_clicked: CarouselClick;
  // Home page
  carousel_interacted: { method: "arrow" | "swipe" };
  scroll_depth: { percent: ScrollDepth };
  home_blog_post_clicked: { slug: string };
  home_blog_link_clicked: { placement: "blog_section" | "footer" };
  // Waitlist
  waitlist_form_viewed: undefined;
  waitlist_submit_clicked: undefined;
  waitlist_error: { reason: "invalid_email" | "server" };
  waitlist_joined: { email_domain: string };
  // Blog
  blog_post_clicked: { slug: string; position: number };
  blog_post_viewed: { slug: string };
  blog_post_read: { slug: string; percent: ScrollDepth };
  blog_link_clicked: { slug: string; domain: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

/** Sends one event; events without properties take none. */
export type Track = <E extends AnalyticsEventName>(
  event: E,
  ...properties: AnalyticsEvents[E] extends undefined ? [] : [AnalyticsEvents[E]]
) => void;

/**
 * Returns a `track(event, properties)` function that sends a PostHog event.
 * It is a no-op until the visitor accepts the cookie banner (PostHog is only
 * mounted after "granted", see src/routes/__root.tsx) or when PostHog isn't
 * configured. Never pass personal data as properties.
 */
export function useTrack(): Track {
  const posthog = usePostHog();
  return useCallback<Track>(
    (event, ...[properties]) => {
      if (
        !posthog ||
        !import.meta.env.VITE_PUBLIC_POSTHOG_KEY ||
        !import.meta.env.VITE_PUBLIC_POSTHOG_HOST
      ) {
        return;
      }
      posthog.capture(event, properties);
    },
    [posthog],
  );
}

/**
 * Calls `onDepth` once per threshold (25, 50, 75, 100) as the visitor scrolls.
 * Without `target`, depth is measured on the whole page, from the first scroll.
 * With `target`, it is measured on that element (100 = its last line is in
 * view) and checked straight away, so a short article counts on arrival.
 * Thresholds start over whenever `resetKey` changes (e.g. a new blog post).
 */
export function useScrollDepth(
  onDepth: (percent: ScrollDepth) => void,
  options: { target?: RefObject<HTMLElement | null>; resetKey?: unknown } = {},
) {
  const { target, resetKey } = options;
  const latestOnDepth = useRef(onDepth);
  useEffect(() => {
    latestOnDepth.current = onDepth;
  });

  useEffect(() => {
    const reached = new Set<ScrollDepth>();
    const measure = (): number | null => {
      if (!target) {
        const { scrollHeight } = document.documentElement;
        return ((window.scrollY + window.innerHeight) / scrollHeight) * 100;
      }
      const element = target.current;
      if (!element) return null;
      const { top, height } = element.getBoundingClientRect();
      return ((window.innerHeight - top) / height) * 100;
    };
    const onScroll = () => {
      const depth = measure();
      if (depth === null) return;
      for (const threshold of SCROLL_DEPTHS) {
        if (depth >= threshold - 1 && !reached.has(threshold)) {
          reached.add(threshold);
          latestOnDepth.current(threshold);
        }
      }
    };
    if (target) onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [target, resetKey]);
}
