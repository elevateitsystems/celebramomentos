// Prefills Stripe Checkout with what the customer already typed on our checkout page.
//
// The session is created for a Stripe Customer holding the details instead of just
// `customer_email`. Checked on Stripe's hosted page in test mode (2026-11-08): it prefills the
// email (read-only) and the billing country from the Customer; it does NOT prefill the
// cardholder name (a field Stripe always asks for on that page). The name, phone, billing and
// shipping address are still stored on the Customer, so they appear on the payment in the
// Stripe Dashboard and on receipts. One Stripe Customer per shop account: it is found by
// email and our account id (metadata.appCustomerId), updated with the latest details, or
// created. No card data is ever handled here: card details are entered on Stripe's page.
import { createHash } from "crypto";
import type Stripe from "stripe";

export type CheckoutContact = {
  name: string; email: string; phone: string; recipient: string;
  address: string; city: string; postalCode: string; country: "ES" | "PT"; billingAddress?: string;
};

export function stripeCustomerDetails(appCustomerId: string, input: CheckoutContact): Stripe.CustomerCreateParams {
  const shippingAddress = { line1: input.address.trim(), city: input.city.trim(), postal_code: input.postalCode.trim(), country: input.country };
  // The optional billing address is free text we cannot split into Stripe's fields, so the
  // billing address is only prefilled when it is the shipping address.
  const billingIsShipping = !input.billingAddress?.trim();
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    phone: input.phone.trim(),
    ...(billingIsShipping ? { address: shippingAddress } : {}),
    shipping: { name: input.recipient.trim(), phone: input.phone.trim(), address: shippingAddress },
    metadata: { appCustomerId },
  };
}

export async function stripeCustomerFor(stripe: Stripe, appCustomerId: string, input: CheckoutContact): Promise<string> {
  const details = stripeCustomerDetails(appCustomerId, input);
  const { data } = await stripe.customers.list({ email: details.email!, limit: 20 });
  const existing = data.find((customer) => customer.metadata?.appCustomerId === appCustomerId);
  if (existing) {
    const { metadata: _metadata, ...update } = details;
    return (await stripe.customers.update(existing.id, update)).id;
  }
  // The key includes the details: a retry with the same data reuses the Customer, while new
  // data (allowed by Stripe only with a new key) still works.
  const key = createHash("sha256").update(JSON.stringify(details)).digest("hex").slice(0, 24);
  return (await stripe.customers.create(details, { idempotencyKey: `customer-${appCustomerId}-${key}` })).id;
}
