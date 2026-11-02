// Shared types of the print-on-demand (POD) layer. Everything under lib/pod is
// server-only except catalog.ts / artwork.ts / status.ts, which are pure and unit tested.
import type { PodFulfillmentStatus, PodProvider } from "@prisma/client";

export type { PodFulfillmentStatus, PodProvider };

// "draft": nothing is produced or charged (Gelato draft, Printful unconfirmed order,
// Prodigi sandbox). "live": real production orders.
export type PodMode = "draft" | "live";

// One print file the shop needs for an item, e.g. Prodigi "default", Printful "default".
export type PrintFile = { area: string; url: string; source: "design" | "customer" | "admin"; width?: number; height?: number };

// A problem that stops (blocker) or should hold (warning) an item until an admin looks at it.
export type PodIssue = { code: string; severity: "blocker" | "warning"; message: string };

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
  // Turns a draft into a real production order (Gelato, Printful). Absent when the shop has no drafts.
  confirmDraft?(providerOrderId: string): Promise<ProviderOrderState>;
}
