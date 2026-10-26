// Minimal PayPal Orders v2 client (server-side only). The client secret never
// leaves the server: customers are redirected to PayPal's approval page and the
// capture happens here after they return.

const PAYPAL_HOSTS = { sandbox: "https://api-m.sandbox.paypal.com", live: "https://api-m.paypal.com" } as const;

export class PayPalError extends Error {
  constructor(message: string, readonly status: number, readonly issue?: string, readonly debugId?: string) {
    super(message);
    this.name = "PayPalError";
  }
}

function config() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const mode = (process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase();
  if (!clientId || !clientSecret || clientId.includes("replace") || clientSecret.includes("replace")) throw new Error("PayPal is not configured");
  if (mode !== "sandbox" && mode !== "live") throw new Error("PAYPAL_MODE must be sandbox or live");
  return { clientId, clientSecret, baseUrl: PAYPAL_HOSTS[mode] };
}

export function assertPayPalConfigured() {
  config();
}

let cachedToken: { value: string; expiresAt: number; key: string } | null = null;

async function accessToken() {
  const { clientId, clientSecret, baseUrl } = config();
  const key = `${baseUrl}:${clientId}`;
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !body.access_token) throw new PayPalError(body.error_description || "PayPal authentication failed", response.status);
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in || 300) * 1000, key };
  return body.access_token;
}

async function paypalRequest<T>(path: string, init: { method: "GET" | "POST"; body?: unknown; requestId?: string }) {
  const { baseUrl } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      // PayPal-Request-Id makes create/capture idempotent on PayPal's side.
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as T & { message?: string; debug_id?: string; details?: { issue?: string; description?: string }[] };
  if (!response.ok) {
    const issue = body.details?.[0]?.issue;
    throw new PayPalError(body.details?.[0]?.description || body.message || `PayPal request failed (${response.status})`, response.status, issue, body.debug_id);
  }
  return body as T;
}

export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: { href: string; rel: string; method?: string }[];
  purchase_units?: {
    reference_id?: string;
    custom_id?: string;
    amount?: { currency_code: string; value: string };
    payments?: { captures?: PayPalCapture[] };
  }[];
};

export type PayPalCapture = {
  id: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  amount: { currency_code: string; value: string };
  custom_id?: string;
  status_details?: { reason?: string };
};

const money = (cents: number) => (cents / 100).toFixed(2);

export function toCents(value: string) {
  return Math.round(Number(value) * 100);
}

export async function createPayPalOrder(input: {
  orderId: string;
  orderNumber: string;
  items: { name: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  returnUrl: string;
  cancelUrl: string;
  requestId: string;
}) {
  return paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: input.requestId,
    body: {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: input.orderId,
        custom_id: input.orderId,
        invoice_id: input.orderNumber,
        description: `Celebra Momentos ${input.orderNumber}`,
        amount: {
          currency_code: "EUR",
          value: money(input.totalCents),
          breakdown: {
            item_total: { currency_code: "EUR", value: money(input.subtotalCents) },
            shipping: { currency_code: "EUR", value: money(input.shippingCents) },
            discount: { currency_code: "EUR", value: money(input.discountCents) },
          },
        },
        items: input.items.map((item) => ({
          name: item.name.slice(0, 127),
          quantity: String(item.quantity),
          unit_amount: { currency_code: "EUR", value: money(item.unitPriceCents) },
          category: "PHYSICAL_GOODS",
        })),
      }],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Celebra Momentos",
            locale: "es-ES",
            landing_page: "LOGIN",
            // The shipping address is collected and stored by our own checkout.
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    },
  });
}

export function approvalUrl(order: PayPalOrder) {
  return order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href || null;
}

export async function getPayPalOrder(paypalOrderId: string) {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: "GET" });
}

export async function capturePayPalOrder(paypalOrderId: string, requestId: string) {
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, { method: "POST", requestId, body: {} });
}

export function firstCapture(order: PayPalOrder) {
  return order.purchase_units?.[0]?.payments?.captures?.[0] || null;
}
