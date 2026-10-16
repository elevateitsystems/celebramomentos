"use client";

import { useState } from "react";
import { AdminPageHeader, AdminShell } from "@/components/admin";
import { StatusBadge, Toast } from "@/components/site";
import { updateMockDb, useMockDb } from "@/lib/mock-store";

export default function AdminCustomersPage() {
  const db = useMockDb();
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const customers = db.users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));
  const remove = (id: string, name: string) => { if (!window.confirm(`Delete customer ${name}?`)) return; updateMockDb((current) => ({ ...current, users: current.users.filter((user) => user.id !== id), orders: current.orders.filter((order) => order.userId !== id) })); setToast("Customer deleted"); };
  return <AdminShell><AdminPageHeader eyebrow="RELATIONSHIPS" title="Customers" body="Review or delete individual customer accounts." action={<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="rounded-xl border border-[#dfd3cc] px-3 py-2 text-xs" />} /><section className="mt-8 overflow-hidden rounded-2xl border border-[#e4e7ee] bg-white"><div className="border-b border-[#e4e7ee] p-5 text-sm font-black">{customers.length} customers</div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#e4e7ee] bg-[#fafbfc] text-[10px] uppercase tracking-[.14em] text-[#9297a4]"><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Consent</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody>{customers.map((user) => <tr key={user.id} className="border-b border-[#eef0f4] text-sm"><td className="px-5 py-4"><p className="font-black">{user.name}</p><p className="text-xs text-[#737b90]">{user.email}</p></td><td className="px-5 py-4 font-black">{db.orders.filter((order) => order.userId === user.id || order.email === user.email).length}</td><td className="px-5 py-4"><StatusBadge tone="green">Opted in</StatusBadge></td><td className="px-5 py-4 text-right"><button onClick={() => remove(user.id, user.name)} className="text-xs font-black text-[#c94758]">Delete</button></td></tr>)}</tbody></table></div></section>{toast && <Toast message={toast} onClose={() => setToast("")} />}</AdminShell>;
}
