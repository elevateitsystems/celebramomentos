import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// AlerioPrint's External API documents no webhooks (nor an order status endpoint):
// https://create.alerioprint.com/backend/api/docs/external-api.yaml. This route exists
// so the URL can be given to AlerioPrint, but it accepts nothing until they publish a
// webhook format and a way to verify it. Until then AlerioPrint orders are updated by
// hand in admin → Print orders.
// TODO(AlerioPrint): implement once the webhook payload and its verification are documented.
export async function POST() {
  return NextResponse.json({ error: "AlerioPrint webhooks are not supported yet: the provider has not documented them" }, { status: 501 });
}
