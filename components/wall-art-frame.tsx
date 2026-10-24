// The client's reference frame (public/images/wall-art-frame.png, 328 × 546).
// The customer's photo is placed exactly inside its inner opening; without a
// photo the reference's empty placeholder icon shows through.
// Fade the reference photo's wall into whatever background it sits on.
const FADE = "linear-gradient(to right, transparent, #000 3%, #000 97%, transparent), linear-gradient(to bottom, transparent, #000 2.5%, #000 97.5%, transparent)";
const INSET = { top: "27.6%", right: "12.1%", bottom: "8.4%", left: "10.7%" };

export function WallArtFrame({ photo, alt, className = "", style }: { photo: string | null; alt: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative aspect-[328/546] ${className}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/wall-art-frame.png" alt={photo ? "" : alt} className="absolute inset-0 h-full w-full select-none" style={{ WebkitMaskImage: FADE, maskImage: FADE, WebkitMaskComposite: "source-in", maskComposite: "intersect" }} draggable={false} />
      {photo && (
        <div className="absolute overflow-hidden" style={INSET}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={alt} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
