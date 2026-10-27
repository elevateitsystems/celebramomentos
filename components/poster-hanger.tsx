// Wall Art preview: museum-quality poster with a hanger (Gelato, PRODUCTS.pdf).
// Wooden bars on the top and bottom edges and a string to a nail, matching the
// client's reference image. The hanger colour and orientation follow the
// product options chosen in the studio.

export type HangerColor = "natural" | "dark" | "white" | "black";
export type PosterOrientation = "vertical" | "horizontal";

const BAR_STYLE: Record<HangerColor, string> = {
  natural: "linear-gradient(180deg, #e6c9a0 0%, #cfa977 45%, #b38a5a 100%)",
  dark: "linear-gradient(180deg, #7d573a 0%, #5e3d26 50%, #43291a 100%)",
  white: "linear-gradient(180deg, #ffffff 0%, #f1efeb 55%, #dedad3 100%)",
  black: "linear-gradient(180deg, #4a4a4a 0%, #262626 50%, #111111 100%)",
};

// Maps an option value such as "Madera natural", "Dark wood", "Blanco" or "Negro".
export function hangerColorFrom(value?: string | null): HangerColor {
  const text = (value || "").toLowerCase();
  if (/blanc|white|branc/.test(text)) return "white";
  if (/negr|black|pret/.test(text)) return "black";
  if (/oscur|dark|escur/.test(text)) return "dark";
  return "natural";
}

export function orientationFrom(value?: string | null): PosterOrientation {
  return /horiz|paisaj|landscape/i.test(value || "") ? "horizontal" : "vertical";
}

export function PosterHanger({ photo, alt, color = "natural", orientation = "vertical", className = "", style }: { photo: string | null; alt: string; color?: HangerColor; orientation?: PosterOrientation; className?: string; style?: React.CSSProperties }) {
  const bar = { background: BAR_STYLE[color], boxShadow: "0 2px 4px rgba(60, 40, 20, .25)" };
  return (
    <div role="img" aria-label={alt} className={`relative ${className}`} style={{ aspectRatio: orientation === "horizontal" ? "4 / 3.45" : "3 / 4.55", ...style }}>
      <svg className="absolute inset-x-0 top-0 h-[13%] w-full" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="9,20 50,2.5 91,20" fill="none" stroke="#9c7a52" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute left-1/2 top-0 h-[2.4%] min-h-[5px] w-auto -translate-x-1/2 rounded-full bg-[#6f6253] shadow" style={{ aspectRatio: "1" }} aria-hidden="true" />
      <div className="absolute inset-x-[5%] bottom-[3.2%] top-[14.6%] bg-white shadow-[0_10px_24px_rgba(70,45,25,.18)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo} alt="" className="absolute inset-[4%] h-[92%] w-[92%] object-cover" />}
      </div>
      <div className="absolute inset-x-[3%] top-[12.4%] h-[3.4%] rounded-[3px]" style={bar} aria-hidden="true" />
      <div className="absolute inset-x-[3%] bottom-[1.2%] h-[3.4%] rounded-[3px]" style={bar} aria-hidden="true" />
    </div>
  );
}
