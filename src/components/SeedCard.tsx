"use client";
import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { Product, WeightVariant } from "@/lib/products";
import { productImagePaths } from "@/lib/productImages";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export default function SeedCard({ product }: { product: Product }) {
  const variants = product.weightVariants ?? [];
  const defaultIdx = variants.findIndex((v) => v.badge) ?? 0;
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const mainImage = productImagePaths(product.id, 1)[0];

  const addItem = useCartStore((s) => s.addItem);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const isFavorite = useAuthStore((s) => s.isFavorite(product.id));
  const user = useAuthStore((s) => s.user);

  const selected: WeightVariant = variants[selectedIdx] ?? { label: product.weight, grams: 0, price: product.price };
  const discount = selected.oldPrice
    ? Math.round(((selected.oldPrice - selected.price) / selected.oldPrice) * 100)
    : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: `${product.id}-${selected.grams}g`,
      name: `${product.name} ${selected.label}`,
      price: selected.price,
      category: product.category,
      unit: selected.label,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="group bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col">
      {/* Фото */}
      <Link href={`/product/${product.id}`} className="block relative bg-[#fdf8f5] overflow-hidden">
        <div className="aspect-[4/5]">
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
                <div className="text-6xl mb-2">🌱</div>
                <p className="text-xs text-[#aaa] px-4 text-center">{product.shortName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Бейдж выбранного варианта */}
        {selected.badge && (
          <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold
            ${selected.badge === "Хит" ? "bg-[#E8845A] text-white" : ""}
            ${selected.badge === "Новинка" ? "bg-[#4CAF50] text-white" : ""}
            ${selected.badge === "Скидка" ? "bg-[#FF6B6B] text-white" : ""}
          `}>
            {selected.badge}
          </div>
        )}
        {discount && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#FF6B6B] text-white text-xs font-bold">
            -{discount}%
          </div>
        )}

        {/* Избранное */}
        <button
          onClick={(e) => { e.preventDefault(); if (user) toggleFavorite(product.id); }}
          title={user ? (isFavorite ? "Убрать из избранного" : "В избранное") : "Войдите, чтобы добавить в избранное"}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#fdf8f5]"
        >
          <Heart size={16} className={isFavorite ? "fill-[#E8845A] text-[#E8845A]" : "text-[#E8845A]"} />
        </button>
      </Link>

      {/* Инфо */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm text-[#1a1a1a] hover:text-[#E8845A] transition-colors leading-snug mb-3">
            {product.name}
          </h3>
        </Link>

        {/* Выбор граммовки */}
        {variants.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {variants.map((v, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  selectedIdx === i
                    ? "bg-[#E8845A] text-white border-[#E8845A]"
                    : "bg-white text-[#6b6b6b] border-[#f0e8e0] hover:border-[#E8845A] hover:text-[#E8845A]"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Цена + кнопка */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            <span className="font-bold text-lg text-[#1a1a1a]">{selected.price.toLocaleString("ru-RU")} ₽</span>
            {selected.oldPrice && (
              <span className="ml-1.5 text-xs text-[#aaa] line-through">{selected.oldPrice.toLocaleString("ru-RU")} ₽</span>
            )}
            <p className="text-[10px] text-[#aaa] mt-0.5">{selected.label}</p>
          </div>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full transition-all ${
              added ? "bg-green-500 text-white" : "bg-[#E8845A] hover:bg-[#d4703f] text-white"
            }`}
          >
            {added ? <><Check size={14} /> Добавлено</> : <><ShoppingCart size={14} /> В корзину</>}
          </button>
        </div>
      </div>
    </div>
  );
}
