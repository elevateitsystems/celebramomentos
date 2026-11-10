"use client";

// Restores a design a guest saved before logging in (lib/pending-cart.ts): as soon as a
// session exists, the design is added to the cart exactly as it was (photos, options,
// texts, quantity) and the customer is told it is in the cart.
// Runs after the cart was hydrated from storage, on every navigation (logging in ends with
// a client-side navigation to the returnTo page) and when the tab regains focus.
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Toast } from "@/components/site";
import { getSessionUser } from "@/lib/client-session";
import { hasPendingCartItem, takePendingCartItem } from "@/lib/pending-cart";
import { saveCartItem, type RootState } from "@/lib/store";

export function PendingCartResumer() {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const portuguese = useSelector((state: RootState) => state.language.language === "pt");
  const [restored, setRestored] = useState(false);
  const running = useRef(false);

  const resume = useCallback(async () => {
    if (running.current || pathname?.startsWith("/admin")) return;
    running.current = true;
    try {
      if (!(await hasPendingCartItem())) return;
      const user = await getSessionUser({ refresh: true });
      if (!user) return;
      const pending = await takePendingCartItem();
      if (!pending) return;
      // Upsert by the id given when it was saved: a repeated restore cannot add a second line.
      dispatch(saveCartItem(pending.item));
      setRestored(true);
      // No navigation here: the login page already returns the customer to the cart, and any other
      // page (including one being refreshed) must stay where it is. A toast tells the customer the design is in the cart.
    } catch (reason) {
      console.error("[celebra] the saved design could not be restored", reason);
    } finally {
      running.current = false;
    }
  }, [dispatch, pathname]);

  useEffect(() => { void resume(); }, [resume]);
  useEffect(() => {
    const onFocus = () => { void resume(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [resume]);

  return restored ? <Toast message={portuguese ? "Recuperámos o teu design e adicionámo-lo ao carrinho (ver Carrinho)." : "Hemos recuperado tu diseño y lo hemos añadido a la cesta (ver Cesta)."} onClose={() => setRestored(false)} /> : null;
}
