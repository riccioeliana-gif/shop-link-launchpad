import { useEffect } from "react";
import { CONSENT_CHANGED_EVENT, readCookieConsent } from "@/lib/consent";

// Public by design: this hash ships to every visitor's browser, like any analytics ID.
const METRICOOL_HASH = "51d988e53adc15a37e5536ad215cb422";
const METRICOOL_SRC = "https://tracker.metricool.com/resources/be.js";

declare global {
  interface Window {
    beTracker?: { t: (options: { hash: string }) => void };
  }
}

/**
 * Loads the Metricool tracker only after an explicit "granted" cookie decision,
 * same gate as PostHog. Renders nothing.
 */
export function MetricoolTracker() {
  useEffect(() => {
    let loaded = false;

    const load = () => {
      if (loaded || readCookieConsent() !== "granted") return;
      loaded = true;
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = METRICOOL_SRC;
      script.async = true;
      script.onload = () => window.beTracker?.t({ hash: METRICOOL_HASH });
      document.head.appendChild(script);
    };

    load();
    window.addEventListener(CONSENT_CHANGED_EVENT, load);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, load);
  }, []);

  return null;
}
