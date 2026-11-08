"use client";

// One button for every action that takes time (saving, paying, signing in, adding to the cart…).
// While the work runs it
//   - shows a circular spinner beside the text,
//   - is disabled and marked aria-busy (screen readers hear that it is working),
//   - ignores further clicks and form submissions (a ref lock closes the gap before React re-renders),
// and it is restored as soon as the work succeeds or fails. A failure is shown to the customer.
//
// Two ways to use it:
//   <LoadingButton onClick={async () => { await save(); }}>Guardar</LoadingButton>
//       the button tracks the promise itself, and reports a thrown error as a toast (or via onError);
//   <LoadingButton type="submit" loading={isSubmitting}>Enviar</LoadingButton>
//       the caller owns the state (react-hook-form's isSubmitting, a `busy` flag…).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { Spinner, Toast } from "@/components/site";

export const DEFAULT_ACTION_ERROR = "No se pudo completar la acción. Inténtalo de nuevo.";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  // Controlled loading state; combine with the automatic one when onClick returns a promise.
  loading?: boolean;
  // Shown instead of the children while loading ("Guardando…"). The spinner is always shown.
  loadingLabel?: ReactNode;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => unknown;
  // Called with whatever onClick threw. Without it a toast with the error message is shown.
  onError?: (error: unknown) => void;
  // Fallback toast text when the error has no readable message.
  errorMessage?: string;
  spinnerSize?: number;
};

const isPromise = (value: unknown): value is Promise<unknown> => Boolean(value) && typeof (value as { then?: unknown }).then === "function";

export function messageOf(reason: unknown, fallback = DEFAULT_ACTION_ERROR) {
  return reason instanceof Error && reason.message && reason.message.length < 240 ? reason.message : fallback;
}

export function LoadingButton({ loading = false, loadingLabel, onClick, onError, errorMessage = DEFAULT_ACTION_ERROR, spinnerSize = 16, disabled, children, className = "", type = "button", ...rest }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const busy = loading || pending;

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    // A second click before the first has re-rendered the button must do nothing at all, not even submit the form.
    if (busy || lock.current) { event.preventDefault(); return; }
    if (!onClick) return;
    lock.current = true;
    try {
      const result = onClick(event);
      if (isPromise(result)) { setPending(true); await result; }
    } catch (reason) {
      if (onError) onError(reason);
      else { console.error("[button] action failed", reason); setError(messageOf(reason, errorMessage)); }
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return <>
    <button {...rest} type={type} onClick={handleClick} disabled={disabled || busy} aria-busy={busy || undefined} className={`${className} aria-busy:cursor-wait`}>
      {busy ? <span className="inline-flex items-center justify-center gap-2"><Spinner size={spinnerSize} className="shrink-0" />{loadingLabel ?? children}</span> : children}
    </button>
    {error && <Toast message={error} tone="error" onClose={() => setError("")} />}
  </>;
}

// For handlers that are not a button click (a form's onSubmit, a menu item…): runs one action at a time
// and reports whether one is running. A second call while one is running is ignored.
export function useActionLock() {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    if (lock.current) return undefined;
    lock.current = true;
    setPending(true);
    try { return await action(); } finally { lock.current = false; setPending(false); }
  }, []);
  return { run, pending };
}

// For a button that navigates: keeps it in its loading state while the next page loads. The page
// (and button) are gone when the navigation completes; if it never does, the button is restored.
export const holdWhileNavigating = (ms = 8000) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// A link that looks and behaves like LoadingButton while the next page loads (keeps real link
// behaviour: open in a new tab, copy address…). A plain click shows the spinner and ignores further clicks.
export function LoadingLink({ loadingLabel, children, className = "", onClick, ...rest }: ComponentProps<typeof Link> & { loadingLabel?: ReactNode }) {
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setNavigating(false); }, [pathname]);
  useEffect(() => {
    if (!navigating) return;
    // Restored if the page never changes (navigation blocked, offline…).
    const timer = setTimeout(() => setNavigating(false), 8000);
    return () => clearTimeout(timer);
  }, [navigating]);
  return <Link {...rest} aria-busy={navigating || undefined} aria-disabled={navigating || undefined} className={`${className} ${navigating ? "pointer-events-none cursor-wait opacity-80" : ""}`}
    onClick={(event) => {
      if (navigating) { event.preventDefault(); return; }
      onClick?.(event);
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      setNavigating(true);
    }}>
    {navigating ? <span className="inline-flex items-center justify-center gap-2"><Spinner size={16} className="shrink-0" />{loadingLabel ?? children}</span> : children}
  </Link>;
}
