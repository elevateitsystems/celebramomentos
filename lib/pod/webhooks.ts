// Print shop webhooks. None of Prodigi (v4 callbacks), Gelato or Printful (v1 webhooks) documents a request
// signature we could verify, so a webhook is only a hint:
// 1. the payload only tells us which order changed — the status and tracking are then read from the shop's
//    API with our credentials, never taken from the payload, so a forged event cannot change anything;
// 2. a URL carrying ?token= must carry our secret (POD_WEBHOOK_SECRET, constant-time compare), or it is
//    refused. Addresses registered without a token (e.g. set in the Gelato / Prodigi dashboard as
//    /api/webhooks/gelato) are accepted, but only for orders of this site and at most one re-read per
//    order per minute, so they cannot be used to flood the print shop APIs;
// 3. the event id is stored once, so a repeated delivery has no effect.
// Webhooks never touch payment state.
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Prisma, type PodProvider } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { podMode, printeersConfig, printfulConfig, webhookSecret, webhookUrl } from "./config";
import { PRINTFUL_WEBHOOK_TYPES, printfulWebhook, registerPrintfulWebhook } from "./providers/printful";
import { logPod, syncFulfillment } from "./fulfillment";

const MAX_BODY = 256 * 1024;

export function validWebhookToken(token: string | null, secret: string | null) {
  if (!token || !secret) return false;
  const given = Buffer.from(token);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const text = (value: unknown) => (typeof value === "string" && value ? value : typeof value === "number" ? String(value) : null);
const object = (value: unknown) => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

export type WebhookTarget = { eventId: string | null; type: string | null; providerOrderId: string | null; reference: string | null };

// Pulls the event id and the order identifiers out of each shop's payload.
export function parseWebhook(provider: PodProvider, payload: unknown): WebhookTarget {
  const body = object(payload);
  if (provider === "PRODIGI") {
    // CloudEvents: { id, type: "com.prodigi.order.status.stage.changed#…", data: { order: { id, merchantReference } } }
    // `subject` is the order id as well (CloudEvents subject).
    const order = object(object(body.data).order);
    return { eventId: text(body.id), type: text(body.type), providerOrderId: text(order.id) || text(body.subject), reference: text(order.merchantReference) };
  }
  if (provider === "GELATO") {
    // { id, event: "order_status_updated", orderId, orderReferenceId, fulfillmentStatus, … }
    return { eventId: text(body.id), type: text(body.event), providerOrderId: text(body.orderId), reference: text(body.orderReferenceId) };
  }
  // Printful: { type: "package_shipped", created, data: { order: { id, external_id }, shipment } }
  const order = object(object(body.data).order);
  const type = text(body.type);
  const id = text(order.id);
  return { eventId: type && id ? `${type}:${id}:${text(body.created) || ""}:${text(object(object(body.data).shipment).id) || ""}` : null, type, providerOrderId: id, reference: text(order.external_id) };
}

// Minimum time between two re-reads of the same order triggered by an unauthenticated (token-less) event.
const UNVERIFIED_MIN_INTERVAL_MS = 60_000;

export async function handlePodWebhook(provider: PodProvider, request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token !== null && !validWebhookToken(token, webhookSecret())) {
    logPod("webhook refused: wrong token", { provider });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const verified = token !== null;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const target = parseWebhook(provider, payload);
  // Events about something other than an order (Printful stock / product events, a test ping) are
  // acknowledged so the shop does not keep retrying them; nothing is read or changed.
  if (!target.providerOrderId && !target.reference) return NextResponse.json({ received: true, matched: false, ignored: target.type || "no order in the event" });

  const fulfillment = await prisma.podFulfillment.findFirst({
    where: { provider, OR: [...(target.providerOrderId ? [{ providerOrderId: target.providerOrderId }] : []), ...(target.reference ? [{ reference: target.reference }] : [])] },
    select: { id: true, lastSyncedAt: true },
  });
  // Unknown orders are acknowledged so the shop stops retrying (e.g. orders placed outside this site).
  if (!fulfillment) {
    logPod("webhook for an unknown order", { provider, type: target.type, providerOrderId: target.providerOrderId, reference: target.reference });
    return NextResponse.json({ received: true, matched: false });
  }
  if (!verified && fulfillment.lastSyncedAt && Date.now() - fulfillment.lastSyncedAt.getTime() < UNVERIFIED_MIN_INTERVAL_MS) return NextResponse.json({ received: true, matched: true, throttled: true });

  if (target.eventId) {
    try {
      await prisma.podWebhookEvent.create({ data: { id: `${provider}:${target.eventId}`.slice(0, 300), provider, type: target.type } });
    } catch (reason) {
      if (reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
      throw reason;
    }
  }
  const result = await syncFulfillment(fulfillment.id);
  // A failed read is reported as 503 so the shop delivers the event again later.
  if (!result.ok && result.message && !/no status endpoint/.test(result.message)) {
    logPod("webhook sync failed; the shop will deliver it again", { provider, type: target.type, fulfillmentId: fulfillment.id, message: result.message });
    if (target.eventId) await prisma.podWebhookEvent.delete({ where: { id: `${provider}:${target.eventId}`.slice(0, 300) } }).catch(() => undefined);
    return NextResponse.json({ error: "Status could not be refreshed" }, { status: 503 });
  }
  return NextResponse.json({ received: true, matched: true, status: result.status });
}

// ── Setup state (admin) ──────────────────────────────────────────────────────
// How each shop learns where to send its notifications, and whether that is in place. Never returns a URL
// with its token: the admin only sees "set up" / what to do.
export type WebhookSetup = { provider: PodProvider; state: "ready" | "action_needed" | "unknown"; detail: string };

const publicHttps = (url: string | null) => Boolean(url && /^https:\/\//.test(url) && !/\/\/(localhost|127\.|0\.0\.0\.0)/.test(url));

export async function webhookSetupState(): Promise<WebhookSetup[]> {
  const secret = webhookSecret();
  const printfulUrl = webhookUrl("printful");
  const noSecret = secret ? "" : " (without POD_WEBHOOK_SECRET: accepted as a throttled hint)";
  let printful: WebhookSetup;
  if (!printfulConfig().token) printful = { provider: "PRINTFUL", state: "unknown", detail: "PRINTFUL_PRIVATE_TOKEN is not set" };
  else {
    try {
      const current = await printfulWebhook();
      const matches = current.url === printfulUrl;
      const missing = PRINTFUL_WEBHOOK_TYPES.filter((type) => !current.types.includes(type));
      printful = matches && !missing.length
        ? { provider: "PRINTFUL", state: "ready", detail: `Registered with Printful${noSecret}` }
        : { provider: "PRINTFUL", state: "action_needed", detail: current.url ? (matches ? `Registered, but without: ${missing.join(", ")}` : "Printful sends its updates to another address") : "Not registered with Printful yet" };
    } catch (reason) {
      printful = { provider: "PRINTFUL", state: "unknown", detail: `Printful could not be asked (${reason instanceof Error ? reason.message.slice(0, 120) : "error"})` };
    }
  }
  return [
    { provider: "PRODIGI", state: "ready", detail: `Sent with every order as its callbackUrl, and /api/webhooks/prodigi in the Prodigi dashboard${noSecret}` },
    printful,
    { provider: "GELATO", state: "unknown", detail: `Set in the Gelato dashboard (Developer → Webhooks) to /api/webhooks/gelato${noSecret}; Gelato's API cannot confirm it` },
    { provider: "PRINTEERS", state: printeersConfig(podMode()).webhookSecret ? "ready" : "action_needed", detail: printeersConfig(podMode()).webhookSecret
      ? `Signed webhook secret set (endpoint registered in the Printeers dashboard). Also set the store's "API Callback URL" to /api/webhooks/printeers${noSecret}`
      : `In the Printeers dashboard set the store's "API Callback URL" to /api/webhooks/printeers${noSecret}; optionally add a signed webhook (Settings → Webhooks) and put its secret in PRINTEERS_WEBHOOK_SECRET / PRINTEERS_TEST_WEBHOOK_SECRET` },
  ];
}

// Registers our Printful webhook (the only shop whose webhook is set through its API). Needs a public https
// address: Printful cannot reach a local one.
export async function registerWebhook(provider: PodProvider) {
  if (provider !== "PRINTFUL") throw new Error(`${provider} webhooks are not registered through its API`);
  const url = webhookUrl("printful");
  if (!publicHttps(url)) throw new Error("The site address is not public (https). Register the webhook from the deployed site");
  const result = await registerPrintfulWebhook(url);
  if (result.url !== url) throw new Error("Printful did not keep the webhook address");
  return { ok: true, types: result.types };
}
