import { NextRequest, NextResponse } from "next/server";
import { validWebhookToken } from "@/lib/pod/webhooks";
import { runPodMaintenance } from "@/lib/pod/fulfillment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Print-on-demand housekeeping (see runPodMaintenance). Vercel Cron calls it with
// "Authorization: Bearer <CRON_SECRET>"; it can also be called by hand the same way.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || null;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  if (!secret || secret.length < 16 || !validWebhookToken(token, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await runPodMaintenance()) });
}
