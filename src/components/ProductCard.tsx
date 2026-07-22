"use client";
import { useState } from "react";
import { ShoppingCart, Heart, Check } from "lucide-react";
import { Product } from "@/lib/products";
import { productImagePaths } from "@/lib/productImages";
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

  const discount = product.oldPrice
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
    : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({ id: product.id, name: product.name, price: product.price, category: product.category, unit: product.weight });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="group bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
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
          {product.badge && (
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold
              ${product.badge === "Хит" ? "bg-[#E8845A] text-white" : ""}
              ${product.badge === "Новинка" ? "bg-[#4CAF50] text-white" : ""}
              ${product.badge === "Скидка" ? "bg-[#FF6B6B] text-white" : ""}
            `}>
              {product.badge}
            </div>
          )}
          {discount && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#FF6B6B] text-white text-xs font-bold">
              -{discount}%
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); if (user) toggleFavorite(product.id); }}
            title={user ? (isFavorite ? "Убрать из избранного" : "В избранное") : "Войдите, чтобы добавить в избранное"}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#fdf8f5]"
          >
            <Heart size={16} className={isFavorite ? "fill-[#E8845A] text-[#E8845A]" : "text-[#E8845A]"} />
          </button>
        </div>
      </a>

      {/* Инфо */}
      <div className="p-4">
        <a href={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm text-[#1a1a1a] hover:text-[#E8845A] transition-colors leading-snug mb-1">{product.name}</h3>
        </a>
        <p className="text-xs text-[#aaa] mb-3">{product.weight}</p>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-lg text-[#1a1a1a]">{product.price.toLocaleString("ru-RU")} ₽</span>
            {product.oldPrice && (
              <span className="ml-2 text-xs text-[#aaa] line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</span>
            )}
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
