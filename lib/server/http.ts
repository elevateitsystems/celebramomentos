import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
  console.error("API error", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
