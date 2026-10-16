"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icons";

export default function AdminLoginPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("returnTo");
    if (requested?.startsWith("/")) setReturnTo(requested);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to sign in");
      router.replace(returnTo);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-5 py-12"><section className="w-full max-w-[430px] rounded-[28px] border border-[#eadbd3] bg-white p-7 shadow-[0_20px_70px_rgba(24,36,67,.09)] sm:p-9"><Link href="/" className="mx-auto flex w-fit items-center gap-3"><img src="/images/logo.png" alt="Celebra Momentos" className="h-12 w-12 rounded-full object-contain" /><span className="text-sm font-black text-[#182443]">Celebra<br /><span className="text-[#ee5264]">Admin</span></span></Link><p className="mt-9 text-center text-[10px] font-black uppercase tracking-[.18em] text-[#ee5264]">Private workspace</p><h1 className="mt-2 text-center text-3xl font-black tracking-[-.04em] text-[#182443]">Admin sign in</h1><p className="mt-3 text-center text-sm leading-6 text-[#737b90]">Sign in to manage products, orders, and website content.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-black text-[#182443]">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" autoComplete="username" placeholder="admin@example.com" /></label><label className="block text-sm font-black text-[#182443]">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" autoComplete="current-password" placeholder="Your admin password" /></label>{error && <p className="rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-bold text-[#c94758]">{error}</p>}<button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#182443] px-5 py-3.5 text-sm font-black text-white transition hover:bg-[#ee5264] disabled:cursor-wait disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}<Icon name="arrow" size={16} /></button></form><Link href="/" className="mt-6 block text-center text-xs font-bold text-[#737b90] hover:text-[#ee5264]">← Back to storefront</Link></section></main>;
}
