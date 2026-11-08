"use client";

// Restores a design a guest saved before logging in (lib/pending-cart.ts): as soon as a
// session exists, the design is added to the cart exactly as it was (photos, options,
// texts, quantity) and the customer is taken to the cart to continue to checkout.
// Runs after the cart was hydrated from storage, on every navigation (logging in ends with
// a client-side navigation to the returnTo page) and when the tab regains focus.
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Toast } from "@/components/site";
import { getSessionUser } from "@/lib/client-session";
import { hasPendingCartItem, takePendingCartItem } from "@/lib/pending-cart";
import { saveCartItem, type RootState } from "@/lib/store";

export function PendingCartResumer() {
  const pathname = usePathname();
  const router = useRouter();
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
      if (pathname !== "/cart") router.push("/cart");
    } catch (reason) {
      console.error("[celebra] the saved design could not be restored", reason);
    } finally {
      running.current = false;
    }
  }, [dispatch, pathname, router]);

  useEffect(() => { void resume(); }, [resume]);
  useEffect(() => {
    const onFocus = () => { void resume(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [resume]);

  return restored ? <Toast message={portuguese ? "Recuperámos o teu design e adicionámo-lo ao carrinho." : "Hemos recuperado tu diseño y lo hemos añadido a la cesta."} onClose={() => setRestored(false)} /> : null;
}
