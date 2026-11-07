import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
const claims = new Map<string, string>();
let order: Record<string, unknown> | null = null;

vi.mock("@vercel/functions", () => ({ waitUntil: () => undefined }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));
vi.mock("@/lib/server/prisma", () => ({
  prisma: {
    order: { findUnique: async () => order },
    siteSetting: {
      create: async ({ data }: { data: { key: string; value: string } }) => { if (claims.has(data.key)) throw new Error("Unique constraint"); claims.set(data.key, data.value); },
      update: async ({ where, data }: { where: { key: string }; data: { value: string } }) => { claims.set(where.key, data.value); },
      delete: async ({ where }: { where: { key: string } }) => { claims.delete(where.key); },
    },
  },
}));

import { buildOrderConfirmationEmail, ORDER_EMAIL_PARAGRAPHS, sendOrderConfirmationEmail, smtpConfig } from "@/lib/server/order-email";

const paidOrder = (patch: Record<string, unknown> = {}) => ({ id: "o1", number: "CM-1", email: "cliente@example.org", currency: "eur", totalCents: 2350, status: "PAID", items: [{ name: "Tarjeta <b>", quantity: 2 }], payments: [{ id: "p1" }], ...patch });

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue({});
  claims.clear();
  order = paidOrder();
  Object.assign(process.env, { SMTP_HOST: "smtp.mailer.test", SMTP_PORT: "587", SMTP_USER: "user", SMTP_PASSWORD: "secret-pass", SMTP_FROM: "Celebra Momentos <hola@celebra-momentos.test>" });
});

describe("order confirmation email", () => {
  it("contains the exact Spanish text from the client", () => {
    const mail = buildOrderConfirmationEmail({ number: "CM-1", currency: "eur", totalCents: 2350, items: [{ name: "Tarjeta", quantity: 1 }] });
    expect(ORDER_EMAIL_PARAGRAPHS.join("\n\n")).toBe("¡Gracias por tu pedido! 🎁\n\nYa estamos preparando tus productos personalizados.\n\nSi tu pedido contiene varios artículos, es posible que los recibas en paquetes separados, ya que algunos productos se elaboran en diferentes centros especializados.\n\nRecibirás información de seguimiento a medida que cada paquete sea enviado.\n\n¡Esperamos que te encante tu pedido!\n\nCelebra Momentos 💛");
    expect(mail.text).toContain("Pedido: CM-1");
    expect(mail.text).toContain("1 × Tarjeta");
  });

  it("escapes order data in the HTML body", () => {
    expect(buildOrderConfirmationEmail({ number: "CM-1", currency: "eur", totalCents: 100, items: [{ name: "<script>x</script>", quantity: 1 }] }).html).not.toContain("<script>");
  });

  it("sends once for a paid order and never twice", async () => {
    expect(await sendOrderConfirmationEmail("o1")).toBe("sent");
    expect(await sendOrderConfirmationEmail("o1")).toBe("duplicate");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({ to: "cliente@example.org" });
  });

  it("never sends for pending / failed payments", async () => {
    order = paidOrder({ status: "PENDING" });
    expect(await sendOrderConfirmationEmail("o1")).toBe("skipped");
    order = paidOrder({ status: "CANCELLED" });
    expect(await sendOrderConfirmationEmail("o1")).toBe("skipped");
    order = paidOrder({ payments: [] });
    expect(await sendOrderConfirmationEmail("o1")).toBe("skipped");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("releases the claim when delivery fails so it can be retried, without leaking credentials", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    sendMail.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    expect(await sendOrderConfirmationEmail("o1")).toBe("failed");
    expect(claims.size).toBe(0);
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret-pass");
    expect(await sendOrderConfirmationEmail("o1")).toBe("sent");
    error.mockRestore();
  });

  it("stays disabled without a complete SMTP configuration", async () => {
    process.env.SMTP_PASSWORD = "replace_me";
    expect(smtpConfig()).toBeNull();
    expect(await sendOrderConfirmationEmail("o1")).toBe("disabled");
    expect(sendMail).not.toHaveBeenCalled();
    expect(claims.size).toBe(0);
  });
});
