// Shared types of the print-on-demand (POD) layer. Everything under lib/pod is
// server-only except catalog.ts / artwork.ts / status.ts, which are pure and unit tested.
import type { PodFulfillmentStatus, PodProvider } from "@prisma/client";
import type { TrackingInfo } from "./tracking";

export type { PodFulfillmentStatus, PodProvider };

// "draft": nothing is produced or charged (Gelato draft, Printful unconfirmed order,
// Prodigi sandbox). "live": real production orders.
export type PodMode = "draft" | "live";

// One print file the shop needs for an item, e.g. Prodigi "default", Printful "default".
export type PrintFile = { area: string; url: string; source: "design" | "customer" | "admin"; width?: number; height?: number };

// A problem that stops (blocker) or should hold (warning) an item until an admin looks at it.
// blocker: cannot be sent; warning: held until an admin decides ("Send anyway"); info: shown in admin only,
// the print order is still sent automatically.
export type PodIssue = { code: string; severity: "blocker" | "warning" | "info"; message: string };

export type Recipient = {
  name: string;
  email: string;
  phone: string | null;
  address1: string;
  address2: string | null;
  city: string;
  postalCode: string;
  countryCode: string; // ISO 3166-1 alpha-2
  state: string | null;
};

// One line as a print shop sees it: its product reference and print files.
export type SubmissionLine = {
  itemId: string;
  productRef: string;
  quantity: number;
  files: PrintFile[];
  name: string;
};

export type SubmissionInput = {
  reference: string; // our idempotency key / external order id
  orderNumber: string;
  mode: PodMode;
  recipient: Recipient;
  lines: SubmissionLine[];
  shipping: "standard" | "express";
};

export type ProviderOrderState = {
  providerOrderId: string;
  providerStatus: string;
  status: PodFulfillmentStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  // A problem the print shop reports on the order (failed, on hold, a file it could not use…), shown to the
  // admin; null when the shop reports none. Undefined when the shop gives no such information.
  problem?: string | null;
  // Every shipment the shop reports (several for a partial shipment or several parcels), with dates,
  // estimates and tracking events. Undefined when this reading has no shipment information (e.g. the
  // answer to a create call); carrier / trackingNumber / trackingUrl above are the main shipment's.
  tracking?: TrackingInfo;
  raw?: unknown;
};

export interface PodAdapter {
  provider: PodProvider;
  // Missing credentials or setup for this mode, or null when the adapter can be used.
  configurationProblem(mode: PodMode): string | null;
  submit(input: SubmissionInput): Promise<ProviderOrderState>;
  // Looks an order up by our reference, to recover from a submission whose outcome is unknown.
  findByReference(reference: string, mode: PodMode): Promise<ProviderOrderState | null>;
  fetchStatus(providerOrderId: string, mode: PodMode): Promise<ProviderOrderState | null>;
  // Cancels the order at the shop. Resolves with the order's state (CANCELLED) or throws a PodApiError
  // explaining why it cannot be cancelled (usually: already in production).
  cancel(providerOrderId: string, mode: PodMode): Promise<ProviderOrderState>;
  // Turns a draft into a real production order (Gelato, Printful). Absent when the shop has no drafts.
  confirmDraft?(providerOrderId: string): Promise<ProviderOrderState>;
}
