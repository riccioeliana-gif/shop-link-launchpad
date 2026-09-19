import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { KvNamespace } from "./kv";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Reads the Cloudflare KV binding (`WAITLIST`) injected by the runtime.
 * In production, Nitro sets `globalThis.__env__` from the Worker env.
 * In dev, the Cloudflare dev plugin exposes a wrangler-backed proxy there.
 * Locally without wrangler, `__env__` is undefined and we degrade gracefully.
 */
function getWaitlistKv(): KvNamespace | undefined {
  const env = (globalThis as Record<string, unknown>)["__env__"] as
    Record<string, unknown> | undefined;
  return env?.["WAITLIST"] as KvNamespace | undefined;
}

/**
 * Sends a notification email to the shop owner via Resend.
 * Fire-and-forget: failures are logged but never block the signup.
 * In Resend test mode (no verified domain), the email can only be sent
 * to the account owner's own address — which is exactly what we want here.
 */
async function notifyOwner(email: string): Promise<void> {
  const env = (globalThis as Record<string, unknown>)["__env__"] as
    Record<string, unknown> | undefined;
  const apiKey = env?.["RESEND_API_KEY"] as string | undefined;
  const ownerEmail = env?.["OWNER_EMAIL"] as string | undefined;
  if (!apiKey || !ownerEmail) {
    console.warn("RESEND_API_KEY/OWNER_EMAIL not set — owner notification skipped");
    return;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Isar Things Shop <info@isarthingshop.com>",
        to: ownerEmail,
        subject: `New waitlist signup: ${email}`,
        text: `Someone joined the waitlist!\n\nEmail: ${email}\nTime: ${new Date().toISOString()}`,
      }),
    });
    if (!response.ok) {
      console.warn(`Resend notification failed (${response.status}): ${await response.text()}`);
    }
  } catch (error) {
    console.warn("Resend notification error:", error);
  }
}

export const joinWaitlist = createServerFn({ method: "POST" })
  .validator((email: unknown) => emailSchema.parse(email))
  .handler(async ({ data }) => {
    const kv = getWaitlistKv();
    if (!kv) {
      // KV binding missing (e.g. `vite dev` without the wrangler proxy):
      // keep the UX positive but make the situation visible in logs.
      console.warn("WAITLIST KV binding not available — email not stored");
      return { ok: true as const };
    }
    // Key includes a timestamp so re-subscribing doesn't overwrite history.
    const key = `waitlist/${Date.now()}/${data}`;
    await kv.put(key, JSON.stringify({ email: data, at: new Date().toISOString() }));
    await notifyOwner(data);
    return { ok: true as const };
  });
