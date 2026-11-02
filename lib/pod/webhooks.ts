// Print shop webhooks. None of Prodigi, Gelato or Printful documents a request
// signature we could verify, so a webhook is only a hint:
// 1. the URL must carry our secret (?token=POD_WEBHOOK_SECRET, compared in constant time);
// 2. the event id is stored once, so a repeated delivery has no effect;
// 3. the payload only tells us which order changed — the status and tracking are then
//    read from the shop's API with our credentials, never taken from the payload.
// Webhooks never touch payment state.
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { Prisma, type PodProvider } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { webhookSecret } from "./config";
import { syncFulfillment } from "./fulfillment";

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
    const order = object(object(body.data).order);
    return { eventId: text(body.id), type: text(body.type), providerOrderId: text(order.id), reference: text(order.merchantReference) };
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

export async function handlePodWebhook(provider: PodProvider, request: Request) {
  if (!validWebhookToken(new URL(request.url).searchParams.get("token"), webhookSecret())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const target = parseWebhook(provider, payload);
  if (!target.providerOrderId && !target.reference) return NextResponse.json({ error: "No order reference in the event" }, { status: 400 });

  if (target.eventId) {
    try {
      await prisma.podWebhookEvent.create({ data: { id: `${provider}:${target.eventId}`.slice(0, 300), provider, type: target.type } });
    } catch (reason) {
      if (reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
      throw reason;
    }
  }
  const fulfillment = await prisma.podFulfillment.findFirst({
    where: { provider, OR: [...(target.providerOrderId ? [{ providerOrderId: target.providerOrderId }] : []), ...(target.reference ? [{ reference: target.reference }] : [])] },
    select: { id: true },
  });
  // Unknown orders are acknowledged so the shop stops retrying (e.g. orders placed outside this site).
  if (!fulfillment) return NextResponse.json({ received: true, matched: false });
  const result = await syncFulfillment(fulfillment.id);
  // A failed read is reported as 503 so the shop delivers the event again later.
  if (!result.ok && result.message && !/no status endpoint/.test(result.message)) {
    if (target.eventId) await prisma.podWebhookEvent.delete({ where: { id: `${provider}:${target.eventId}`.slice(0, 300) } }).catch(() => undefined);
    return NextResponse.json({ error: "Status could not be refreshed" }, { status: 503 });
  }
  return NextResponse.json({ received: true, matched: true, status: result.status });
}
