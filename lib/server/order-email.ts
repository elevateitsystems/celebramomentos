// Order confirmation email, sent once after a verified successful payment.
//
// - Provider: SMTP through nodemailer (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD /
//   SMTP_FROM). Without a complete, non-placeholder configuration the email stays disabled:
//   nothing is sent, checkout is not affected and nothing is recorded as sent.
// - Trigger: only called from the code paths that have already verified the payment (signed
//   Stripe event / Stripe session retrieved server-side / captured PayPal order). The order is
//   re-checked here: it must be PAID or later AND have a SUCCEEDED payment.
// - Idempotency: a unique SiteSetting row (`order_confirmation_email:<orderId>`, hidden from the
//   admin list with isSecret) is claimed before sending. A concurrent or repeated call fails the
//   unique constraint and does nothing. If sending fails the claim is released so that a later
//   payment event or retry can try again.
import { waitUntil } from "@vercel/functions";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const claimKey = (orderId: string) => `order_confirmation_email:${orderId}`;

export const ORDER_EMAIL_PARAGRAPHS = [
  "¡Gracias por tu pedido! 🎁",
  "Ya estamos preparando tus productos personalizados.",
  "Si tu pedido contiene varios artículos, es posible que los recibas en paquetes separados, ya que algunos productos se elaboran en diferentes centros especializados.",
  "Recibirás información de seguimiento a medida que cada paquete sea enviado.",
  "¡Esperamos que te encante tu pedido!",
  "Celebra Momentos 💛",
] as const;

type EmailOrder = { number: string; currency: string; totalCents: number; items: { name: string; quantity: number }[] };

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);
const money = (cents: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

export function buildOrderConfirmationEmail(order: EmailOrder) {
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`);
  const details = [`Pedido: ${order.number}`, ...lines, `Total: ${money(order.totalCents, order.currency)}`];
  const text = `${ORDER_EMAIL_PARAGRAPHS.join("\n\n")}\n\n— Detalles de tu pedido —\n${details.join("\n")}\n`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#182443;max-width:560px;margin:0 auto;padding:24px">${ORDER_EMAIL_PARAGRAPHS.map((paragraph, index) => `<p style="margin:0 0 16px;${index === 0 ? "font-size:22px;font-weight:bold;" : ""}">${escapeHtml(paragraph)}</p>`).join("")}<hr style="border:none;border-top:1px solid #eadbd3;margin:24px 0"><p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:#737b90">Detalles de tu pedido</p><p style="margin:0;font-size:14px;color:#59627b">${details.map(escapeHtml).join("<br>")}</p></div>`;
  return { subject: `¡Gracias por tu pedido! 🎁 · ${order.number}`, text, html };
}

const clean = (name: string) => {
  const value = process.env[name]?.trim();
  return value && !/replace|changeme|example\.com/i.test(value) ? value : null;
};

// null when the provider is not (fully) configured.
export function smtpConfig() {
  const host = clean("SMTP_HOST");
  const user = clean("SMTP_USER");
  const password = clean("SMTP_PASSWORD");
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !user || !password || !from || /example\.com/i.test(from)) return null;
  const port = Number(process.env.SMTP_PORT) || 587;
  return { host, port, secure: port === 465, auth: { user, pass: password }, from };
}

export type OrderEmailResult = "sent" | "disabled" | "skipped" | "duplicate" | "failed";

export async function sendOrderConfirmationEmail(orderId: string): Promise<OrderEmailResult> {
  try {
    const config = smtpConfig();
    if (!config) return "disabled";
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payments: { where: { status: "SUCCEEDED" }, select: { id: true } } } });
    // Never for pending, failed, cancelled or refunded orders.
    if (!order || !(PAID_STATUSES as readonly string[]).includes(order.status) || !order.payments.length || !order.email) return "skipped";

    try {
      await prisma.siteSetting.create({ data: { key: claimKey(order.id), value: "sending", isSecret: true } });
    } catch {
      return "duplicate";
    }
    try {
      const mail = buildOrderConfirmationEmail({ number: order.number, currency: order.currency, totalCents: order.totalCents, items: order.items.map((item) => ({ name: item.name, quantity: item.quantity })) });
      const transport = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.secure, auth: config.auth, connectionTimeout: 10_000, socketTimeout: 15_000 });
      await transport.sendMail({ from: config.from, to: order.email, ...mail });
      await prisma.siteSetting.update({ where: { key: claimKey(order.id) }, data: { value: `sent ${new Date().toISOString()}` } });
      return "sent";
    } catch (error) {
      // Release the claim so a later payment event can retry. Credentials are never logged.
      await prisma.siteSetting.delete({ where: { key: claimKey(order.id) } }).catch(() => undefined);
      console.error("Order confirmation email failed", { orderId, reason: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
      return "failed";
    }
  } catch (error) {
    console.error("Order confirmation email could not run", { orderId, reason: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
    return "failed";
  }
}

// Fire and forget: never delays or breaks the payment response.
export function sendOrderConfirmationInBackground(orderId: string) {
  waitUntil(sendOrderConfirmationEmail(orderId));
}
