import { useState } from "react";
import { z } from "zod";
import type { Track } from "@/lib/analytics";
import { joinWaitlist } from "@/lib/waitlist";

export type WaitlistState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done" }
  | { status: "error"; message: string };

export function WaitlistForm({
  onJoin,
  onEvent,
}: {
  onJoin: (email: string) => void;
  onEvent?: Track;
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
        ? "Hmm, that email doesn't look right. Mind checking it?"
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
          You'll hear about new drops a full day before everyone else.
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
        See new drops 24 hours before everyone else
      </h2>
      <p className="mx-auto mt-2 max-w-sm font-semibold text-muted-foreground">
        Sign up and we'll send you first access to new treasures. No spam, just early dibs on the
        good stuff.
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
