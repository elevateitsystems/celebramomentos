import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { handleApiError, jsonError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { adminMessageReplySchema } from "@/lib/server/validation";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function serializeMessage(message: { id: string; customerId: string | null; name: string; email: string; subject: string; message: string; status: string; replies: unknown; createdAt: Date }) {
  const replies = Array.isArray(message.replies) ? message.replies as { id: string; author: "customer" | "admin"; text: string; createdAt: string }[] : [];
  return {
    id: message.id,
    userId: message.customerId,
    name: message.name,
    email: message.email,
    subject: message.subject,
    status: message.status === "REPLIED" ? "replied" : message.status === "CLOSED" ? "closed" : "open",
    createdAt: message.createdAt.toISOString(),
    messages: [{ id: `${message.id}-root`, author: "customer" as const, text: message.message, createdAt: message.createdAt.toISOString() }, ...replies],
  };
}

export async function GET() {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  try {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ messages: messages.map(serializeMessage) });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function PATCH(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN", "EDITOR"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Message id is required");
  try {
    const input = adminMessageReplySchema.parse(await request.json());
    const existing = await prisma.contactMessage.findUnique({ where: { id } });
    if (!existing) return jsonError("Message not found", 404);
    const replies = Array.isArray(existing.replies) ? existing.replies as object[] : [];
    const updated = await prisma.contactMessage.update({
      where: { id },
      data: {
        status: "REPLIED",
        replies: [...replies, { id: `reply-${Date.now()}`, author: "admin", text: input.text, createdAt: new Date().toISOString() }] as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ message: serializeMessage(updated) });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function DELETE(request: NextRequest) {
  const { error } = await requireAdmin(["OWNER", "ADMIN"]);
  if (error) return error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Message id is required");
  try {
    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (reason) {
    return handleApiError(reason);
  }
}
