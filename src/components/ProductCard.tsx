"use client";
import { useState } from "react";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { Product } from "@/lib/products";
import { productImagePaths } from "@/lib/productImages";
import { getBlackFridayCardPrice } from "@/lib/blackFridayPricing";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export default function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const mainImage = productImagePaths(product.id, 1)[0];
  const addItem = useCartStore((s) => s.addItem);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const isFavorite = useAuthStore((s) => s.isFavorite(product.id));
  const user = useAuthStore((s) => s.user);
  const blackFridayPrice = getBlackFridayCardPrice(product.id, product.price);
  const effectivePrice = blackFridayPrice?.salePrice ?? product.price;

  const discount = blackFridayPrice?.discountPercent ?? (product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ id: product.id, name: product.name, price: effectivePrice, category: product.category, unit: product.weight });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#f0e8e0] bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Фото */}
      <a href={`/product/${product.id}`}>
        <div className="relative aspect-[4/5] bg-[#fdf8f5] overflow-hidden">
          {!imgError ? (
            <img
              src={mainImage}
              alt={product.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">{product.category === "bads" ? "💊" : "🌱"}</div>
                <p className="text-xs text-[#aaa] px-4 text-center">{product.shortName}</p>
              </div>
            </div>
          )}
          {product.badge && !(blackFridayPrice && product.badge === "Скидка") && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold
              ${product.badge === "Хит" ? "bg-[#E8845A] text-white" : ""}
              ${product.badge === "Новинка" ? "bg-[#4CAF50] text-white" : ""}
              ${product.badge === "Скидка" ? "bg-[#FF6B6B] text-white" : ""}
              ${product.badge === "Осталось мало" ? "bg-[#F4B740] text-[#332304]" : ""}
            `}>
              {product.badge}
            </div>
          )}
          {discount && (
            <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold ${blackFridayPrice ? "bg-[#f8d933] text-[#151515] shadow-md" : "bg-[#FF6B6B] text-white"}`}>
              -{discount}%
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); if (user) toggleFavorite(product.id); }}
            title={user ? (isFavorite ? "Убрать из избранного" : "В избранное") : "Войдите, чтобы добавить в избранное"}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-white shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-[#fdf8f5]"
          >
            <Heart size={16} className={isFavorite ? "fill-[#E8845A] text-[#E8845A]" : "text-[#E8845A]"} />
          </button>
        </div>
      </a>

      {/* Инфо */}
      <div className="flex flex-1 flex-col p-4">
        <a href={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm text-[#1a1a1a] hover:text-[#E8845A] transition-colors leading-snug mb-1">{product.name}</h3>
        </a>
        <p className="text-xs text-[#aaa] mb-1">{product.weight}</p>
        {product.category === "bads" && (
          <p className="mb-3 text-[10px] leading-snug text-[#9a918c]">БАД. Не является лекарственным средством.</p>
        )}
        {blackFridayPrice ? (
          <div className="mt-auto overflow-hidden rounded-2xl border-2 border-[#151515] bg-[#151515] text-white shadow-[0_10px_24px_rgba(21,21,21,0.14)]">
            <div
              aria-hidden="true"
              className="h-2 bg-[repeating-linear-gradient(135deg,#f8d933_0px,#f8d933_10px,#151515_10px,#151515_20px)]"
            />
            <div className="px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#f8d933]">Цена Чёрной пятницы</p>
                <p className="text-[10px] font-semibold text-white/55">11–15 ноября</p>
              </div>
              <div className="mt-2 flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <div>
                  <p className="text-[10px] font-medium text-white/55">Обычная цена</p>
                  <p className="text-sm font-semibold text-white/60 line-through decoration-[#f8d933] decoration-2">
                    {blackFridayPrice.regularPrice.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-medium text-white/55">Новая цена</p>
                  <p className="text-2xl font-black leading-none tracking-[-0.04em] text-[#f8d933]">
                    {blackFridayPrice.salePrice.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-auto">
            <span className="font-bold text-lg text-[#1a1a1a]">{product.price.toLocaleString("ru-RU")} ₽</span>
            {product.oldPrice && (
              <span className="ml-2 text-xs text-[#aaa] line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</span>
            )}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              added ? "bg-green-500 text-white" : blackFridayPrice ? "bg-[#f8d933] text-[#151515] hover:bg-[#ffe867]" : "bg-[#E8845A] text-white hover:bg-[#d4703f]"
            }`}
          >
            {added ? <><Check size={14} /> Добавлено</> : <><ShoppingCart size={14} /> В корзину</>}
          </button>
        </div>
      </div>
    </div>
  );
}
