import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { contactSchema } from "@/lib/server/validation";

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
  const customer = await getCustomerSession();
  if (!customer) return NextResponse.json({ messages: [] });
  try {
    const messages = await prisma.contactMessage.findMany({
      where: { OR: [{ customerId: customer.id }, { email: customer.email }] },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ messages: messages.map(serializeMessage) });
  } catch (reason) {
    return handleApiError(reason);
  }
}

export async function POST(request: NextRequest) {
  try {
    const customer = await getCustomerSession();
    const input = contactSchema.parse(await request.json());
    const message = await prisma.contactMessage.create({
      data: {
        customerId: customer?.id,
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        subject: input.subject.trim(),
        message: input.message.trim(),
        status: "OPEN",
      },
    });
    return NextResponse.json({ message: serializeMessage(message) }, { status: 201 });
  } catch (reason) {
    return handleApiError(reason);
  }
}
