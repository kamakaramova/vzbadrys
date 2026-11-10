export const BLACK_FRIDAY_LIVE = true;

type BlackFridayPriceSnapshot = {
  regularPrice: number;
  salePrice: number;
};

const BLACK_FRIDAY_PRICES: Record<string, BlackFridayPriceSnapshot> = {
  "magniy-bisglitinat": { regularPrice: 901, salePrice: 721 },
  "selen-tsink": { regularPrice: 715, salePrice: 572 },
  "magniy-citrat-b6": { regularPrice: 868, salePrice: 694 },
  "nabor-magniy-tsink-selen": { regularPrice: 2484, salePrice: 1499 },
};

export type BlackFridayCardPrice = {
  regularPrice: number;
  salePrice: number;
  discountPercent: number;
};

export function getBlackFridayCardPrice(productId: string, currentPrice: number): BlackFridayCardPrice | null {
  const snapshot = BLACK_FRIDAY_PRICES[productId];
  if (!snapshot || !BLACK_FRIDAY_LIVE || !Number.isFinite(currentPrice) || snapshot.salePrice >= snapshot.regularPrice) return null;

  return {
    regularPrice: snapshot.regularPrice,
    salePrice: snapshot.salePrice,
    discountPercent: Math.round((1 - snapshot.salePrice / snapshot.regularPrice) * 100),
  };
}
