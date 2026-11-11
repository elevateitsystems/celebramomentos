import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unavailableCombination, type ItemContext } from "@/lib/pod/catalog";
import { parseGelatoOrder } from "@/lib/pod/providers/gelato";
import { PRINTFUL_WEBHOOK_TYPES, parsePrintfulOrder, registerPrintfulWebhook } from "@/lib/pod/providers/printful";
import { parseProdigiOrder, prodigiAdapter } from "@/lib/pod/providers/prodigi";

type Call = { url: string; init: RequestInit };
function fakeFetch(responses: { status: number; body: unknown }[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const next = responses.shift() || { status: 200, body: {} };
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { "content-type": "application/json" } });
  });
  return { impl, calls };
}

const saved = { ...process.env };
beforeEach(() => { Object.assign(process.env, { PRODIGI_SANDBOX_API_KEY: "sandbox-key", PRINTFUL_PRIVATE_TOKEN: "pf-token", PRINTFUL_STORE_ID: "18975889" }); });
afterEach(() => { process.env = { ...saved }; });

describe("Prodigi", () => {
  it("finds an order by our reference (GET /Orders?merchantReferences=) to recover an interrupted send", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { outcome: "Ok", orders: [{ id: "ord_9", merchantReference: "CM-1-ABC-PRD", status: { stage: "InProgress" } }] } }, { status: 200, body: { outcome: "Ok", orders: [] } }]);
    const adapter = prodigiAdapter(impl);
    expect(await adapter.findByReference("CM-1-ABC-PRD", "draft")).toMatchObject({ providerOrderId: "ord_9", status: "SUBMITTED" });
    expect(calls[0].url).toBe("https://api.sandbox.prodigi.com/v4.0/Orders?merchantReferences=CM-1-ABC-PRD&top=5");
    expect(await adapter.findByReference("CM-NOPE-PRD", "draft")).toBeNull();
  });

  it("reports the problems Prodigi finds (issues, failed steps) and clears them when there are none", () => {
    const withIssue = parseProdigiOrder({ id: "o", status: { stage: "InProgress", details: { downloadAssets: "Error" }, issues: [{ errorCode: "items.assets.NotDownloaded", description: "Asset could not be downloaded" }] } });
    expect(withIssue.problem).toBe("Prodigi reports: items.assets.NotDownloaded: Asset could not be downloaded · downloadAssets failed");
    expect(parseProdigiOrder({ id: "o", status: { stage: "InProgress", details: { downloadAssets: "Complete" }, issues: [] } }).problem).toBeNull();
  });
});

describe("Printful and Gelato order problems", () => {
  it("flags failed and on-hold orders for the admin", () => {
    expect(parsePrintfulOrder({ id: 1, status: "failed" })).toMatchObject({ status: "FAILED", problem: expect.stringContaining("failed") });
    expect(parsePrintfulOrder({ id: 1, status: "onhold" })).toMatchObject({ status: "IN_PRODUCTION", problem: expect.stringContaining("on hold") });
    expect(parsePrintfulOrder({ id: 1, status: "fulfilled" }).problem).toBeNull();
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "on_hold" }).problem).toContain("on hold");
    expect(parseGelatoOrder({ id: "g", fulfillmentStatus: "delivered" })).toMatchObject({ status: "DELIVERED", problem: null });
  });

  it("registers the Printful webhook for the order events we handle", async () => {
    const { impl, calls } = fakeFetch([{ status: 200, body: { result: { url: "https://shop.example/api/webhooks/printful?token=x", types: [...PRINTFUL_WEBHOOK_TYPES] } } }]);
    const result = await registerPrintfulWebhook("https://shop.example/api/webhooks/printful?token=x", impl);
    expect(calls[0].url).toBe("https://api.printful.com/webhooks");
    expect(calls[0].init.method).toBe("POST");
    expect(new Headers(calls[0].init.headers).get("X-PF-Store-Id")).toBe("18975889");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ url: "https://shop.example/api/webhooks/printful?token=x", types: [...PRINTFUL_WEBHOOK_TYPES], params: [] });
    expect(result.types).toContain("package_shipped");
  });
});

describe("combinations the print shop cannot make", () => {
  const poster = (variantName: string, orientation: string): ItemContext => ({ kind: "WALL_ART", provider: "GELATO", productName: "Póster", variantName, podSku: null, options: { orientacion: orientation, colgador: "Madera natural" }, photoCount: 1, cardSize: null, cardSku: null });

  it("allows sizes Gelato makes", () => {
    expect(unavailableCombination(poster("30 x 40 cm", "Vertical"))).toBeNull();
    expect(unavailableCombination(poster("A1 (59.4 x 84.1 cm)", "Vertical"))).toBeNull();
  });

  it("names the orientation that exists when only one does (Gelato has A0/A1 in portrait only)", () => {
    expect(unavailableCombination(poster("A1 (59.4 x 84.1 cm)", "Horizontal"))).toEqual({ reason: "orientation", available: "Vertical" });
  });

  it("refuses a size Gelato does not make at all", () => {
    expect(unavailableCombination(poster("21 x 21.97 cm", "Vertical"))).toEqual({ reason: "size" });
  });

  it("leaves phone cases and cards to their own checks", () => {
    expect(unavailableCombination({ ...poster("x", "Vertical"), kind: "PHONE_CASE", provider: "PRINTEERS" })).toBeNull();
  });
});
