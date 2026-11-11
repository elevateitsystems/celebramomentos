import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { podAutoSubmit, podMode, webhookSecret } from "@/lib/pod/config";
import { attachDesignPages, attachPrintFile, cancelFulfillment, confirmDraft, prepareFulfillments, readArtwork, readIssues, refreshReadiness, resetPrintFile, submitFulfillment, syncFulfillment, syncStaleFulfillments } from "@/lib/pod/fulfillment";
import { podAdapter } from "@/lib/pod/providers";
import { itemShipping, latestEvent, readTracking } from "@/lib/pod/tracking";
import { registerWebhook, webhookSetupState } from "@/lib/pod/webhooks";
import { POD_PROVIDERS } from "@/lib/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUSES = ["NEEDS_ATTENTION", "READY", "SUBMITTING", "SUBMITTED", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED"] as const;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit"), id: z.string().cuid(), allowWarnings: z.boolean().optional() }),
  z.object({ action: z.literal("sync"), id: z.string().cuid() }),
  z.object({ action: z.literal("recheck"), id: z.string().cuid() }),
  z.object({ action: z.literal("confirm"), id: z.string().cuid() }),
  z.object({ action: z.literal("cancel"), id: z.string().cuid() }),
  z.object({ action: z.literal("prepare"), orderId: z.string().cuid() }),
  z.object({ action: z.literal("register_webhook"), provider: z.literal("PRINTFUL") }),
  z.object({ action: z.literal("attach"), itemId: z.string().cuid(), unit: z.number().int().min(0).max(50), area: z.string().trim().min(1).max(40), url: z.string().trim().url().max(2000).refine((value) => value.startsWith("https://"), "The print file must be an https:// URL") }),
  z.object({ action: z.literal("reset"), itemId: z.string().cuid(), unit: z.number().int().min(0).max(50), area: z.string().trim().min(1).max(40) }),
  z.object({ action: z.literal("design"), itemId: z.string().cuid(), pages: z.array(z.object({ side: z.enum(["front", "inside-left", "inside-right", "back"]), url: z.string().trim().url().max(2000).startsWith("https://") })).length(4) }),
]);

// The card design saved with a card item, so the admin page can render its pages again.
function savedCard(personalization: Prisma.JsonValue | null) {
  const value = personalization && typeof personalization === "object" && !Array.isArray(personalization) ? (personalization as Record<string, Prisma.JsonValue>).card : null;
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

// The customer's uploaded photos of a catalog item, in order (empty places stay null so
// a calendar's month numbers are kept), and the kind of product.
function savedPhotos(personalization: Prisma.JsonValue | null) {
  const product = personalization && typeof personalization === "object" && !Array.isArray(personalization) ? (personalization as Record<string, Prisma.JsonValue>).product : null;
  if (!product || typeof product !== "object" || Array.isArray(product)) return { kind: null, photos: [] as (string | null)[] };
  const photos = Array.isArray(product.photos) ? product.photos.map((photo) => (typeof photo === "string" && photo.startsWith("https://") ? photo : null)) : [];
  return { kind: typeof product.productKind === "string" ? product.productKind : null, photos };
}

// Print orders for the admin dashboard, with the setup state of each shop (never the credentials).
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  const params = request.nextUrl.searchParams;
  const provider = params.get("provider");
  const status = params.get("status");
  const search = params.get("q")?.trim();
  const where: Prisma.PodFulfillmentWhereInput = {
    ...(provider && (POD_PROVIDERS as readonly string[]).includes(provider) ? { provider: provider as (typeof POD_PROVIDERS)[number] } : {}),
    ...(status && (STATUSES as readonly string[]).includes(status) ? { status: status as (typeof STATUSES)[number] } : {}),
    ...(search ? { OR: [{ reference: { contains: search, mode: "insensitive" } }, { providerOrderId: { contains: search } }, { order: { email: { contains: search, mode: "insensitive" } } }, { order: { number: { contains: search, mode: "insensitive" } } }] } : {}),
  };
  try {
    // Statuses come from the print shops: anything not read for a few minutes is refreshed first.
    await syncStaleFulfillments();
    const [fulfillments, counts, unprepared] = await Promise.all([
      prisma.podFulfillment.findMany({ where, include: { order: { select: { id: true, number: true, email: true, status: true, totalCents: true, createdAt: true, shippingAddress: true } }, items: { select: { id: true, name: true, quantity: true, podProductRef: true, podArtwork: true, podIssues: true, personalization: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.podFulfillment.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
      prisma.order.findMany({ where: { status: { in: ["PAID", "PROCESSING"] }, fulfillments: { none: {} }, payments: { some: { status: "SUCCEEDED" } } }, select: { id: true, number: true, email: true, createdAt: true, totalCents: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);
    const mode = podMode();
    return NextResponse.json({
      config: {
        mode,
        autoSubmit: podAutoSubmit(),
        webhooks: Boolean(webhookSecret()),
        cron: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length >= 16),
        webhookSetup: await webhookSetupState(),
        providers: Object.fromEntries(POD_PROVIDERS.map((name) => [name, podAdapter(name).configurationProblem(mode)])),
      },
      counts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
      unprepared,
      fulfillments: fulfillments.map(({ lastResponse: _lastResponse, ...item }) => {
        const tracking = readTracking(item.tracking);
        const shipping = new Map(itemShipping(tracking, item.items.map((line) => line.id)).map((entry) => [entry.itemId, entry]));
        return {
          ...item,
          tracking,
          latestEvent: latestEvent(tracking),
          items: item.items.map(({ personalization, ...line }) => ({ ...line, shipping: shipping.get(line.id) ?? null, podArtwork: readArtwork(line.podArtwork), podIssues: readIssues(line.podIssues), card: savedCard(personalization), ...savedPhotos(personalization) })),
        };
      }),
    });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function POST(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = actionSchema.parse(await request.json());
    let result: unknown;
    switch (input.action) {
      case "submit": result = await submitFulfillment(input.id, { allowWarnings: input.allowWarnings }); break;
      case "sync": result = await syncFulfillment(input.id); break;
      case "recheck": result = await refreshReadiness(input.id, { replan: true }); break;
      case "confirm": result = await confirmDraft(input.id); break;
      case "cancel": result = await cancelFulfillment(input.id); break;
      case "prepare": result = await prepareFulfillments(input.orderId); break;
      case "register_webhook": result = await registerWebhook(input.provider); break;
      case "attach": result = await attachPrintFile(input.itemId, { unit: input.unit, area: input.area, url: input.url }); break;
      case "reset": result = await resetPrintFile(input.itemId, { unit: input.unit, area: input.area }); break;
      case "design": result = await attachDesignPages(input.itemId, input.pages); break;
    }
    const entityId = "id" in input ? input.id : "orderId" in input ? input.orderId : "itemId" in input ? input.itemId : input.provider;
    await prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: `POD_${input.action.toUpperCase()}`, entity: "PodFulfillment", entityId, metadata: { action: input.action } } });
    const failed = result && typeof result === "object" && "ok" in result && (result as { ok: boolean }).ok === false;
    return NextResponse.json({ result }, { status: failed ? 409 : 200 });
  } catch (reason) {
    if (reason instanceof Error && !(reason instanceof z.ZodError) && !("code" in reason)) return jsonError(reason.message, 400);
    return handleApiError(reason);
  }
}
