/**
 * Tab-session flags (sessionStorage) that coordinate the waitlist popup with
 * the waitlist forms: the popup shows at most once per tab session and never
 * to a visitor who already joined — wherever they joined (home section,
 * /waitlist page, or the popup itself).
 */

const SHOWN_KEY = "isar-waitlist-popup-shown";
const JOINED_KEY = "isar-waitlist-joined";

export function readWaitlistFlag(key: "shown" | "joined"): boolean {
  try {
    return window.sessionStorage.getItem(key === "shown" ? SHOWN_KEY : JOINED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeWaitlistFlag(key: "shown" | "joined"): void {
  try {
    window.sessionStorage.setItem(key === "shown" ? SHOWN_KEY : JOINED_KEY, "1");
  } catch {
    // Private mode etc. — the popup simply re-arms next page load.
  }
}

/** Call wherever a signup succeeds, so the popup never nags that visitor. */
export function markWaitlistJoined(): void {
  writeWaitlistFlag("joined");
}
