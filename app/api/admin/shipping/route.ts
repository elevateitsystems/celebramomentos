import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { ensureCatalog } from "@/lib/server/catalog";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { getDeliveryRates } from "@/lib/server/settings";
import { deliveryRatesSchema } from "@/lib/server/validation";

export const dynamic = "force-dynamic";

// Standard and express delivery prices (ShippingMethod rows), edited in admin Settings.
export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    await ensureCatalog();
    return NextResponse.json({ delivery: await getDeliveryRates() });
  } catch (reason) { return handleApiError(reason); }
}

export async function PUT(request: NextRequest) {
  const { error, admin } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  try {
    const input = deliveryRatesSchema.parse(await request.json());
    await ensureCatalog();
    await prisma.$transaction([
      ...(["standard", "express"] as const).map((slug) => prisma.shippingMethod.update({ where: { slug }, data: { priceCents: input[slug].priceCents, freeFromCents: input[slug].freeFromCents } })),
      prisma.auditLog.create({ data: { adminUserId: admin!.id.startsWith("local") ? null : admin!.id, action: "UPDATE", entity: "ShippingMethod", metadata: input } }),
    ]);
    return NextResponse.json({ delivery: await getDeliveryRates() });
  } catch (reason) { return handleApiError(reason); }
}
