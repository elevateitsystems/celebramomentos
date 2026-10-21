import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { getPublicSettings } from "@/lib/server/settings";

export const dynamic = "force-dynamic";

// Public, non-secret storefront settings (social links, Wall Art prices).
export async function GET() {
  try {
    return NextResponse.json(await getPublicSettings(), { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return handleApiError(error);
  }
}
