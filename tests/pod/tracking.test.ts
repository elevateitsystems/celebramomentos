import { describe, expect, it } from "vitest";
import { parseGelatoOrder } from "@/lib/pod/providers/gelato";
import { parsePrintfulOrder, type PrintfulV2Shipment } from "@/lib/pod/providers/printful";
import { printeersAdapter } from "@/lib/pod/providers/printeers";
import { parseProdigiOrder } from "@/lib/pod/providers/prodigi";
import { EMPTY_TRACKING, itemShipping, latestEvent, mergeTracking, readTracking, resolveItems, trackingDates, withStatusChange, type Shipment, type TrackingInfo } from "@/lib/pod/tracking";

// Fixtures. PRODIGI_SANDBOX_ORDER is a real response of the Prodigi sandbox (GET /v4.0/Orders/ord_1198751,
// recorded 2026-11-11, recipient removed). The others are built from the shops' documented fields (their
// test environments never ship, so no real shipped response exists to record).
const PRODIGI_SANDBOX_ORDER = {
  id: "ord_1198751",
  merchantReference: "CM-1794376243010-ED11EB33-PRD",
  status: { stage: "Complete", issues: [], details: { downloadAssets: "Complete", printReadyAssetsPrepared: "Complete", allocateProductionLocation: "Complete", inProduction: "Complete", shipping: "Complete" } },
  shipments: [{ id: "shp_755964", dispatchDate: "2026-11-11T06:02:02.26Z", carrier: { name: "Guernsey Post", service: "Guernsey Post International" }, fulfillmentLocation: { countryCode: "GB", labCode: "uk7" }, tracking: { number: "PH000000000GB", url: "https://www.royalmail.com/portal/rm/track?trackNumber=PH000000000GB" }, items: [{ itemId: "ori_1685822" }], status: "Shipped" }],
  items: [{ id: "ori_1685822", merchantReference: "cmitem1" }],
};

const shipment = (patch: Partial<Shipment> = {}): Shipment => ({ id: "s1", carrier: "GLS", service: null, trackingNumber: "T1", trackingUrl: "https://track.example/T1", status: "shipped", shippedAt: "2026-11-10T08:00:00.000Z", deliveredAt: null, estimatedDelivery: null, location: null, items: [], events: [], ...patch });
const info = (shipments: Shipment[], patch: Partial<TrackingInfo> = {}): TrackingInfo => ({ ...EMPTY_TRACKING, shipments, ...patch });

describe("merging tracking readings", () => {
  it("keeps every event once, oldest first, whoever reported it (webhook and scheduled check)", () => {
    const first = info([shipment({ events: [{ at: "2026-11-10T08:00:00Z", description: "Shipped", location: null }] })]);
    const second = info([shipment({ events: [{ at: "2026-11-11T09:00:00Z", description: "In transit", location: "Madrid" }, { at: "2026-11-10T08:00:00Z", description: "shipped", location: null }] })]);
    const merged = mergeTracking(mergeTracking(EMPTY_TRACKING, first), second);
    expect(merged.shipments).toHaveLength(1);
    expect(merged.shipments[0].events.map((event) => event.description)).toEqual(["Shipped", "In transit"]);
    // Reading the same thing again changes nothing.
    expect(mergeTracking(merged, second)).toEqual(merged);
  });

  it("keeps several shipments (partial shipment) and a value a later reading leaves out", () => {
    const first = mergeTracking(EMPTY_TRACKING, info([shipment()]));
    const merged = mergeTracking(first, info([shipment({ trackingUrl: null, carrier: null }), shipment({ id: "s2", trackingNumber: "T2" })]));
    expect(merged.shipments.map((item) => item.id)).toEqual(["s1", "s2"]);
    expect(merged.shipments[0]).toMatchObject({ trackingUrl: "https://track.example/T1", carrier: "GLS" });
  });

  it("never moves a shipment back from delivered", () => {
    const delivered = mergeTracking(EMPTY_TRACKING, info([shipment({ status: "delivered", deliveredAt: "2026-11-12T10:00:00.000Z" })]));
    expect(mergeTracking(delivered, info([shipment({ status: "in_transit" })])).shipments[0].status).toBe("delivered");
  });

  it("drops anything malformed or not https when reading what is stored", () => {
    const stored = readTracking({ shipments: [{ id: "x", trackingUrl: "javascript:alert(1)", status: "bogus", events: [{ description: "ok", at: "nope" }, { at: "2026-01-01" }] }, { nope: true }], estimatedDelivery: { from: "2026-11-14" } });
    expect(stored.shipments).toHaveLength(1);
    expect(stored.shipments[0]).toMatchObject({ trackingUrl: null, status: "unknown", events: [{ description: "ok", at: null }] });
    expect(stored.estimatedDelivery).toEqual({ from: "2026-11-14T00:00:00.000Z", to: null });
    expect(readTracking("garbage")).toEqual({ ...EMPTY_TRACKING, history: [] });
  });

  it("records status changes seen by a sync, once", () => {
    const at = new Date("2026-11-11T10:00:00Z");
    const once = withStatusChange(EMPTY_TRACKING, "InProgress", "Complete", "Prodigi", at);
    expect(once.history).toEqual([{ at: at.toISOString(), description: "Prodigi: Complete", location: null }]);
    expect(withStatusChange(once, "Complete", "Complete", "Prodigi", at)).toBe(once);
    expect(mergeTracking(once, once).history).toHaveLength(1);
  });
});

describe("items and dates", () => {
  const items = [{ id: "a", podProductRef: "SKU-A" }, { id: "b", podProductRef: "SKU-B" }];

  it("matches shipment lines to our items by line reference (incl. multi-unit '<id>-<n>') or SKU", () => {
    const resolved = resolveItems(info([shipment({ items: [{ itemId: "a-2", quantity: 1 }, { itemId: null, sku: "SKU-B", quantity: 1 }, { itemId: "zzz", quantity: 1 }] })]), items);
    expect(resolved.shipments[0].items.map((line) => line.itemId)).toEqual(["a", "b", null]);
  });

  it("knows which items of a partially shipped order have left", () => {
    const partial = info([shipment({ items: [{ itemId: "a", quantity: 1 }] })]);
    expect(itemShipping(partial, ["a", "b"])).toEqual([{ itemId: "a", state: "shipped", shipmentIds: ["s1"] }, { itemId: "b", state: "pending", shipmentIds: [] }]);
    // No item breakdown from the shop: every item shares the order's shipments.
    expect(itemShipping(info([shipment({ status: "delivered" })]), ["a", "b"]).map((entry) => entry.state)).toEqual(["delivered", "delivered"]);
  });

  it("dates: first dispatch, and delivery only once every shipment arrived", () => {
    const two = info([shipment({ shippedAt: "2026-11-10T08:00:00.000Z", status: "delivered", deliveredAt: "2026-11-12T10:00:00.000Z" }), shipment({ id: "s2", trackingNumber: "T2", shippedAt: "2026-11-11T08:00:00.000Z" })]);
    expect(trackingDates(two)).toEqual({ shippedAt: "2026-11-10T08:00:00.000Z", deliveredAt: null });
    two.shipments[1] = { ...two.shipments[1], status: "delivered", deliveredAt: "2026-11-13T09:00:00.000Z" };
    expect(trackingDates(two).deliveredAt).toBe("2026-11-13T09:00:00.000Z");
    expect(latestEvent(EMPTY_TRACKING)).toBeNull();
  });
});

describe("Prodigi", () => {
  it("reads the real sandbox shipment: carrier, tracking, dispatch date, lab country and our item", () => {
    const state = parseProdigiOrder(PRODIGI_SANDBOX_ORDER);
    expect(state).toMatchObject({ status: "SHIPPED", carrier: "Guernsey Post · Guernsey Post International", trackingNumber: "PH000000000GB" });
    expect(state.tracking!.shipments[0]).toMatchObject({ id: "shp_755964", status: "shipped", shippedAt: "2026-11-11T06:02:02.260Z", location: "Dispatched from GB", items: [{ itemId: "cmitem1" }], deliveredAt: null, estimatedDelivery: null });
    expect(state.tracking!.shipments[0].events).toEqual([{ at: "2026-11-11T06:02:02.260Z", description: "Dispatched by the Prodigi lab uk7", location: "GB" }]);
  });

  it("an order with one of two shipments sent is still in production (partial shipment)", () => {
    const order = { ...PRODIGI_SANDBOX_ORDER, status: { stage: "InProgress", details: { inProduction: "Complete", shipping: "InProgress" } }, shipments: [...PRODIGI_SANDBOX_ORDER.shipments, { id: "shp_2", status: "Processing", items: [{ itemId: "ori_2" }] }] };
    const state = parseProdigiOrder(order);
    expect(state.status).toBe("IN_PRODUCTION");
    expect(state.providerStatus).toBe("InProgress · partially shipped (1 of 2)");
    expect(state.trackingNumber).toBe("PH000000000GB");
  });
});

describe("Printful", () => {
  // v1 order (GET /orders/{id}) and v2 shipments (GET /v2/orders/{id}/shipments), documented fields.
  const order = { id: 186017679, status: "fulfilled", items: [{ id: 501, external_id: "cmitem1" }, { id: 502, external_id: "cmitem2" }], shipments: [{ id: 10, carrier: "GLS", service: "GLS Standard", tracking_number: "GLS123", tracking_url: "https://gls-group.eu/track/GLS123", ship_date: "2026-11-10", shipped_at: 1794297600, reshipment: false, items: [{ item_id: 501, quantity: 1 }, { item_id: 502, quantity: 1 }] }] };
  const v2: PrintfulV2Shipment[] = [{ id: 10, shipment_status: "shipped", shipped_at: "2026-11-10T08:00:00Z", delivery_status: "in_transit", delivered_at: null, departure_address: { country_code: "ES", country_name: "Spain" }, tracking_url: "https://gls-group.eu/track/GLS123", tracking_events: [{ triggered_at: "2026-11-10T08:00:00Z", description: "Parcel handed to GLS" }, { triggered_at: "2026-11-11T07:30:00Z", description: "Out for delivery" }], estimated_delivery: { from_date: "2026-11-12", to_date: "2026-11-13" }, shipment_items: [{ order_item_id: 501, order_item_external_id: "cmitem1", quantity: 1 }, { order_item_id: 502, order_item_external_id: "cmitem2", quantity: 1 }] }];

  it("combines v1 shipments with the v2 delivery status, estimate and carrier events", () => {
    const state = parsePrintfulOrder(order, v2);
    expect(state).toMatchObject({ status: "SHIPPED", carrier: "GLS · GLS Standard", trackingNumber: "GLS123", trackingUrl: "https://gls-group.eu/track/GLS123" });
    expect(state.tracking!.shipments[0]).toMatchObject({ id: "10", status: "in_transit", estimatedDelivery: { from: "2026-11-12T00:00:00.000Z", to: "2026-11-13T00:00:00.000Z" }, items: [{ itemId: "cmitem1", quantity: 1 }, { itemId: "cmitem2", quantity: 1 }] });
    expect(state.tracking!.shipments[0].events.map((event) => event.description)).toEqual(["Parcel handed to GLS", "Out for delivery"]);
    expect(state.tracking!.estimatedDelivery).toEqual({ from: "2026-11-12T00:00:00.000Z", to: "2026-11-13T00:00:00.000Z" });
  });

  it("is delivered when every shipment is delivered; works from v1 alone when v2 could not be read", () => {
    expect(parsePrintfulOrder(order, [{ ...v2[0], delivery_status: "delivered", delivered_at: "2026-11-12T12:00:00Z" }]).status).toBe("DELIVERED");
    const v1Only = parsePrintfulOrder(order);
    expect(v1Only.status).toBe("SHIPPED");
    expect(v1Only.tracking!.shipments[0]).toMatchObject({ status: "shipped", shippedAt: "2026-11-10T08:00:00.000Z", items: [{ itemId: "cmitem1" }, { itemId: "cmitem2" }] });
  });

  it("a partially shipped order stays in production with one shipment listed", () => {
    const state = parsePrintfulOrder({ ...order, status: "partial", shipments: [{ ...order.shipments[0], items: [{ item_id: 501, quantity: 1 }] }] });
    expect(state.status).toBe("IN_PRODUCTION");
    expect(state.providerStatus).toMatch(/^partial · 1 shipment sent/);
    expect(itemShipping(state.tracking!, ["cmitem1", "cmitem2"]).map((entry) => entry.state)).toEqual(["shipped", "pending"]);
  });
});

describe("Gelato", () => {
  it("reads packages, the delivery window and the dispatch date", () => {
    const state = parseGelatoOrder({
      id: "g-1", fulfillmentStatus: "shipped", shippedAt: "2026-11-10T09:00:00+00:00", expectedDispatchDate: "2026-11-10",
      items: [{ id: "gi-1", itemReferenceId: "cmitem1", fulfillmentStatus: "shipped" }],
      shipment: { id: "gs-1", shipmentMethodName: "DHL Parcel", minDeliveryDate: "2026-11-12", maxDeliveryDate: "2026-11-14", fulfillmentCountry: "ES", packages: [{ id: "pk-1", trackingCode: "DHL777", trackingUrl: "https://www.dhl.com/track?id=DHL777", orderItemIds: ["gi-1"] }] },
    });
    expect(state).toMatchObject({ status: "SHIPPED", carrier: "DHL Parcel", trackingNumber: "DHL777" });
    expect(state.tracking).toMatchObject({ estimatedDelivery: { from: "2026-11-12T00:00:00.000Z", to: "2026-11-14T00:00:00.000Z" }, expectedDispatch: "2026-11-10T00:00:00.000Z" });
    expect(state.tracking!.shipments[0]).toMatchObject({ id: "pk-1", status: "shipped", location: "Dispatched from ES", items: [{ itemId: "cmitem1" }] });
  });

  it("delivered order and webhook-style item fulfillments (no duplicate for the same tracking code)", () => {
    const state = parseGelatoOrder({
      id: "g-1", fulfillmentStatus: "delivered",
      items: [{ id: "gi-1", itemReferenceId: "cmitem1", fulfillmentStatus: "delivered", fulfillments: [{ trackingCode: "DHL777", trackingUrl: "https://www.dhl.com/track?id=DHL777", shipmentMethodName: "DHL Parcel" }] }],
      shipment: { packages: [{ id: "pk-1", trackingCode: "DHL777", trackingUrl: "https://www.dhl.com/track?id=DHL777", orderItemIds: ["gi-1"] }] },
    });
    expect(state.status).toBe("DELIVERED");
    expect(state.tracking!.shipments).toHaveLength(1);
    expect(state.tracking!.shipments[0].status).toBe("delivered");
  });

  it("a draft has no shipment and no tracking", () => {
    const state = parseGelatoOrder({ id: "g-2", fulfillmentStatus: "draft", shipment: { packages: [], minDeliveryDate: null } });
    expect(state.tracking).toEqual({ shipments: [], estimatedDelivery: null, expectedDispatch: null });
  });
});

describe("Printeers", () => {
  it("reads each shipment with its lines (matched by SKU) and the expected dispatch", async () => {
    const order = {
      reference: "S00103767A-9", custom_reference: null, status: "open", status_code: "partially_shipped", status_human_readable: "Partially shipped", expected_shipping: "2026-11-12T00:00:00Z",
      lines: [{ linenumber: 1, item_sku: "B67760000", quantity: 1, canceled_quantity: 0, shipped_quantity: 1 }, { linenumber: 2, item_sku: "B12340000", quantity: 1, canceled_quantity: 0, shipped_quantity: 0 }],
      shipments: [{ created: "2026-11-11T10:00:00Z", shipper: "PostNL", shipping_method: "ParcelPremium", track_and_trace_code: "3SABC123", track_and_trace_url: "https://jouw.postnl.nl/track-and-trace/3SABC123", lines: [{ linenumber: 1, quantity: 1 }] }],
    };
    const fetchImpl = async () => new Response(JSON.stringify(order), { status: 200 });
    process.env.PRINTEERS_V1_TEST_API_KEY = "k"; process.env.PRINTEERS_V1_TEST_PARTNER_CODE = "TESTCODE";
    const state = await printeersAdapter(fetchImpl as never).fetchStatus("S00103767A-9", "draft");
    expect(state).toMatchObject({ status: "IN_PRODUCTION", carrier: "PostNL · ParcelPremium", trackingNumber: "3SABC123" });
    expect(state!.tracking).toMatchObject({ expectedDispatch: "2026-11-12T00:00:00.000Z", shipments: [{ status: "shipped", shippedAt: "2026-11-11T10:00:00.000Z", items: [{ itemId: null, sku: "B67760000", quantity: 1 }] }] });
    const resolved = resolveItems(state!.tracking!, [{ id: "case1", podProductRef: "B67760000" }, { id: "case2", podProductRef: "B12340000" }]);
    expect(itemShipping(resolved, ["case1", "case2"]).map((entry) => entry.state)).toEqual(["shipped", "pending"]);
  });
});
