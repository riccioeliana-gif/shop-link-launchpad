import { createFileRoute, Link } from "@tanstack/react-router";
import { ColorWords } from "./index";
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Isar Things Shop" },
      {
        name: "description",
        content:
          "What we collect at isarthingshop.com: anonymous analytics (PostHog, EU-hosted) and your email if you join the waitlist. No ads, nothing sold.",
      },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "20 February 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-left font-semibold text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPage() {
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
          <ColorWords words={["Privacy,", "the", "friendly", "version."]} />
        </h1>
        <p className="mt-3 text-sm font-bold text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <Section title="What we collect">
          <p>
            <strong className="text-ink">Website visits:</strong> we use PostHog to understand which
            pages and products people like. Data is anonymous, hosted in the EU, and only recorded
            after you accept it in the cookie banner. Nothing is used for advertising.
          </p>
          <p>
            <strong className="text-ink">Waitlist:</strong> if you join, we keep your email to tell
            you when new treasures arrive. Nothing else — no newsletters you didn't ask for, and you
            can unsubscribe any time.
          </p>
          <p>
            <strong className="text-ink">Saying hello:</strong> if you email us, we keep the
            conversation so we can help you. We never share it with anyone.
          </p>
        </Section>

        <Section title="What we don't do">
          <p>
            No ads. No selling or renting your data. No tracking you across other websites. No dark
            patterns — the cookie banner means what it says.
          </p>
        </Section>

        <Section title="Your choices">
          <p>
            You can change your cookie decision any time via the “Cookies” link in the footer of the
            homepage. You can also ask us to delete your waitlist email — just write to{" "}
            <a
              href="mailto:info@isarthingshop.com"
              className="font-extrabold text-ink underline decoration-brand-purple decoration-4 underline-offset-4 hover:text-brand-purple-text"
            >
              info@isarthingshop.com
            </a>
            .
          </p>
        </Section>

        <Section title="The short version">
          <p className="rounded-3xl border-2 border-ink bg-brand-green p-5 text-ink">
            We look at anonymous numbers to make the shop nicer, we keep your email only if you give
            it to us, and we never sell anything to anyone. That's it. 💚
          </p>
        </Section>

        <p className="mt-12 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
          © {new Date().getFullYear()} Isar Things Shop
        </p>
      </div>
    </div>
  );
}
