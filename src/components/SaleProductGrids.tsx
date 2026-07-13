"use client";
import Link from "next/link";
import { useProducts } from "@/store/productStore";

export default function SaleProductGrids() {
  const { products } = useProducts();
  const inStock = products.filter((p) => p.inStock);
  const saleProducts = inStock.filter((p) => p.badge === "Скидка" || p.oldPrice);
  const hitProducts = inStock.filter((p) => p.badge === "Хит");
  const discount = (price: number, old: number) => Math.round((1 - price / old) * 100);

  return (
    <>
      {/* Товары со скидкой */}
      {saleProducts.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">Скидки</h2>
            <span className="text-xs font-semibold bg-[#ffeee6] text-[#E8845A] px-3 py-1 rounded-full">{saleProducts.length} товара</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {saleProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="group block bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48 bg-gradient-to-br from-[#fdf8f5] to-[#FDDCCA]/30 flex items-center justify-center">
                  <span className="text-6xl">{product.category === "seeds" ? "🌱" : "💊"}</span>
                  {product.oldPrice && (
                    <span className="absolute top-3 left-3 bg-[#E8845A] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      −{discount(product.price, product.oldPrice)}%
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold text-sm leading-snug mb-2 group-hover:text-[#E8845A] transition-colors line-clamp-2">{product.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-[#E8845A]">{product.price.toLocaleString("ru-RU")} ₽</span>
                    {product.oldPrice && (
                      <span className="text-sm text-[#aaa] line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Хиты продаж */}
      {hitProducts.length > 0 && (
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold">Хиты продаж</h2>
            <span className="text-xs font-semibold bg-[#fff3e0] text-[#e65100] px-3 py-1 rounded-full">🔥 Топ</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {hitProducts.map((product) => (
              <Link key={product.id} href={`/product/${product.id}`} className="group block bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48 bg-gradient-to-br from-[#fdf8f5] to-[#FDDCCA]/30 flex items-center justify-center">
                  <span className="text-6xl">{product.category === "seeds" ? "🌱" : "💊"}</span>
                  <span className="absolute top-3 left-3 bg-[#1a1a1a] text-white text-xs font-bold px-2.5 py-1 rounded-full">Хит</span>
                </div>
                <div className="p-4">
                  <p className="font-bold text-sm leading-snug mb-2 group-hover:text-[#E8845A] transition-colors line-clamp-2">{product.name}</p>
                  <span className="text-lg font-black text-[#E8845A]">{product.price.toLocaleString("ru-RU")} ₽</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
