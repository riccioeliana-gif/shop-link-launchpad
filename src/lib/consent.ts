/**
 * Cookie consent state, shared between the banner (src/components/cookie-consent.tsx)
 * and the PostHog root (src/routes/__root.tsx).
 *
 * PostHog is only mounted after an explicit "granted" decision, so nothing
 * (autocapture, session replay) runs before the visitor opts in.
 */

export type CookieConsent = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "isar-cookie-consent";

/** Fired on `window` whenever the consent decision changes. */
export const CONSENT_CHANGED_EVENT = "isar-cookie-consent-changed";

/** Fired on `window` to make the banner visible again (e.g. footer "Cookie" link). */
export const CONSENT_OPEN_EVENT = "isar-open-cookie-banner";

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeCookieConsent(consent: CookieConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // Private mode etc. — consent simply won't persist across visits.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT));
}

export function openCookieBanner(): void {
  window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT));
}
