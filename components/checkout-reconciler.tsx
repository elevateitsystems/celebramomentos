"use client";

// Removes bought lines from the cart when the customer never reached the success page after paying
// (closed the tab on Stripe/PayPal, the payment was confirmed only by the webhook, another device…).
// The order is looked up on the server; only a paid order removes its lines. A failed, cancelled or
// expired payment leaves the cart as it was. Runs on page changes and when the tab regains focus.
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { CHECKOUT_MAX_AGE_MS, forgetCheckout, pendingCheckout } from "@/lib/checkout-tracker";
import { removeCartItems } from "@/lib/store";

const PAID = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
const CLOSED = new Set(["CANCELLED", "REFUNDED"]);

export function CheckoutReconciler() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const running = useRef(false);

  const reconcile = useCallback(async () => {
    const pending = pendingCheckout();
    // The success pages do this themselves; right after leaving for the payment page there is nothing to check yet.
    if (!pending || running.current || pathname?.startsWith("/checkout/success") || pathname?.startsWith("/checkout/paypal") || pathname?.startsWith("/admin")) return;
    if (Date.now() - pending.startedAt < 15_000) return;
    running.current = true;
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) return; // not signed in here: try again later
      const orders = ((await response.json()).orders || []) as { dbId: string; orderStatus: string }[];
      const order = orders.find((item) => item.dbId === pending.orderId);
      if (order && PAID.has(order.orderStatus)) { dispatch(removeCartItems(pending.itemIds)); forgetCheckout(); return; }
      if ((order && CLOSED.has(order.orderStatus)) || Date.now() - pending.startedAt > CHECKOUT_MAX_AGE_MS) forgetCheckout();
    } catch { /* offline: try again later */ } finally {
      running.current = false;
    }
  }, [dispatch, pathname]);

  useEffect(() => { void reconcile(); }, [reconcile]);
  useEffect(() => {
    const onFocus = () => { void reconcile(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reconcile]);
  return null;
}
