import type { Product } from "@/lib/products";

export const HEALTH_BUNDLE_ID = "nabor-magniy-tsink-selen";
export const HEALTH_BUNDLE_COMPONENT_IDS = [
  "magniy-citrat-b6",
  "magniy-bisglitinat",
  "selen-tsink",
] as const;

// Комплект не является отдельной складской единицей: доступный остаток равен
// минимальному остатку среди трёх физических баночек.
export function withBundleAvailability(catalogue: Product[]): Product[] {
  const bundle = catalogue.find((product) => product.id === HEALTH_BUNDLE_ID);
  if (!bundle) return catalogue;

  const parts = HEALTH_BUNDLE_COMPONENT_IDS.map((id) => catalogue.find((product) => product.id === id));
  const allAvailable = parts.every((part) => part?.inStock);
  const quantities = parts.map((part) => part?.stockQty);
  const stockQty = quantities.every((quantity): quantity is number => typeof quantity === "number")
    ? Math.min(...quantities)
    : undefined;

  return catalogue.map((product) => product.id === HEALTH_BUNDLE_ID
    ? { ...product, inStock: Boolean(bundle.bundleEnabled !== false && allAvailable && stockQty !== undefined && stockQty > 0), stockQty }
    : product);
}

export function isVisibleOrderLine(line: Record<string, unknown>) {
  return line.hiddenInOrder !== true;
}

// Для чека набор раскладывается на три маркируемые позиции. Их суммы в рублях
// всегда точно сходятся с ценой комплекта, без отдельной фиктивной строки БАДа.
export function bundleComponentPrices(bundlePrice: number, componentPrices: number[]) {
  const total = componentPrices.reduce((sum, price) => sum + price, 0);
  if (!Number.isInteger(bundlePrice) || bundlePrice <= 0 || componentPrices.length === 0
    || componentPrices.some((price) => !Number.isInteger(price) || price <= 0) || total <= 0) {
    throw new Error("Некорректная цена набора");
  }
  let allocated = 0;
  return componentPrices.map((price, index) => {
    const amount = index === componentPrices.length - 1
      ? bundlePrice - allocated
      : Math.floor((price / total) * bundlePrice);
    allocated += amount;
    return amount;
  });
}

export function buildBundleOrderLines(
  bundle: Product,
  parts: Product[],
  quantity: number,
  fiscalName: (product: Product) => string,
) {
  if (bundle.id !== HEALTH_BUNDLE_ID || !Number.isInteger(quantity) || quantity <= 0
    || parts.length !== HEALTH_BUNDLE_COMPONENT_IDS.length
    || parts.some((part, index) => part.id !== HEALTH_BUNDLE_COMPONENT_IDS[index])) {
    throw new Error("Некорректный состав набора");
  }
  const prices = bundleComponentPrices(bundle.price, parts.map((part) => part.price));
  return [
    {
      cartId: bundle.id, productId: bundle.id, name: bundle.name,
      fiscalName: bundle.name, needMark: false,
      quantity, unitPrice: 0, displayUnitPrice: bundle.price,
      stockAmount: 0, category: bundle.category, bundleDisplayOnly: true,
    },
    ...parts.map((part, index) => ({
      cartId: `${bundle.id}:${part.id}`, productId: part.id,
      name: part.name, fiscalName: fiscalName(part), needMark: true,
      quantity, unitPrice: prices[index], stockAmount: quantity,
      category: part.category, hiddenInOrder: true, bundleParentId: bundle.id,
    })),
  ];
}
