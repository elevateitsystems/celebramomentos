"use client";

import { CardPreview } from "@/components/card-preview";
import { describeProductSelection } from "@/lib/cart";
import type { Template } from "@/lib/data";
import type { CartItem } from "@/lib/store";

export function CartItemThumb({ item, template, className = "" }: { item: CartItem; template: Template; className?: string }) {
  if (item.product) {
    const info = describeProductSelection(item.product);
    const round = item.product.kind === "MAGNET" && item.product.shape === "round";
    return (
      <div className={`flex aspect-square items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={info.image}
          alt={info.name}
          className={item.product.kind === "WALL_ART"
            ? "h-full max-h-full w-auto border-[6px] border-[#caa57b] bg-white object-cover p-[6%] shadow-md"
            : `aspect-square w-[88%] border-[4px] border-white object-cover shadow-md ${round ? "rounded-full" : "rounded-xl"}`}
        />
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
