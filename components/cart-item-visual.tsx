"use client";

import { CartDesignPreview } from "@/components/cart-design-preview";
import { PosterHanger, hangerColorFrom, orientationFrom } from "@/components/poster-hanger";
import { describeProductSelection } from "@/lib/cart";
import type { Template } from "@/lib/data";
import type { CartItem } from "@/lib/store";

const optionValue = (options: Record<string, string>, pattern: RegExp) => Object.entries(options).find(([key]) => pattern.test(key))?.[1];

// What the customer designed, as it was when they added it: a card is drawn with the same page renderer
// that makes its print files; a product shows the preview captured from its studio (mug, phone case,
// magnet, calendar, poster), falling back to the first photo for items added before previews existed.
export function CartItemThumb({ item, template, className = "", faces = false }: { item: CartItem; template: Template; className?: string; faces?: boolean }) {
  if (item.product) {
    const info = describeProductSelection(item.product);
    if (item.product.productKind === "WALL_ART" && !item.product.preview) {
      return <div className={`flex aspect-square items-center justify-center ${className}`}><PosterHanger photo={item.product.photos[0] || item.product.image} alt={info.name} color={hangerColorFrom(optionValue(item.product.options, /marco|frame|colgador|hanger/i))} orientation={orientationFrom(optionValue(item.product.options, /orienta/i))} className="h-full max-w-full" /></div>;
    }
    if (item.product.preview) {
      return <div className={`flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.product.preview} alt={info.name} className="max-h-[220px] w-[92%] rounded-xl border-[4px] border-white bg-white object-contain shadow-md" />
      </div>;
    }
    return (
      <div className={`flex aspect-square items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info.image} alt={info.name} className="aspect-square w-[88%] rounded-xl border-[4px] border-white object-cover shadow-md" />
      </div>
    );
  }
  return <CartDesignPreview card={item.card} faces={faces} className={className} />;
}
