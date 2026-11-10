import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Saving a phone case in admin must keep the Printeers product group it is linked to; before, the route
// rebuilt the metadata without it, so every saved case became "not available" on the shop.
const saved = vi.hoisted(() => ({ created: [] as { metadata: unknown }[], updated: [] as { metadata?: unknown }[], current: { kind: "PHONE_CASE", metadata: { photoCount: 1, provider: "PRINTEERS", printeers: { test: "soft-case-back-printed-transparent" } } } as { kind: string; metadata: unknown } | null }));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/server/auth", () => ({ requireAdmin: async () => ({ error: null, admin: { id: "local-admin" } }) }));
vi.mock("@/lib/server/prisma", () => {
  const tx = {
    product: {
      create: async ({ data }: { data: { metadata: unknown } }) => { saved.created.push(data); return { id: "p1", slug: "funda", name: "Funda", kind: "PHONE_CASE" }; },
      update: async ({ data }: { data: { metadata?: unknown } }) => { saved.updated.push(data); return { id: "p1", slug: "funda", name: "Funda", kind: "PHONE_CASE" }; },
      findUniqueOrThrow: async () => ({ id: "p1", kind: "PHONE_CASE" }),
    },
    productImage: { create: async () => ({}), deleteMany: async () => ({}) },
    productVariant: { findMany: async () => [], create: async () => ({}), updateMany: async () => ({}), update: async () => ({}) },
    personalizationOption: { deleteMany: async () => ({}), createMany: async () => ({}) },
    auditLog: { create: async () => ({}) },
  };
  return { prisma: { ...tx, product: { ...tx.product, findFirst: async () => saved.current }, $transaction: async (run: (client: typeof tx) => unknown) => run(tx) } };
});

import { PATCH, POST } from "@/app/api/admin/products/route";

const request = (method: string, body: unknown, query = "") => new NextRequest(`http://localhost/api/admin/products${query}`, { method, body: JSON.stringify(body) });
const base = { slug: "funda", name: "Funda", kind: "PHONE_CASE", basePriceCents: 2199, active: true };

beforeEach(() => { saved.created = []; saved.updated = []; });

describe("admin products keep the Printeers link of phone cases", () => {
  it("stores the linked groups when a phone case is created", async () => {
    const response = await POST(request("POST", { ...base, metadata: { photoCount: 1, provider: "PRINTEERS", printeers: { test: "soft-case-back-printed-transparent", live: null } } }));
    expect(response.status).toBe(201);
    expect(saved.created[0].metadata).toEqual({ photoCount: 1, provider: "PRINTEERS", printeers: { test: "soft-case-back-printed-transparent" } });
  });

  it("keeps it when the case is edited, and drops a link the admin cleared", async () => {
    await PATCH(request("PATCH", { name: "Funda 2", metadata: { photoCount: 1, provider: "PRINTEERS", printeers: { test: "tough-case-fully-printed-black" } } }, "?id=p1"));
    expect(saved.updated[0].metadata).toMatchObject({ printeers: { test: "tough-case-fully-printed-black" } });
    await PATCH(request("PATCH", { metadata: { photoCount: 1, provider: "PRINTEERS", printeers: { test: null, live: null } } }, "?id=p1"));
    expect((saved.updated[1].metadata as Record<string, unknown>).printeers).toBeUndefined();
  });

  it("never adds a link to products that are not phone cases", async () => {
    await POST(request("POST", { ...base, kind: "MUG", metadata: { photoCount: 1, provider: "PRINTFUL", printeers: { test: "soft-case-back-printed-transparent" } } }));
    expect((saved.created[0].metadata as Record<string, unknown>).printeers).toBeUndefined();
  });
});
