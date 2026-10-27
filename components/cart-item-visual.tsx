"use client";

import { CardPreview } from "@/components/card-preview";
import { PosterHanger, hangerColorFrom, orientationFrom } from "@/components/poster-hanger";
import { describeProductSelection } from "@/lib/cart";
import type { Template } from "@/lib/data";
import type { CartItem } from "@/lib/store";

const optionValue = (options: Record<string, string>, pattern: RegExp) => Object.entries(options).find(([key]) => pattern.test(key))?.[1];

export function CartItemThumb({ item, template, className = "" }: { item: CartItem; template: Template; className?: string }) {
  if (item.product) {
    const info = describeProductSelection(item.product);
    if (item.product.productKind === "WALL_ART") {
      return <div className={`flex aspect-square items-center justify-center ${className}`}><PosterHanger photo={item.product.photos[0] || item.product.image} alt={info.name} color={hangerColorFrom(optionValue(item.product.options, /marco|frame|colgador|hanger/i))} orientation={orientationFrom(optionValue(item.product.options, /orienta/i))} className="h-full max-w-full" /></div>;
    }
    return (
      <div className={`flex aspect-square items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={info.image} alt={info.name} className="aspect-square w-[88%] rounded-xl border-[4px] border-white object-cover shadow-md" />
      </div>
    );
  }
  return <CardPreview
    compact
    templateId={template.id}
    message={item.card.frontHeadline || item.card.message}
    headline={item.card.frontHeadline}
    subheadline={item.card.frontSubheadline}
    category={item.card.magazineCategory}
    date={item.card.magazineDate}
    badge={item.card.magazineBadge}
    headlineTag={item.card.magazineHeadlineTag}
    footerText={item.card.magazineFooter}
    emojiElements={item.card.emojiElements}
    photoDataUrls={item.card.photoDataUrls}
    photoZoom={item.card.photoZoom}
    photoPosition={item.card.photoPosition}
  />;
}
