import { handlePrinteersCallback, handlePrinteersWebhook } from "@/lib/pod/printeers/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Two ways Printeers (API v1) tells us an order changed; see lib/pod/printeers/webhook.ts.
// POST: a signed webhook. Register https://<site>/api/webhooks/printeers in the Printeers
//       Dashboard (Settings → Webhooks) and put its signing secret in PRINTEERS_WEBHOOK_SECRET
//       (test: PRINTEERS_TEST_WEBHOOK_SECRET).
// GET:  the legacy order-updated callback. Set the store's "API Callback URL" to
//       https://<site>/api/webhooks/printeers (optionally ?token=<POD_WEBHOOK_SECRET>).
export async function POST(request: Request) {
  return handlePrinteersWebhook(request);
}

export async function GET(request: Request) {
  return handlePrinteersCallback(request);
}
