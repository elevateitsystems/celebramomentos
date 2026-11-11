// Printeers notifications. Server only. With API v1 there are two mechanisms, and neither can
// be fully verified the way the V2 integration did:
//
// 1. Signed webhooks (Standard Webhooks, https://api-docs.printeers.com/guides/webhooks): headers
//    webhook-id, webhook-timestamp and webhook-signature ("v1,<base64 HMAC-SHA256 of
//    `${id}.${timestamp}.${body}`>", keyed with the base64 part of the "whsec_…" secret of the
//    endpoint registered in the Printeers Dashboard). The signature is verified here. But the event
//    only names a V2 reference (`Order_…`, `Shipment_…`), which the V1 API cannot look up, so a
//    verified event is used as a "something changed" hint: the open Printeers print orders of this
//    environment are re-read from the V1 API (a handful at most). Delivery is at-least-once and
//    unordered, so events are de-duplicated by webhook-id.
// 2. The legacy "order updated" callback (https://api-docs.printeers.com/guides/legacy-webhooks), the
//    one V1 was built with: an HTTP GET to the store's "API Callback URL" with order_reference,
//    environment, store_code… in the query string. It carries NO signature: the notification is only a
//    hint (the order's state is always read back from the API). A URL with ?token= must carry
//    POD_WEBHOOK_SECRET; without a token it is accepted at most once a minute per order.
// Neither ever touches payment state.
import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { podMode, printeersConfig, webhookSecret } from "../config";
import { syncFulfillment } from "../fulfillment";
import { validWebhookToken } from "../webhooks";

const TOLERANCE_SECONDS = 5 * 60;
const MAX_BODY = 256 * 1024;
// Open print orders re-read per signed event.
const MAX_REFRESH = 25;

export function verifyStandardWebhook(input: { id: string | null; timestamp: string | null; signature: string | null; body: string; secret: string | null; now?: number }) {
  const { id, timestamp, signature, body, secret } = input;
  if (!id || !timestamp || !signature || !secret) return false;
  const seconds = Number(timestamp);
  const now = Math.floor((input.now ?? Date.now()) / 1000);
  if (!Number.isFinite(seconds) || Math.abs(now - seconds) > TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  // The header can list several signatures ("v1,abc v1,def") during secret rotation.
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const modeName = () => (podMode() === "live" ? "live" : "draft");

// Re-reads Printeers print orders that can still change. Returns false when any read failed.
async function refreshOpenOrders() {
  const open = await prisma.podFulfillment.findMany({
    where: { provider: "PRINTEERS", mode: modeName(), providerOrderId: { not: null }, status: { in: ["SUBMITTED", "IN_PRODUCTION"] } },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
    take: MAX_REFRESH,
  });
  let ok = true;
  for (const fulfillment of open) {
    const result = await syncFulfillment(fulfillment.id);
    if (!result.ok) ok = false;
  }
  return { ok, count: open.length };
}

// Signed webhook (POST).
export async function handlePrinteersWebhook(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const id = request.headers.get("webhook-id");
  if (!verifyStandardWebhook({ id, timestamp: request.headers.get("webhook-timestamp"), signature: request.headers.get("webhook-signature"), body, secret: printeersConfig(podMode()).webhookSecret })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const kind = payload && typeof payload === "object" && typeof (payload as { kind?: unknown }).kind === "string" ? (payload as { kind: string }).kind : null;

  const eventKey = `PRINTEERS:${id}`.slice(0, 300);
  try {
    await prisma.podWebhookEvent.create({ data: { id: eventKey, provider: "PRINTEERS", type: kind } });
  } catch (reason) {
    if (reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    throw reason;
  }

  try {
    const { ok, count } = await refreshOpenOrders();
    if (!ok) throw new Error("Status could not be refreshed");
    return NextResponse.json({ received: true, refreshed: count });
  } catch (reason) {
    // Let Printeers deliver the event again later (it retries for up to 8 days).
    await prisma.podWebhookEvent.delete({ where: { id: eventKey } }).catch(() => undefined);
    console.error("[printeers] webhook could not be processed", { kind, message: reason instanceof Error ? reason.message.slice(0, 200) : "unknown" });
    return NextResponse.json({ error: "Status could not be refreshed" }, { status: 503 });
  }
}

const ORDER_REFERENCE = /^[A-Za-z0-9_-]{1,60}$/;

// Legacy order-updated callback (GET). Idempotent by nature: it only re-reads the order.
export async function handlePrinteersCallback(request: Request) {
  const url = new URL(request.url);
  // Same rule as the other shops (lib/pod/webhooks.ts): a token, when given, must be ours; a callback URL
  // registered without one is only a throttled hint (the order is read back from the API anyway).
  const token = url.searchParams.get("token");
  if (token !== null && !validWebhookToken(token, webhookSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reference = url.searchParams.get("order_reference") || "";
  if (!ORDER_REFERENCE.test(reference)) return NextResponse.json({ error: "No order reference" }, { status: 400 });
  // "test" or "prod": a callback from the other environment is acknowledged but never mixed in.
  const environment = url.searchParams.get("environment");
  const expected = podMode() === "live" ? "prod" : "test";
  if (environment && environment !== expected) return NextResponse.json({ received: true, ignored: "other environment" });

  const fulfillment = await prisma.podFulfillment.findFirst({ where: { provider: "PRINTEERS", mode: modeName(), providerOrderId: reference }, select: { id: true, lastSyncedAt: true } });
  // Orders placed outside this site are acknowledged so Printeers stops retrying.
  if (!fulfillment) return NextResponse.json({ received: true, matched: false });
  if (token === null && fulfillment.lastSyncedAt && Date.now() - fulfillment.lastSyncedAt.getTime() < 60_000) return NextResponse.json({ received: true, matched: true, throttled: true });
  const result = await syncFulfillment(fulfillment.id);
  // A failed read answers 503: Printeers retries about 5 minutes later.
  if (!result.ok) {
    console.error("[printeers] callback could not be processed", { message: (result.message || "unknown").slice(0, 200) });
    return NextResponse.json({ error: "Status could not be refreshed" }, { status: 503 });
  }
  return NextResponse.json({ received: true, matched: true, status: result.status });
}
