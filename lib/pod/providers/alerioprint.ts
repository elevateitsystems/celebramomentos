// AlerioPrint External API — spec: https://create.alerioprint.com/backend/api/docs/external-api.yaml
// Auth: X-API-KEY. Base: https://create.alerioprint.com/backend/api/external.
//
// What the documented API supports (checked 2026-11-01):
// - POST /designs (multipart: title, productId, file) → design id
// - POST /orders → adds an UNPAID order to the Alerio cart; `orderName` must be unique
//   (409 on a duplicate). Payment is completed manually by the shop owner in Alerio.
// - No order status, tracking or webhook endpoints are documented, so fulfilment
//   updates for AlerioPrint have to be entered by hand in admin → Print orders.
// - Order lines need `productAssetId` (the phone model id), which no endpoint lists;
//   see alerioprint-assets.ts.
import { alerioConfig } from "../config";
import { PodApiError, podRequest, type FetchLike } from "../http";
import type { PodAdapter, ProviderOrderState, SubmissionInput } from "../types";

type AlerioResponse<T> = { success: boolean; message?: string; data?: T };
type AlerioCreatedOrder = { id: number; name: string; status?: { id?: number | null; name?: string | null } };

export function parseAlerioOrder(order: AlerioCreatedOrder): ProviderOrderState {
  return { providerOrderId: String(order.id), providerStatus: order.status?.name || "in cart (unpaid)", status: "SUBMITTED" };
}

export function buildAlerioOrder(input: SubmissionInput, designIds: number[], deliveryOption: number) {
  return {
    orderName: input.reference,
    orders: input.lines.map((line, index) => {
      const [productId, productAssetId] = line.productRef.split(":").map(Number);
      return { productId, productAssetId, designId: designIds[index], count: line.quantity, giftMessage: null, includePremiumBag: false };
    }),
    deliveryData: {
      fullName: input.recipient.name,
      addressLine1: input.recipient.address1,
      addressLine2: input.recipient.address2,
      city: input.recipient.city,
      state: input.recipient.state,
      zipCode: input.recipient.postalCode,
      country: input.recipient.countryCode,
      phone: input.recipient.phone,
      email: input.recipient.email,
      deliveryOption,
    },
  };
}

export function alerioAdapter(fetchImpl: FetchLike = fetch): PodAdapter {
  const headers = () => ({ "X-API-KEY": alerioConfig().apiKey || "", Accept: "application/json" });

  // Uploads the print file as a permanent Alerio design and returns its id.
  const uploadDesign = async (title: string, productId: number, fileUrl: string) => {
    const file = await fetchImpl(fileUrl);
    if (!file.ok) throw new PodApiError("ALERIO_PRINT", null, `The print file could not be downloaded (HTTP ${file.status})`, file.status >= 500);
    const type = file.headers.get("content-type") || "image/png";
    const form = new FormData();
    form.append("title", title.slice(0, 250));
    form.append("productId", String(productId));
    form.append("file", new Blob([await file.arrayBuffer()], { type }), type.includes("png") ? "design.png" : "design.jpg");
    const { body } = await podRequest<AlerioResponse<{ id: number }>>("ALERIO_PRINT", `${alerioConfig().baseUrl}/designs`, { method: "POST", body: form, headers: headers(), fetchImpl, timeoutMs: 45_000 });
    if (!body.success || !body.data?.id) throw new PodApiError("ALERIO_PRINT", 200, `AlerioPrint did not store the design: ${body.message || "no id"}`, false);
    return body.data.id;
  };

  return {
    provider: "ALERIO_PRINT",
    configurationProblem(mode) {
      if (!alerioConfig().apiKey) return "ALERIOPRINT_API_KEY is not set";
      // Alerio has no test mode: every order lands in the real Alerio cart.
      return mode === "live" ? null : "AlerioPrint has no test mode (orders go straight to your Alerio cart), so it is only used when POD_ORDER_MODE=live";
    },
    async submit(input) {
      const designIds: number[] = [];
      for (const line of input.lines) {
        const file = line.files[0];
        if (!file) throw new PodApiError("ALERIO_PRINT", null, `Line ${line.name} has no print file`, false);
        designIds.push(await uploadDesign(`${input.orderNumber} · ${line.name}`, Number(line.productRef.split(":")[0]), file.url));
      }
      try {
        const { body } = await podRequest<AlerioResponse<{ order?: AlerioCreatedOrder }>>("ALERIO_PRINT", `${alerioConfig().baseUrl}/orders`, {
          method: "POST",
          body: JSON.stringify(buildAlerioOrder(input, designIds, alerioConfig().deliveryOption)),
          headers: { ...headers(), "Content-Type": "application/json" },
          fetchImpl,
        });
        if (!body.success || !body.data?.order?.id) throw new PodApiError("ALERIO_PRINT", 200, `AlerioPrint did not create the order: ${body.message || "no id"}`, false);
        return { ...parseAlerioOrder(body.data.order), raw: { id: body.data.order.id, status: body.data.order.status } };
      } catch (reason) {
        // orderName is unique per Alerio user: a 409 means this order was already added to the cart.
        if (reason instanceof PodApiError && reason.status === 409) return { providerOrderId: input.reference, providerStatus: "already in Alerio cart", status: "SUBMITTED" };
        throw reason;
      }
    },
    async findByReference() { return null; },
    // No status endpoint is documented.
    async fetchStatus() { return null; },
  };
}
