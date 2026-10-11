import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { WaitlistForm } from "@/components/waitlist-form";
import { useTrack } from "@/lib/analytics";
import { ColorWords } from "./index";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Join the waitlist | Isar Things Shop" },
      {
        name: "description",
        content:
          "Sign up for the waitlist and get first access to new Isar Things Shop drops, 24 hours before everyone else. No spam, just early dibs.",
      },
    ],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const track = useTrack();

  // The whole page is the form, so the "form viewed" event fires on mount.
  useEffect(() => {
    track("waitlist_form_viewed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <ColorWords words={["Get", "early", "dibs."]} />
        </h1>

        <div className="mt-8">
          <WaitlistForm
            onJoin={(email) =>
              track("waitlist_joined", { email_domain: email.split("@")[1] ?? "" })
            }
            onEvent={track}
          />
        </div>
      </div>
    </div>
  );
}
