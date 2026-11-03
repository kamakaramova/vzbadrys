export type PromoCartItem = { id: string; price: number; quantity: number };

function productIdFromCartId(cartId: string) {
  return cartId.match(/^(.+)-(\d+)g$/)?.[1] ?? cartId;
}

// null означает «все товары»; пустой список не является допустимой областью действия.
export function promoEligibleSubtotal(items: PromoCartItem[], productIds: string[] | null): number {
  const allowed = productIds === null ? null : new Set(productIds);
  return items.reduce((total, item) => {
    if (allowed && !allowed.has(productIdFromCartId(item.id))) return total;
    return total + item.price * item.quantity;
  }, 0);
}

export function promoDiscountAmount(items: PromoCartItem[], percent: number, productIds: string[] | null): number {
  return Math.round(promoEligibleSubtotal(items, productIds) * percent / 100);
}

export function parsePromoProductIds(value: unknown): string[] | null | undefined {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return undefined;
  if (value.some((id) => typeof id !== "string" || !/^[a-z0-9_-]{2,100}$/i.test(id))) return undefined;
  const ids = [...new Set(value as string[])];
  return ids.length === value.length ? ids : undefined;
}
