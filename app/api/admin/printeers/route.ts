import { NextResponse } from "next/server";
import { podMode } from "@/lib/pod/config";
import { PodApiError } from "@/lib/pod/http";
import { printeersApi } from "@/lib/pod/printeers/api";
import { printeersEnvironment, productgroups } from "@/lib/pod/printeers/catalog";
import { podAdapter } from "@/lib/pod/providers";
import { requireAdmin } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Printeers setup for admin → Products: the environment in use, what is missing, and the
// live product groups to link phone case products to (with Printeers' own prices).
export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  const mode = podMode();
  const environment = printeersEnvironment(mode);
  const problem = podAdapter("PRINTEERS").configurationProblem(mode);
  try {
    await printeersApi.validate({ mode });
    return NextResponse.json({ environment, problem, connected: true, productgroups: await productgroups(mode) });
  } catch (reason) {
    const message = reason instanceof PodApiError ? reason.message : "Printeers could not be reached";
    return NextResponse.json({ environment, problem: problem || message, connected: false, productgroups: [] });
  }
}
