import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "A record with these details already exists" }, { status: 409 });
    if (error.code === "P2025") return NextResponse.json({ error: "The requested record was not found" }, { status: 404 });
  }
  if (error instanceof Error && error.message.startsWith("Cloudinary storage is not configured")) return NextResponse.json({ error: error.message }, { status: 503 });
  if (error instanceof Error && /EHOSTUNREACH|ECONNREFUSED|ENOTFOUND|storage|cloudinary/i.test(error.message)) return NextResponse.json({ error: "Image storage is unavailable. Check the configured Cloudinary configuration." }, { status: 503 });
  console.error("API error", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
