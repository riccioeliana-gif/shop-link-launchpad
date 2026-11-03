import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTrack } from "@/lib/analytics";
import { markWaitlistJoined, readWaitlistFlag, writeWaitlistFlag } from "@/lib/waitlist-flags";
import { WaitlistForm } from "@/components/waitlist-form";

/** Time after page load before the popup opens. */
const SHOW_AFTER_MS = 3_000;
/** Grace period to read the success message before the dialog closes itself. */
const AUTO_CLOSE_MS = 4_000;

type DismissMethod = "close_button" | "backdrop" | "escape";

/**
 * Timed waitlist dialog for the home page. Analytics show most visitors never
 * scroll far enough to see the form section, so 3s after the page loads the
 * form opens in a dialog, without waiting for a scroll. Shown at most once per tab session,
 * never to visitors who already joined, and never while the waitlist section
 * itself is on screen.
 */
export function WaitlistPopup() {
  const track = useTrack();
  const [open, setOpen] = useState(false);
  const joinedRef = useRef(false);
  const dismissMethod = useRef<DismissMethod>("close_button");

  // Open the popup SHOW_AFTER_MS after the page loads, no scroll needed.
  useEffect(() => {
    if (readWaitlistFlag("shown") || readWaitlistFlag("joined")) return;

    const timer = window.setTimeout(() => {
      // Don't interrupt someone who is already looking at the form section,
      // or who signed up in the meantime.
      const section = document.getElementById("waitlist");
      if (section) {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) return;
      }
      if (readWaitlistFlag("joined")) return;
      writeWaitlistFlag("shown");
      setOpen(true);
      track("waitlist_popup_shown");
    }, SHOW_AFTER_MS);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !joinedRef.current) {
      track("waitlist_popup_dismissed", { method: dismissMethod.current });
    }
    dismissMethod.current = "close_button";
    setOpen(nextOpen);
  };

  const handleJoin = (email: string) => {
    joinedRef.current = true;
    markWaitlistJoined();
    track("waitlist_joined", { email_domain: email.split("@")[1] ?? "", placement: "popup" });
    window.setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={() => (dismissMethod.current = "escape")}
          onInteractOutside={() => (dismissMethod.current = "backdrop")}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2.5rem] border-[3px] border-ink bg-card p-6 shadow-[0_10px_0_0_var(--brand-blue)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:p-8"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-full border-[3px] border-ink bg-brand-pink">
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
          <DialogPrimitive.Title className="mt-4 text-center font-display text-2xl font-bold text-brand-blue-text sm:text-3xl">
            See new drops 24 hours before everyone else
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-center font-semibold text-muted-foreground">
            Sign up and we'll send you first access to new treasures. No spam, just early dibs on
            the good stuff.
          </DialogPrimitive.Description>
          <WaitlistForm
            variant="plain"
            placement="popup"
            accent="pink"
            onJoin={handleJoin}
            onEvent={track}
          />
          <DialogPrimitive.Close
            onClick={() => (dismissMethod.current = "close_button")}
            className="toy-block absolute right-4 top-4 grid size-9 place-items-center rounded-full border-2 border-ink bg-card text-ink"
            style={{ ["--block-shadow" as string]: "var(--ink)" }}
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={3} aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
