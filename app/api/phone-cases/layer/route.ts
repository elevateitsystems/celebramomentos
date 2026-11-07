import { NextRequest, NextResponse } from "next/server";
import { layerUrl, linkedProductgroup } from "@/lib/pod/printeers/catalog";
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LAYERS = ["top", "mask", "bottom", "mockup"] as const;

// One mockup layer image of a Printeers phone model, served from this site so the browser
// never needs Printeers credentials. Only URLs Printeers returned for that exact product
// are fetched (never a URL from the request); they are public files on Printeers' file hosts
// (layerUrl checks the host), so no credentials are sent.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const layer = params.get("layer") as (typeof LAYERS)[number];
  if (!LAYERS.includes(layer)) return new NextResponse("Not found", { status: 404 });
  const product = await prisma.product.findFirst({ where: { id: params.get("productId") || "", active: true, kind: "PHONE_CASE" }, select: { metadata: true } });
  const group = product ? linkedProductgroup(product.metadata) : null;
  const url = group ? await layerUrl(group, params.get("model") || "", layer).catch(() => null) : null;
  if (!url) return new NextResponse("Not found", { status: 404 });
  const upstream = await fetch(url, { cache: "no-store" }).catch(() => null);
  const type = upstream?.headers.get("content-type") || "";
  if (!upstream?.ok || !type.startsWith("image/")) return new NextResponse("Not available", { status: 502 });
  return new NextResponse(upstream.body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400" } });
}
