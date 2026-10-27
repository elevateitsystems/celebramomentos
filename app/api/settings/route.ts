import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { getPublicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

// Public, non-secret storefront settings (social links, card size prices, delivery rates).
export async function GET() {
  try {
    return NextResponse.json(await getPublicSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error);
  }
}
