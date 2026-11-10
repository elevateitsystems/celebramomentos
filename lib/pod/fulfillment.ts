// Print-on-demand fulfilment: turns a paid order into one PodFulfillment per print
// shop, sends it, and keeps its status and tracking in sync. Server only.
//
// Safety rules enforced here:
// - Fulfilments are created only for orders whose payment the server verified (order
//   PAID+ with a SUCCEEDED payment); nothing coming from the browser is trusted.
// - (orderId, provider) is unique and the READY/FAILED → SUBMITTING update is
//   conditional, so an order is never sent twice even if several triggers race.
// - A submission whose outcome is unknown is first looked up at the shop by reference
//   (Prodigi idempotencyKey, Printful external_id, Printeers customIdentifier, Gelato search).
// - Failures never lose the order: it stays FAILED with the error and is retried.
import { Prisma, type OrderItem, type PodFulfillment, type PodProvider } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { normalizeCrop, type ImageCrop } from "@/lib/crop";
import { POD_PROVIDERS, podProviderFor, variantAttributes } from "@/lib/products";
import { prisma } from "@/lib/server/prisma";
import { CARD_SIZES } from "@/lib/data";
import type { CardDesignSide } from "@/lib/store";
import { STORED_STATUS, printStage } from "@/lib/order-progress";
import { checkPhotoResolution, checkPrintFileSize, isCloudinaryUrl, printFileUrl, type PhotoFit, type PrintSpec } from "./artwork";
import { mapOrderItem } from "./catalog";
import { podAutoSubmit, podMode } from "./config";
import { PodApiError, redact } from "./http";
import { renderCompositeFile, renderPrintFile, uploadedFiles, type UploadedFile } from "./print-files";
import { podAdapter } from "./providers";
import type { PodFulfillmentStatus, PodIssue, PodMode, ProviderOrderState, Recipient, SubmissionLine } from "./types";

const PAID_ORDER = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const SHORT: Partial<Record<PodProvider, string>> = { PRODIGI: "PRD", GELATO: "GEL", PRINTFUL: "PF", PRINTEERS: "PRT" };
const MAX_AUTO_ATTEMPTS = 6;
// Orders paid before print-on-demand went live were handled by hand; never send them automatically.
export const POD_ENABLED_SINCE = new Date("2026-11-01T00:00:00Z");

// One print file slot of an order item (stored in OrderItem.podArtwork).
// - url / source: the file sent to the shop. "design" = rendered by the site from the
//   customer's design at the required size; "admin" = attached by an admin;
//   "customer" = link to the customer's photo (older orders, or rendering failed).
// - width / height / format: what the shop requires; verified: the file's real pixel size.
// - original: the customer's original upload; references: the customer's card pages.
export type DesignReference = { label: string; side?: string; url: string; width?: number; height?: number };
// kind: how the file is made — "photo" / "pages" automatically by the site, "admin" attached by hand
// (only products with no automatic file, e.g. calendars). Missing on slots saved before it existed.
export type ArtworkSlot = { unit: number; productRef: string | null; area: string; url: string | null; source: "design" | "customer" | "admin" | null; kind?: "photo" | "pages" | "admin"; description?: string; width?: number; height?: number; format?: "jpg" | "png"; fit?: PhotoFit; original?: string | null; verified?: { width: number; height: number } | null; references?: DesignReference[] };

const asObject = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const asString = (value: unknown) => (typeof value === "string" ? value : null);
export const readArtwork = (value: Prisma.JsonValue | null) => (Array.isArray(value) ? (value as unknown as ArtworkSlot[]) : []);
export const readIssues = (value: Prisma.JsonValue | null) => (Array.isArray(value) ? (value as unknown as PodIssue[]) : []);

function backoff(attempts: number) {
  return new Date(Date.now() + Math.min(5 * 60_000 * 2 ** Math.max(0, attempts - 1), 24 * 3_600_000));
}

function logPod(message: string, details: Record<string, unknown>) {
  console.error(`[pod] ${message}`, redact(details));
}

async function orderIsPaid(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, payments: { where: { status: "SUCCEEDED" }, select: { id: true } } } });
  return Boolean(order && (PAID_ORDER as readonly string[]).includes(order.status) && order.payments.length);
}

// ── Preparing an order ───────────────────────────────────────────────────────

type ItemPlan = { item: OrderItem; provider: PodProvider; productRef: string | null; artwork: ArtworkSlot[]; issues: PodIssue[] };

// `fixedProvider`: an item that already has a print order keeps that order's shop when it is
// planned again (an item kept from a print shop that is no longer used is not re-routed).
export async function planItem(item: OrderItem, previous: ArtworkSlot[], fixedProvider?: PodProvider): Promise<ItemPlan> {
  const personalization = asObject(item.personalization);
  const product = asObject(personalization.product);
  const isCatalog = product.kind === "CATALOG";
  const kind = isCatalog ? String(product.productKind || "") : "POSTCARD";
  const declared = isCatalog ? product.provider : personalization.provider;
  const provider: PodProvider = fixedProvider ?? podProviderFor(kind, declared);
  const variant = item.variantId ? await prisma.productVariant.findUnique({ where: { id: item.variantId }, select: { name: true, attributes: true } }) : null;
  const podSku = asString(product.sku) || (variant ? variantAttributes(variant.attributes).podSku : null);
  const photos = (Array.isArray(product.photos) ? product.photos : []).map((photo) => (typeof photo === "string" && /^https:\/\//.test(photo) ? photo : null));
  const options = Object.fromEntries(Object.entries(asObject(product.options)).filter(([, value]) => typeof value === "string")) as Record<string, string>;
  const mapping = mapOrderItem({
    kind,
    provider,
    productName: asString(product.name) || item.name,
    variantName: variant?.name || null,
    podSku,
    options,
    photoCount: photos.filter(Boolean).length,
    cardSize: asString(personalization.cardSize),
    cardSku: asString(personalization.sku),
    printeers: printeersSelection(product.printeers),
  });
  const issues = [...mapping.issues];
  const artwork: ArtworkSlot[] = [];
  const card = asObject(personalization.card);
  const designPanels = (Array.isArray(asObject(card.design).panels) ? asObject(card.design).panels as unknown[] : []).map(asObject);
  // Real pixel sizes of the customer's uploads, attached files and card pages, from our upload records.
  const files = await uploadedFiles([...photos, ...previous.map((slot) => slot.url), ...designPanels.map((panel) => asString(panel.url))]);
  const sizeOf = (url: string | null | undefined) => { const file = url ? files.get(url) : undefined; return file && file.width && file.height && file.mimeType !== "application/pdf" ? { width: file.width, height: file.height } : null; };
  // Pages an admin rendered later are kept; otherwise the ones saved at checkout are used.
  const savedPages = previous.find((slot) => slot.references?.length)?.references;
  const cardPages = kind === "POSTCARD" ? savedPages ?? cardDesignPages(designPanels, asString(card.size), files, issues) : [];

  await Promise.all(mapping.units.map(async (unit, unitIndex) => {
    const prefix = unit.label ? `${unit.label}: ` : "";
    for (const spec of unit.specs as PrintSpec[]) {
      const before = previous.find((slot) => slot.unit === unitIndex && slot.area === spec.area);
      const attached = before?.source === "admin" && before.url ? before : null;
      const required = spec.kind === "photo" ? (spec.width ? { width: spec.width, height: spec.height } : {}) : spec.width && spec.height ? { width: spec.width, height: spec.height } : {};
      if (spec.kind === "pages") {
        // Greeting cards: the print file is composed automatically from the 4 pages the customer's
        // browser rendered at checkout (the customer's real design), in the SKU's page order and at its
        // exact print size. A file composed earlier from the same pages at the same size is reused,
        // so retries never create it again.
        const required = { width: spec.width, height: spec.height };
        const bySide = new Map(cardPages.map((page) => [page.side, page]));
        const ordered = spec.pages.map((side) => bySide.get(side) ?? null);
        const references = cardPages;
        const missing = spec.pages.filter((_, index) => !ordered[index]);
        if (missing.length) {
          artwork.push({ kind: "pages", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: null, source: null, description: spec.description, ...required, format: spec.format, ...(references.length ? { references } : {}) });
          issues.push({ code: "design_missing", severity: "blocker", message: `${prefix}The customer's card pages were not saved at checkout (missing: ${missing.join(", ")}). Create them once with “Create card pages from saved design”; the print file is then made and sent automatically` });
          continue;
        }
        const pageUrls = ordered.map((page) => page!.url);
        const signature = pageUrls.join(" ");
        const reusable = before?.source === "design" && before.url && before.verified && before.original === signature && before.width === spec.width && before.height === spec.height ? { url: before.url, ...before.verified } : null;
        let failure: string | null = null;
        const stored = reusable ?? await renderCompositeFile({ orderId: item.orderId, itemId: item.id, unit: unitIndex, pageUrls, spec }).catch((reason) => { failure = reason instanceof Error ? reason.message : "unknown error"; return null; });
        if (!stored) {
          logPod("card print file not composed", { itemId: item.id, failure });
          artwork.push({ kind: "pages", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: null, source: null, description: spec.description, ...required, format: spec.format, references });
          issues.push({ code: "print_file_render_failed", severity: "blocker", message: `${prefix}The card print file could not be made yet (${failure}); it is retried automatically` });
          continue;
        }
        const verified = { width: stored.width, height: stored.height };
        artwork.push({ kind: "pages", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: stored.url, source: "design", description: spec.description, ...required, format: spec.format, original: signature, verified, references });
        // Never sent unless it is exactly the size the print shop requires.
        const problem = checkPrintFileSize(required, verified, `${prefix}Card print file`);
        if (problem) issues.push(problem);
        continue;
      }
      if (spec.kind === "admin") {
        // A file an admin attached earlier is kept when the item is planned again; the
        // card pages the customer designed are kept beside it for reference.
        const references = cardPages;
        const verified = attached ? sizeOf(attached.url) : null;
        artwork.push({ kind: "admin", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: attached?.url || null, source: attached ? "admin" : null, description: spec.description, ...required, verified, ...(references.length ? { references } : {}) });
        if (!attached) issues.push({ code: "print_file_required", severity: "blocker", message: `${prefix}Print file needed: ${spec.description}` });
        else { const problem = checkPrintFileSize(required, verified, `${prefix}Attached print file`); if (problem) issues.push(problem); }
        continue;
      }
      const source = photos[spec.photoIndex];
      const fit = { fit: spec.fit, ...required };
      if (attached) {
        const verified = sizeOf(attached.url);
        artwork.push({ kind: "photo", ...attached, productRef: unit.productRef, ...required, format: spec.format, fit: spec.fit, original: source, verified });
        const problem = checkPrintFileSize(fit, verified, `${prefix}Attached print file`);
        if (problem) issues.push(problem);
        continue;
      }
      if (!source) {
        issues.push({ code: "missing_photos", severity: "blocker", message: `${prefix}Photo ${spec.photoIndex + 1} is missing` });
        artwork.push({ kind: "photo", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: null, source: null, ...required, format: spec.format, fit: spec.fit });
        continue;
      }
      const warning = checkPhotoResolution(spec, sizeOf(source), { accepted: product.qualityAccepted === true });
      if (warning) issues.push({ ...warning, message: `${prefix}${warning.message}` });
      // The final file is rendered once and reused while the photo and the required size stay the same.
      const reusable = before?.source === "design" && before.url && before.verified && before.original === source && before.width === required.width && before.height === required.height && before.format === spec.format ? { url: before.url, ...before.verified } : null;
      let stored = reusable;
      let failure: string | null = null;
      if (!stored) {
        if (!isCloudinaryUrl(source) || !files.has(source)) failure = "the photo is not an upload from this shop";
        else stored = await renderPrintFile({ orderId: item.orderId, itemId: item.id, unit: unitIndex, area: spec.area, sourceUrl: source, sourceSize: sizeOf(source), spec }).catch((reason) => { failure = reason instanceof Error ? reason.message : "unknown error"; return null; });
      }
      if (stored) {
        const verified = { width: stored.width, height: stored.height };
        artwork.push({ kind: "photo", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: stored.url, source: "design", ...required, format: spec.format, fit: spec.fit, original: source, verified });
        const problem = checkPrintFileSize(fit, verified, `${prefix}Print file`);
        if (problem) issues.push(problem);
        continue;
      }
      // Never silently send an unchecked file: the order waits until it is rendered or an admin checks it.
      logPod("print file not rendered", { itemId: item.id, unit: unitIndex, area: spec.area, failure });
      artwork.push({ kind: "photo", unit: unitIndex, productRef: unit.productRef, area: spec.area, url: printFileUrl(source, spec, sizeOf(source)), source: "customer", ...required, format: spec.format, fit: spec.fit, original: source, verified: null });
      issues.push({ code: "print_file_unverified", severity: "warning", message: `${prefix}The final print file could not be saved (${failure}); a link to the customer's photo is used instead. Press “Check again” to retry, or open it before sending` });
    }
  }));
  artwork.sort((a, b) => a.unit - b.unit);
  const refs = Array.from(new Set(mapping.units.map((unit) => unit.productRef).filter(Boolean)));
  return { item, provider, productRef: refs.join(", ") || null, artwork, issues };
}

const PAGE_LABEL: Record<CardDesignSide, string> = { front: "Front", "inside-left": "Inside left", "inside-right": "Inside right", back: "Back" };

// The card pages rendered at checkout, kept only if they are uploads from this site at
// the card's page size.
function cardDesignPages(panels: Record<string, unknown>[], size: string | null, files: Map<string, UploadedFile>, issues: PodIssue[]): DesignReference[] {
  const page = (CARD_SIZES.find((item) => item.id === size) || CARD_SIZES[0]).panel;
  const pages: DesignReference[] = [];
  for (const panel of panels) {
    const url = asString(panel.url);
    const side = asString(panel.side) as CardDesignSide | null;
    const file = url ? files.get(url) : undefined;
    if (!url || !side || !PAGE_LABEL[side] || !file || file.kind !== "CUSTOMER_UPLOAD") continue;
    if (file.width !== page.width || file.height !== page.height) issues.push({ code: "design_page_size", severity: "warning", message: `Card page "${PAGE_LABEL[side]}" is ${file.width} × ${file.height} px instead of ${page.width} × ${page.height} px` });
    pages.push({ label: PAGE_LABEL[side], side, url, width: file.width, height: file.height });
  }
  // Missing pages are reported by the print file that needs them (planItem).
  return pages;
}

// The Printeers part of a phone case selection, as validated by the server at checkout.
function printeersSelection(value: unknown) {
  const data = asObject(value);
  const reference = asString(data.productReference);
  if (!reference) return null;
  const mm = asObject(data.printMm);
  const crop = asObject(data.crop);
  return {
    productReference: reference,
    printMm: typeof mm.width === "number" && typeof mm.height === "number" ? { width: mm.width, height: mm.height } : null,
    crop: Object.keys(crop).length ? normalizeCrop(crop as Partial<ImageCrop>) : null,
  };
}

// Notes ("info") never hold a print order; blockers and warnings do.
const holds = (issues: PodIssue[]) => issues.filter((issue) => issue.severity !== "info");

function statusFor(issues: PodIssue[], configurationProblem: string | null): PodFulfillmentStatus {
  return holds(issues).length || configurationProblem ? "NEEDS_ATTENTION" : "READY";
}

// Creates the order's fulfilments (one per shop). Safe to call any number of times:
// existing fulfilments are kept and only items without one are added.
export async function prepareFulfillments(orderId: string) {
  if (!(await orderIsPaid(orderId))) return [];
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true, fulfillments: true } });
  const pending = order.items.filter((item) => !item.podFulfillmentId);
  if (!pending.length) return order.fulfillments;
  const plans = await Promise.all(pending.map((item) => planItem(item, readArtwork(item.podArtwork))));
  const mode = podMode();
  await Promise.all(Array.from(new Set(plans.map((plan) => plan.provider))).map(async (provider) => {
    const group = plans.filter((plan) => plan.provider === provider);
    const problem = podAdapter(provider).configurationProblem(mode);
    let fulfillment = order.fulfillments.find((item) => item.provider === provider);
    if (!fulfillment) {
      try {
        fulfillment = await prisma.podFulfillment.create({ data: { orderId, provider, mode, reference: `${order.number}-${SHORT[provider] ?? "POD"}`, status: statusFor(group.flatMap((plan) => plan.issues), problem), lastError: problem, shippingMethod: asString(asObject(order.items[0]?.personalization).delivery) || "standard" } });
      } catch (reason) {
        // Another trigger created it at the same moment.
        if (!(reason instanceof Prisma.PrismaClientKnownRequestError && reason.code === "P2002")) throw reason;
        fulfillment = await prisma.podFulfillment.findUniqueOrThrow({ where: { orderId_provider: { orderId, provider } } });
      }
    }
    const fulfillmentId = fulfillment.id;
    await Promise.all(group.map((plan) => prisma.orderItem.updateMany({ where: { id: plan.item.id, podFulfillmentId: null }, data: { podFulfillmentId: fulfillmentId, podProvider: provider, podProductRef: plan.productRef, podArtwork: plan.artwork as unknown as Prisma.InputJsonValue, podIssues: plan.issues as unknown as Prisma.InputJsonValue } })));
    await refreshReadiness(fulfillmentId);
  }));
  return prisma.podFulfillment.findMany({ where: { orderId } });
}

// Re-checks a fulfilment that has not been sent yet (after an admin attached a file,
// changed a mapping or added credentials) and moves it between NEEDS_ATTENTION and READY.
export async function refreshReadiness(fulfillmentId: string, { replan = false } = {}) {
  const fulfillment = await prisma.podFulfillment.findUnique({ where: { id: fulfillmentId }, include: { items: true } });
  if (!fulfillment || !["NEEDS_ATTENTION", "READY", "FAILED"].includes(fulfillment.status)) return fulfillment;
  if (replan) {
    for (const item of fulfillment.items) {
      const plan = await planItem(item, readArtwork(item.podArtwork), fulfillment.provider);
      await prisma.orderItem.update({ where: { id: item.id }, data: { podProductRef: plan.productRef, podArtwork: plan.artwork as unknown as Prisma.InputJsonValue, podIssues: plan.issues as unknown as Prisma.InputJsonValue } });
    }
  }
  const items = replan ? await prisma.orderItem.findMany({ where: { podFulfillmentId: fulfillmentId } }) : fulfillment.items;
  const problem = podAdapter(fulfillment.provider).configurationProblem(podMode());
  const issues = items.flatMap((item) => readIssues(item.podIssues));
  const held = holds(issues);
  if (fulfillment.status === "FAILED" && !held.length && !problem) return fulfillment;
  return prisma.podFulfillment.update({ where: { id: fulfillmentId }, data: { status: statusFor(issues, problem), lastError: problem ?? (held.length ? held.map((issue) => issue.message).join(" · ").slice(0, 900) : null) } });
}

// ── Sending ──────────────────────────────────────────────────────────────────

function recipientOf(order: { email: string; shippingAddress: Prisma.JsonValue }): Recipient {
  const address = asObject(order.shippingAddress);
  return {
    name: asString(address.recipient) || asString(address.name) || "",
    email: order.email,
    phone: asString(address.phone),
    address1: asString(address.address) || "",
    address2: null,
    city: asString(address.city) || "",
    postalCode: asString(address.postalCode) || "",
    countryCode: (asString(address.country) || "ES").toUpperCase(),
    state: null,
  };
}

// Last check before anything is sent: every print file must exist and, when the shop gives an exact
// pixel size, be exactly that size (as measured when the file was stored). Pure, for tests.
export function artworkProblems(slots: ArtworkSlot[]) {
  const problems: string[] = [];
  for (const slot of slots) {
    const label = `Print file ${slot.unit + 1} (${slot.area})`;
    if (!slot.url) { problems.push(`${label} is missing`); continue; }
    if (!slot.width || !slot.height || slot.fit === "original" || slot.fit === "aspect") continue;
    if (!slot.verified) { if (slot.source !== "customer") problems.push(`${label}: its pixel size was not verified`); continue; }
    if (slot.verified.width !== slot.width || slot.verified.height !== slot.height) problems.push(`${label} is ${slot.verified.width} × ${slot.verified.height} px; ${slot.width} × ${slot.height} px is required`);
  }
  return problems;
}

function linesOf(items: OrderItem[]): SubmissionLine[] {
  return items.flatMap((item) => {
    const slots = readArtwork(item.podArtwork);
    const units = Array.from(new Set(slots.map((slot) => slot.unit))).sort((a, b) => a - b);
    return units.map((unit) => {
      const unitSlots = slots.filter((slot) => slot.unit === unit);
      return {
        itemId: units.length > 1 ? `${item.id}-${unit + 1}` : item.id,
        productRef: unitSlots[0]?.productRef || "",
        quantity: item.quantity,
        name: item.name.slice(0, 120),
        files: unitSlots.filter((slot) => slot.url).map((slot) => ({ area: slot.area, url: slot.url!, source: slot.source || "customer" })),
      };
    });
  });
}

async function saveState(fulfillmentId: string, state: ProviderOrderState, extra: Prisma.PodFulfillmentUpdateInput = {}) {
  const current = await prisma.podFulfillment.findUniqueOrThrow({ where: { id: fulfillmentId } });
  // Never move backwards (e.g. a late "in production" push after "shipped").
  const rank: Record<string, number> = { SUBMITTED: 1, IN_PRODUCTION: 2, SHIPPED: 3, DELIVERED: 4 };
  const status = rank[current.status] && rank[state.status] && rank[state.status] < rank[current.status] ? current.status : state.status;
  const updated = await prisma.podFulfillment.update({
    where: { id: fulfillmentId },
    data: {
      ...extra,
      status,
      providerOrderId: state.providerOrderId || current.providerOrderId,
      providerStatus: state.providerStatus,
      carrier: state.carrier ?? current.carrier,
      trackingNumber: state.trackingNumber ?? current.trackingNumber,
      trackingUrl: state.trackingUrl ?? current.trackingUrl,
      lastSyncedAt: new Date(),
      ...(status === "SHIPPED" && !current.shippedAt ? { shippedAt: new Date() } : {}),
      ...(status === "DELIVERED" && !current.deliveredAt ? { deliveredAt: new Date() } : {}),
      ...(state.raw !== undefined ? { lastResponse: redact(state.raw) as Prisma.InputJsonValue } : {}),
    },
  });
  await syncOrderStatus(updated.orderId);
  return updated;
}

export type SubmitResult = { ok: boolean; status: PodFulfillmentStatus; message?: string };

// Sends one fulfilment to its shop. `allowWarnings` lets an admin send an order held
// only for warnings (e.g. a low resolution photo) after checking it.
export async function submitFulfillment(fulfillmentId: string, { allowWarnings = false } = {}): Promise<SubmitResult> {
  const fulfillment = await prisma.podFulfillment.findUnique({ where: { id: fulfillmentId }, include: { items: true, order: true } });
  if (!fulfillment) return { ok: false, status: "FAILED", message: "Print order not found" };
  if (!(await orderIsPaid(fulfillment.orderId))) return { ok: false, status: fulfillment.status, message: "The order payment is not verified" };
  const issues = fulfillment.items.flatMap((item) => readIssues(item.podIssues));
  const blockers = issues.filter((issue) => issue.severity === "blocker");
  const allowed: PodFulfillmentStatus[] = ["READY", "FAILED", ...(allowWarnings && !blockers.length ? (["NEEDS_ATTENTION"] as PodFulfillmentStatus[]) : [])];
  if (!allowed.includes(fulfillment.status)) return { ok: false, status: fulfillment.status, message: blockers.length ? blockers.map((issue) => issue.message).join(" · ") : fulfillment.lastError || `Print order is already ${fulfillment.status.toLowerCase().replace("_", " ")}` };
  const mode = podMode();
  const adapter = podAdapter(fulfillment.provider);
  const problem = adapter.configurationProblem(mode);
  if (problem) {
    await prisma.podFulfillment.update({ where: { id: fulfillmentId }, data: { status: "NEEDS_ATTENTION", lastError: problem } });
    return { ok: false, status: "NEEDS_ATTENTION", message: problem };
  }
  if (blockers.length) return { ok: false, status: fulfillment.status, message: blockers.map((issue) => issue.message).join(" · ") };
  const sizeProblems = artworkProblems(fulfillment.items.flatMap((item) => readArtwork(item.podArtwork)));
  if (sizeProblems.length) {
    const message = sizeProblems.join(" · ").slice(0, 900);
    await prisma.podFulfillment.update({ where: { id: fulfillmentId }, data: { status: "NEEDS_ATTENTION", lastError: message } });
    return { ok: false, status: "NEEDS_ATTENTION", message };
  }

  // The lock: only one caller can move it to SUBMITTING.
  const locked = await prisma.podFulfillment.updateMany({ where: { id: fulfillmentId, status: { in: allowed } }, data: { status: "SUBMITTING", mode, attempts: { increment: 1 }, lastError: null, nextAttemptAt: null } });
  if (locked.count !== 1) return { ok: false, status: "SUBMITTING", message: "This print order is already being sent" };
  const attempts = fulfillment.attempts + 1;
  try {
    // A previous attempt may have reached the shop before failing on our side.
    const existing = attempts > 1 ? await adapter.findByReference(fulfillment.reference, mode) : null;
    const state = existing || await adapter.submit({ reference: fulfillment.reference, orderNumber: fulfillment.order.number, mode, recipient: recipientOf(fulfillment.order), lines: linesOf(fulfillment.items), shipping: fulfillment.shippingMethod === "express" ? "express" : "standard" });
    const saved = await saveState(fulfillmentId, state, { submittedAt: new Date(), lastError: null });
    return { ok: true, status: saved.status };
  } catch (reason) {
    const retryable = reason instanceof PodApiError ? reason.retryable : false;
    const message = reason instanceof Error ? reason.message : "Unknown error";
    logPod("submission failed", { fulfillmentId, provider: fulfillment.provider, attempts, retryable, message });
    await prisma.podFulfillment.update({
      where: { id: fulfillmentId },
      data: { status: "FAILED", lastError: message.slice(0, 900), lastResponse: reason instanceof PodApiError ? (redact(reason.body) as Prisma.InputJsonValue) ?? Prisma.JsonNull : Prisma.JsonNull, nextAttemptAt: retryable && attempts < MAX_AUTO_ATTEMPTS ? backoff(attempts) : null },
    });
    return { ok: false, status: "FAILED", message };
  }
}

// Turns a draft (Gelato, Printful) into a real production order. Only in live mode.
export async function confirmDraft(fulfillmentId: string): Promise<SubmitResult> {
  const fulfillment = await prisma.podFulfillment.findUnique({ where: { id: fulfillmentId } });
  if (!fulfillment?.providerOrderId || fulfillment.mode !== "draft" || fulfillment.status !== "SUBMITTED") return { ok: false, status: fulfillment?.status ?? "FAILED", message: "Only a sent draft can be confirmed" };
  if (podMode() !== "live") return { ok: false, status: fulfillment.status, message: "Set POD_ORDER_MODE=live before confirming drafts for production" };
  if (!(await orderIsPaid(fulfillment.orderId))) return { ok: false, status: fulfillment.status, message: "The order payment is not verified" };
  const adapter = podAdapter(fulfillment.provider);
  if (!adapter.confirmDraft) return { ok: false, status: fulfillment.status, message: `${fulfillment.provider} has no drafts to confirm` };
  const state = await adapter.confirmDraft(fulfillment.providerOrderId);
  const saved = await saveState(fulfillmentId, state, { mode: "live" });
  return { ok: true, status: saved.status };
}

// Reads the latest status and tracking from the shop.
export async function syncFulfillment(fulfillmentId: string): Promise<SubmitResult> {
  const fulfillment = await prisma.podFulfillment.findUnique({ where: { id: fulfillmentId } });
  if (!fulfillment?.providerOrderId) return { ok: false, status: fulfillment?.status ?? "FAILED", message: "Not sent to the print shop yet" };
  try {
    const state = await podAdapter(fulfillment.provider).fetchStatus(fulfillment.providerOrderId, fulfillment.mode === "live" ? "live" : "draft");
    if (!state) {
      await prisma.podFulfillment.update({ where: { id: fulfillmentId }, data: { lastSyncedAt: new Date() } });
      return { ok: false, status: fulfillment.status, message: `${fulfillment.provider} has no status endpoint` };
    }
    const saved = await saveState(fulfillmentId, state);
    return { ok: true, status: saved.status };
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Unknown error";
    logPod("status sync failed", { fulfillmentId, provider: fulfillment.provider, message });
    return { ok: false, status: fulfillment.status, message };
  }
}

// Problems that mean the print file itself is missing or wrong.
const ARTWORK_BLOCKERS = ["missing_photos", "print_file_required", "print_file_invalid"];
const NOT_SENT = ["NEEDS_ATTENTION", "READY", "FAILED"];

// An order item whose print files can still change (its print order was not sent).
async function editableItem(itemId: string) {
  const item = await prisma.orderItem.findUniqueOrThrow({ where: { id: itemId } });
  if (!item.podFulfillmentId) throw new Error("This item has no print order");
  const fulfillment = await prisma.podFulfillment.findUniqueOrThrow({ where: { id: item.podFulfillmentId } });
  if (!NOT_SENT.includes(fulfillment.status)) throw new Error("The print order was already sent; files can no longer change");
  return { item, fulfillmentId: item.podFulfillmentId };
}

async function saveSlots(itemId: string, fulfillmentId: string, slots: ArtworkSlot[]) {
  await prisma.orderItem.update({ where: { id: itemId }, data: { podArtwork: slots as unknown as Prisma.InputJsonValue } });
  // Planning again checks the file's size against the shop's requirement.
  return refreshReadiness(fulfillmentId, { replan: true });
}

// Attaches (or replaces) a print file on one slot of an order item.
export async function attachPrintFile(itemId: string, input: { unit: number; area: string; url: string }) {
  const { item, fulfillmentId } = await editableItem(itemId);
  const slots = readArtwork(item.podArtwork);
  const index = slots.findIndex((slot) => slot.unit === input.unit && slot.area === input.area);
  // Card print files are made from the customer's design automatically; they cannot be replaced by hand.
  if (index >= 0 && slots[index].kind === "pages") throw new Error("This print file is made automatically from the customer's design and cannot be replaced");
  const slot: ArtworkSlot = { ...(index >= 0 ? slots[index] : { unit: input.unit, productRef: item.podProductRef, area: input.area }), url: input.url, source: "admin" };
  const next = index >= 0 ? slots.map((current, position) => (position === index ? slot : current)) : [...slots, slot];
  return saveSlots(itemId, fulfillmentId, next);
}

// Removes an admin's file so the print file is rendered again from the customer's design.
export async function resetPrintFile(itemId: string, input: { unit: number; area: string }) {
  const { item, fulfillmentId } = await editableItem(itemId);
  const next = readArtwork(item.podArtwork).map((slot) => (slot.unit === input.unit && slot.area === input.area && slot.source === "admin" ? { ...slot, url: null, source: null, verified: null } : slot));
  return saveSlots(itemId, fulfillmentId, next);
}

// Saves card pages an admin rendered from the order's saved design (for orders whose
// pages were not saved at checkout). Only files uploaded to this site at the card's page size.
export async function attachDesignPages(itemId: string, pages: { side: CardDesignSide; url: string }[]) {
  const { item, fulfillmentId } = await editableItem(itemId);
  const card = asObject(asObject(item.personalization).card);
  const size = (CARD_SIZES.find((entry) => entry.id === asString(card.size)) || CARD_SIZES[0]).panel;
  const files = await uploadedFiles(pages.map((page) => page.url));
  const references = pages.map((page) => {
    const file = files.get(page.url);
    if (!file || file.width !== size.width || file.height !== size.height) throw new Error(`The ${PAGE_LABEL[page.side]} page must be an upload of ${size.width} × ${size.height} px`);
    return { label: PAGE_LABEL[page.side], side: page.side, url: page.url, width: file.width, height: file.height };
  });
  if (references.length !== 4) throw new Error("All 4 card pages are needed");
  return saveSlots(itemId, fulfillmentId, readArtwork(item.podArtwork).map((slot) => ({ ...slot, references })));
}

// ── Order status ─────────────────────────────────────────────────────────────

// Moves the order forward from the state of its print orders in the shop's current environment (real ones
// when live, test ones while testing; never the other kind). The customer sees the same progress.
export async function syncOrderStatus(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { fulfillments: true } });
  if (!order || !["PAID", "PROCESSING", "SHIPPED"].includes(order.status)) return;
  const mode = podMode();
  const next = STORED_STATUS[printStage(order.fulfillments.filter((item) => item.mode === mode))];
  const rank = { PAID: 0, PROCESSING: 1, SHIPPED: 2, DELIVERED: 3 } as const;
  if (next && rank[next] > rank[order.status as keyof typeof rank]) await prisma.order.update({ where: { id: orderId }, data: { status: next } });
}

// ── Triggers ─────────────────────────────────────────────────────────────────

// Called right after a payment is verified on the server (Stripe webhook / return,
// PayPal capture). Never throws: payment handling must not fail because of a print shop.
export async function handlePaidOrder(orderId: string) {
  try {
    const fulfillments = await prepareFulfillments(orderId);
    if (!podAutoSubmit()) return;
    // Different print shops are independent: send them in parallel.
    await Promise.all(fulfillments.filter((item) => item.status === "READY").map((item) => submitFulfillment(item.id)));
  } catch (reason) {
    logPod("handling a paid order failed", { orderId, message: reason instanceof Error ? reason.message : String(reason) });
  }
}

// For the payment routes: answers the payment provider straight away and lets the
// print shop work finish after the response (Vercel keeps the function alive with
// waitUntil; elsewhere the Node process simply continues). Anything not finished is
// picked up by the cron job.
export function handlePaidOrderInBackground(orderId: string) {
  const work = handlePaidOrder(orderId);
  waitUntil(work);
}

// Refreshes print orders whose status has not been read from the print shop for a while, so admin
// pages always show the latest status without anyone pressing a button (webhooks and the cron job
// do the same in the background). Bounded in number and time; a failed read changes nothing
// (syncFulfillment keeps the stored status and only records the error in the log).
export async function syncStaleFulfillments({ maxAgeMs = 5 * 60_000, limit = 12, budgetMs = 6_000, orderIds }: { maxAgeMs?: number; limit?: number; budgetMs?: number; orderIds?: string[] } = {}) {
  const stale = await prisma.podFulfillment.findMany({
    where: { ...(orderIds ? { orderId: { in: orderIds } } : {}), status: { in: ["SUBMITTED", "IN_PRODUCTION", "SHIPPED"] }, provider: { in: [...POD_PROVIDERS] }, providerOrderId: { not: null }, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - maxAgeMs) } }] },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
    take: limit,
    select: { id: true },
  });
  if (!stale.length) return 0;
  const work = Promise.all(stale.map((item) => syncFulfillment(item.id).catch(() => null)));
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, budgetMs))]);
  return stale.length;
}

// Periodic job (cron): prepares paid orders the payment hook missed, retries failed
// submissions, recovers interrupted ones and refreshes tracking.
export async function runPodMaintenance({ budgetMs = 45_000 } = {}) {
  const deadline = Date.now() + budgetMs;
  const report = { prepared: 0, rerendered: 0, submitted: 0, retried: 0, recovered: 0, synced: 0 };
  const left = () => Date.now() < deadline;

  const unprepared = await prisma.order.findMany({ where: { status: { in: [...PAID_ORDER] }, createdAt: { gte: POD_ENABLED_SINCE }, fulfillments: { none: {} }, payments: { some: { status: "SUCCEEDED" } } }, select: { id: true }, take: 20, orderBy: { createdAt: "asc" } });
  for (const order of unprepared) { if (!left()) break; await prepareFulfillments(order.id); report.prepared += 1; }

  const stale = await prisma.podFulfillment.findMany({ where: { status: "SUBMITTING", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, take: 20 });
  for (const fulfillment of stale) {
    if (!left()) break;
    const found = await podAdapter(fulfillment.provider).findByReference(fulfillment.reference, fulfillment.mode === "live" ? "live" : "draft").catch(() => null);
    if (found) await saveState(fulfillment.id, found, { submittedAt: new Date() });
    else await prisma.podFulfillment.update({ where: { id: fulfillment.id }, data: { status: "FAILED", lastError: "The last submission was interrupted; it will be retried", nextAttemptAt: new Date() } });
    report.recovered += 1;
  }

  // Print files that could not be made (e.g. image storage briefly unavailable) are tried again, and
  // Prodigi card orders still waiting for a hand-made file (planned before card files were made
  // automatically) are planned again so their file is composed and they are sent.
  const unrendered = await prisma.podFulfillment.findMany({ where: { status: "NEEDS_ATTENTION", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) }, OR: [
    { items: { some: { podIssues: { array_contains: [{ code: "print_file_render_failed" }] } } } },
    { provider: "PRODIGI", items: { some: { podIssues: { array_contains: [{ code: "print_file_required" }] } } } },
  ] }, select: { id: true }, take: 10 });
  for (const fulfillment of unrendered) { if (!left()) break; await refreshReadiness(fulfillment.id, { replan: true }); report.rerendered += 1; }

  const due: PodFulfillment[] = await prisma.podFulfillment.findMany({ where: { OR: [{ status: "FAILED", nextAttemptAt: { lte: new Date() } }, ...(podAutoSubmit() ? [{ status: "READY" as const }] : [])] }, take: 20, orderBy: { updatedAt: "asc" } });
  for (const fulfillment of due) {
    if (!left()) break;
    const result = await submitFulfillment(fulfillment.id);
    if (fulfillment.status === "FAILED") report.retried += 1; else if (result.ok) report.submitted += 1;
  }

  const active = await prisma.podFulfillment.findMany({ where: { status: { in: ["SUBMITTED", "IN_PRODUCTION", "SHIPPED"] }, provider: { in: [...POD_PROVIDERS] }, providerOrderId: { not: null }, OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - 3 * 3_600_000) } }] }, take: 25, orderBy: { lastSyncedAt: "asc" } });
  for (const fulfillment of active) { if (!left()) break; if ((await syncFulfillment(fulfillment.id)).ok) report.synced += 1; }
  return report;
}

export type { PodMode };
