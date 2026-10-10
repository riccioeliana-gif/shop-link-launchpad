import { usePostHog } from "posthog-js/react";

/**
 * Returns a `track(event, properties)` function that sends a PostHog event.
 * It is a no-op until the visitor accepts the cookie banner (PostHog is only
 * mounted after "granted", see src/routes/__root.tsx) or when PostHog isn't
 * configured. Never pass personal data as properties.
 */
export function useTrack() {
  const posthog = usePostHog();
  return (event: string, properties?: Record<string, string | number>) => {
    if (
      !posthog ||
      !import.meta.env.VITE_PUBLIC_POSTHOG_KEY ||
      !import.meta.env.VITE_PUBLIC_POSTHOG_HOST
    ) {
      return;
    }
    posthog.capture(event, properties);
  };
}
