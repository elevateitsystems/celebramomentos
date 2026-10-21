// Localized loading states. Nothing here covers the page: each placeholder
// sits inside the section that is waiting for data, so headers, footers and
// static content stay visible.

export function BrandLoader({ label = "Cargando…", className = "", compact = false }: { label?: string; className?: string; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-3 text-center ${compact ? "py-8" : "py-16"} ${className}`}>
      <span className={`relative flex items-center justify-center rounded-full bg-white shadow-[0_10px_30px_rgba(24,36,67,.08)] ${compact ? "h-16 w-16" : "h-24 w-24"}`}>
        <span className="absolute inset-0 animate-ping rounded-full bg-[#ee5264]/10 [animation-duration:1.8s]" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="" aria-hidden="true" className={`relative animate-pulse object-contain ${compact ? "h-11 w-11" : "h-16 w-16"}`} />
      </span>
      <span className="text-xs font-black text-[#737b90]">{label}</span>
    </div>
  );
}

export function SkeletonProductCard() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-[22px] border border-[#eadbd3] bg-white shadow-sm">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[#f8efe8]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="" className="h-12 w-12 animate-pulse object-contain opacity-40" />
      </div>
      <div className="space-y-3 p-5">
        <div className="flex justify-between gap-3"><span className="h-5 w-2/3 animate-pulse rounded-full bg-[#f1e6df]" /><span className="h-5 w-14 animate-pulse rounded-full bg-[#f8dcd9]" /></div>
        <span className="block h-3 w-full animate-pulse rounded-full bg-[#f4ece6]" />
        <span className="block h-3 w-4/5 animate-pulse rounded-full bg-[#f4ece6]" />
        <span className="mt-1 block h-9 w-28 animate-pulse rounded-full bg-[#ebe4e6]" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 3, label = "Cargando productos…", className = "grid gap-5 md:grid-cols-2 lg:grid-cols-3" }: { count?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, index) => <SkeletonProductCard key={index} />)}
    </div>
  );
}

// Subtle indicator for background refreshes while existing content stays on screen.
export function InlineRefreshing({ label = "Actualizando…" }: { label?: string }) {
  return <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-[11px] font-bold text-[#9297a4]"><span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-[#eadbd3] border-t-[#ee5264]" />{label}</span>;
}
