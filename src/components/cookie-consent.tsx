import { useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  CONSENT_OPEN_EVENT,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/consent";

/**
 * A tiny, discreet consent banner. Matches the site's toy style but stays
 * out of the way: bottom corner pill, one-line explanation, two taps.
 *
 * PostHog itself is mounted by <PostHogRoot> only after "granted" — this
 * component purely collects the decision.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  // Hidden until the client confirms a decision is missing (avoids hydration
  // mismatches and keeps the banner away for visitors who already chose).
  useEffect(() => {
    setVisible(readCookieConsent() === null);
    const onChanged = () => setVisible(readCookieConsent() === null);
    const onOpen = () => setVisible(true);
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
      window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
    };
  }, []);

  if (!visible) return null;

  return (
    <aside
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[24rem] -translate-x-1/2 sm:left-4 sm:translate-x-0"
    >
      <div
        className="toy-piece rounded-[1.75rem] bg-card px-5 py-4"
        style={{
          ["--piece-border" as string]: "var(--ink)",
          ["--piece-shadow" as string]: "var(--brand-purple)",
        }}
      >
        <p className="text-xs font-semibold leading-relaxed text-muted-foreground sm:text-sm">
          <span aria-hidden="true">🍪</span> We use a few little cookies (via PostHog and Metricool)
          to learn what you love about the shop. No ads, nothing sold.
        </p>
        <div className="mt-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => writeCookieConsent("denied")}
            className="rounded-xl px-2 py-1 text-xs font-extrabold text-muted-foreground underline decoration-2 underline-offset-2 hover:text-ink"
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => writeCookieConsent("granted")}
            className="toy-block whitespace-nowrap rounded-xl border-2 border-brand-green bg-brand-green px-4 py-2 text-xs font-extrabold text-ink sm:text-sm"
            style={{ ["--block-shadow" as string]: "var(--brand-green)" }}
          >
            Sure! 🍪
          </button>
        </div>
      </div>
    </aside>
  );
}
