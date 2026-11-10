"use client";
import ProductCard from "@/components/ProductCard";
import { HEALTH_BUNDLE_ID } from "@/lib/bundle";
import { getBlackFridayCardPrice } from "@/lib/blackFridayPricing";
import { useProducts } from "@/store/productStore";

export default function SaleProductGrids() {
  const { products } = useProducts();
  const inStock = products.filter((p) => p.category === "bads" && p.inStock);
  const blackFridayProducts = products.filter(
    (product) => product.category === "bads"
      && (product.inStock || (process.env.NODE_ENV === "development" && product.id === HEALTH_BUNDLE_ID))
      && getBlackFridayCardPrice(product.id, product.price),
  );
  const blackFridayActive = blackFridayProducts.length > 0;
  const saleProducts = blackFridayActive
    ? blackFridayProducts
    : inStock.filter((p) => p.badge === "Скидка" || p.oldPrice);
  const hitProducts = inStock.filter((p) => p.badge === "Хит");

  return (
    <>
      {/* Товары со скидкой */}
      {saleProducts.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">{blackFridayActive ? "Цены Чёрной пятницы" : "Скидки"}</h2>
            <span className="text-xs font-semibold bg-[#ffeee6] text-[#E8845A] px-3 py-1 rounded-full">{saleProducts.length} товара</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {saleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {/* Хиты продаж */}
      {!blackFridayActive && hitProducts.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">Хиты продаж</h2>
            <span className="text-xs font-semibold bg-[#fff3e0] text-[#e65100] px-3 py-1 rounded-full">🔥 Топ</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {hitProducts.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}
    </>
  );
}
