"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";
import { useState } from "react";

const nav = [["Overview", "/admin", "spark"], ["Products", "/admin/products", "bag"], ["Templates", "/admin/templates", "heart"], ["Orders", "/admin/orders", "truck"], ["Customers", "/admin/customers", "user"], ["Discounts", "/admin/discounts", "tag"], ["Settings", "/admin/settings", "edit"]];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#182443]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#182443]/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[280px] border-r border-[#e4e7ee] bg-[#182443] text-white transition-transform duration-300 ease-in-out lg:w-[245px] lg:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } lg:block`}>
        <div className="flex h-full flex-col p-5">
          {/* Close button for mobile */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" size={20} />
          </button>

          <Link href="/" className="flex items-center gap-3 border-b border-white/10 pb-6">
            <img src="/images/logo.png" alt="Celebra Momentos" className="h-10 w-10 rounded-full object-contain" />
            <span className="text-sm font-black">Celebra<br /><span className="text-[#f8c75e]">Admin</span></span>
          </Link>
          
          <p className="mt-7 px-3 text-[10px] font-black uppercase tracking-[.18em] text-white/40">Workspace</p>
          
          <nav className="mt-3 space-y-1">
            {nav.map(([label, href, icon]) => (
              <Link 
                key={href} 
                href={href} 
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  pathname === href ? "bg-white/12 text-[#f8c75e]" : "text-white/65 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon name={icon} size={17} />
                {label}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto rounded-2xl bg-white/8 p-4">
            <p className="text-xs font-black">Need help?</p>
            <p className="mt-1 text-[11px] leading-5 text-white/55">Connect your API when the frontend is ready.</p>
            <Link href="/" className="mt-3 inline-block text-xs font-black text-[#f8c75e]">View storefront →</Link>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[245px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#e4e7ee] bg-white/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 hover:bg-[#f0f1f5] lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" size={24} />
            </button>
            
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <img src="/images/logo.png" alt="Celebra Momentos" className="h-9 w-9 object-contain" />
              <span className="text-sm font-black">Celebra Admin</span>
            </Link>
          </div>
          
          <span className="hidden text-xs font-bold text-[#9297a4] lg:block">
            Workspace / {pathname.replace("/admin", "").replaceAll("/", " · ") || "Overview"}
          </span>
          
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-black">Sofía Martínez</span>
              <span className="block text-[10px] text-[#9297a4]">Administrator</span>
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8c75e] text-xs font-black">SM</span>
          </div>
        </header>
        
        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, body, action }: { eyebrow: string; title: string; body?: string; action?: React.ReactNode }) { 
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ee5264]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{title}</h1>
        {body && <p className="mt-2 max-w-[580px] text-sm leading-6 text-[#737b90]">{body}</p>}
      </div>
      {action}
    </div>
  );
}