import { FRIDAY_PROMO } from "@/lib/campaignVisibility";
import type { Product } from "@/lib/products";
import { promoDiscountAmount } from "@/lib/promoRules";

type OfferProduct = Pick<Product, "id" | "category" | "inStock" | "price">;

export default function FridayPromoPrice({ product }: { product: OfferProduct }) {
  if (product.category !== "bads" || !product.inStock) return null;

  const { code, discountPercent } = FRIDAY_PROMO;
  const discount = promoDiscountAmount([{ id: product.id, price: product.price, quantity: 1 }], discountPercent, null);
  const discountedPrice = product.price - discount;

  return (
    <p className="mt-2.5 flex w-fit max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border border-[#ebcc64] bg-[#fff5ce] px-3 py-2 text-xs leading-snug text-[#201d19]">
      <strong className="whitespace-nowrap text-sm font-extrabold">{discountedPrice.toLocaleString("ru-RU")} ₽</strong>
      <span>
        Ещё −{discountPercent}% по промокоду <strong className="font-bold">{code}</strong>
      </span>
    </p>
  );
}
