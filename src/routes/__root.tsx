import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PostHogProvider, usePostHog } from "posthog-js/react";

import appCss from "../styles.css?url";
import logoUrl from "../assets/isar-logo-clear.webp";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CookieConsent } from "../components/cookie-consent";
import { MetricoolTracker } from "../components/metricool-tracker";
import {
  CONSENT_CHANGED_EVENT,
  readCookieConsent,
  type CookieConsent as ConsentDecision,
} from "../lib/consent";

function NotFoundComponent() {
  return (
    <div className="tile-page flex min-h-screen flex-col items-center justify-center bg-background px-4 font-body text-ink">
      <img
        src={logoUrl}
        alt="Isar Things Shop"
        width={480}
        height={313}
        className="mb-8 h-auto w-44 sm:w-56"
      />
      <h1 className="font-display text-7xl font-bold tracking-tight sm:text-8xl">
        <span className="text-brand-red">4</span>
        <span className="text-brand-yellow">0</span>
        <span className="text-brand-blue">4</span>
      </h1>
      <h2 className="mt-4 font-display text-2xl font-bold">This page wandered off…</h2>
      <p className="mt-2 max-w-sm text-center text-sm font-semibold text-muted-foreground">
        The page you're looking for doesn't exist — maybe it already found a new home. But there are
        plenty of things waiting for you in the shop.
      </p>
      <Link
        to="/"
        className="toy-block mt-8 whitespace-nowrap rounded-2xl border-2 border-ink bg-brand-red px-6 py-3 text-sm font-extrabold text-ink sm:text-base"
        style={{ ["--block-shadow" as string]: "var(--brand-red)" }}
      >
        Go home
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const posthog = usePostHog();
  useEffect(() => {
    if (
      import.meta.env.VITE_PUBLIC_POSTHOG_KEY &&
      import.meta.env.VITE_PUBLIC_POSTHOG_HOST &&
      posthog
    ) {
      posthog.captureException(error, {
        boundary: "tanstack_root_error_component",
      });
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error, posthog]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Isar Things Shop" },
      {
        name: "description",
        content: "Clothes, things & little treasures. Carefully selected, unique.",
      },
      { name: "theme-color", content: "#F7F4E9" },
      { name: "p:domain_verify", content: "a2acb02bc13a095ee1aa2310f03ab426" },
      { property: "og:title", content: "Isar Things Shop" },
      {
        property: "og:description",
        content: "Clothes, things & little treasures. Carefully selected, unique.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "/og-image.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap",
      },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png", sizes: "512x512" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogRoot>{children}</PostHogRoot>
        <MetricoolTracker />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}

function PostHogRoot({ children }: { children: ReactNode }) {
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !apiHost) {
    if (import.meta.env.DEV) {
      const missingVariable = !apiKey ? "VITE_PUBLIC_POSTHOG_KEY" : "VITE_PUBLIC_POSTHOG_HOST";
      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      );
    }

    return (
      <>
        {children}
        <CookieConsent />
      </>
    );
  }

  return (
    <ConsentGatedPostHog apiKey={apiKey} apiHost={apiHost}>
      {children}
    </ConsentGatedPostHog>
  );
}

// PostHog (including session replay) only boots after an explicit "granted"
// decision, so no analytics run before the visitor accepts the cookie banner.
function ConsentGatedPostHog({
  apiKey,
  apiHost,
  children,
}: {
  apiKey: string;
  apiHost: string;
  children: ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentDecision | null>(() => readCookieConsent());

  useEffect(() => {
    const onChanged = () => setConsent(readCookieConsent());
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged);
  }, []);

  const analytics =
    consent === "granted" ? (
      <PostHogProvider
        apiKey={apiKey}
        options={{
          api_host: apiHost,
          defaults: "2025-05-24",
          capture_exceptions: true,
          debug: import.meta.env.DEV,
        }}
      >
        {children}
      </PostHogProvider>
    ) : (
      children
    );

  return (
    <>
      {analytics}
      <CookieConsent />
    </>
  );
}
