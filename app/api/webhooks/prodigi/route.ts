import { handlePodWebhook } from "@/lib/pod/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fulfilment updates from PRODIGI. See lib/pod/webhooks.ts for how they are verified.
export async function POST(request: Request) {
  return handlePodWebhook("PRODIGI", request);
}
