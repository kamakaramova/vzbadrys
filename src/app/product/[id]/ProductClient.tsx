"use client";
import { useState } from "react";
import Link from "next/link";
import { Product } from "@/lib/products";
import { ShoppingCart, Heart, FileText, ChevronLeft, ChevronRight, Check, Shield, AlertCircle } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

type Tab = "description" | "composition" | "howto" | "docs";

export default function ProductClient({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("description");
  const [imageIndex, setImageIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const toggleFavorite = useAuthStore((s) => s.toggleFavorite);
  const isFavorite = useAuthStore((s) => s.isFavorite(product.id));
  const user = useAuthStore((s) => s.user);

  // Для семян — выбор граммовки
  const isSeed = product.category === "seeds" && (product.weightVariants?.length ?? 0) > 0;
  const defaultVariantIdx = isSeed
    ? Math.max(0, product.weightVariants!.findIndex((v) => v.badge))
    : 0;
  const [variantIdx, setVariantIdx] = useState(defaultVariantIdx);
  const selectedVariant = isSeed ? product.weightVariants![variantIdx] : null;

  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeOldPrice = selectedVariant ? selectedVariant.oldPrice : product.oldPrice;

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        id: selectedVariant ? `${product.id}-${selectedVariant.grams}g` : product.id,
        name: selectedVariant ? `${product.name} ${selectedVariant.label}` : product.name,
        price: activePrice,
        category: product.category,
        unit: selectedVariant ? selectedVariant.label : product.weight,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "description", label: "Описание" },
    { key: "composition", label: "Состав" },
    { key: "howto", label: "Как принимать" },
    { key: "docs", label: `Документы (${product.documents.length})` },
  ];

  return (
    <main className="min-h-screen">
      {/* Хлебные крошки */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-[#aaa]">
          <Link href="/" className="hover:text-[#E8845A]">Главная</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-[#E8845A]">Каталог</Link>
          <span>/</span>
          <Link href={`/catalog?cat=${product.category}`} className="hover:text-[#E8845A]">
            {product.category === "bads" ? "БАДы" : "Семена"}
          </Link>
          <span>/</span>
          <span className="text-[#1a1a1a]">{product.shortName}</span>
        </nav>
      </div>

      {/* Основной блок */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Галерея */}
          <div>
            <div className="relative aspect-square bg-[#fdf8f5] rounded-3xl overflow-hidden mb-4 flex items-center justify-center">
              <div className="text-center">
                <div className="text-[120px]">{product.category === "bads" ? "💊" : "🌱"}</div>
                <p className="text-sm text-[#aaa] mt-2">{product.name}</p>
              </div>
              {product.images.length > 1 && (
                <>
                  <button onClick={() => setImageIndex((i) => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-[#fdf8f5]">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setImageIndex((i) => Math.min(product.images.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center hover:bg-[#fdf8f5]">
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              {product.badge && (
                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold
                  ${product.badge === "Хит" ? "bg-[#E8845A] text-white" : ""}
                  ${product.badge === "Новинка" ? "bg-[#4CAF50] text-white" : ""}
                  ${product.badge === "Скидка" ? "bg-[#FF6B6B] text-white" : ""}
                `}>
                  {product.badge}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {product.images.map((_, i) => (
                <button key={i} onClick={() => setImageIndex(i)} className={`w-16 h-16 rounded-xl bg-[#fdf8f5] border-2 transition-colors flex items-center justify-center ${i === imageIndex ? "border-[#E8845A]" : "border-transparent"}`}>
                  <span className="text-2xl">{product.category === "bads" ? "💊" : "🌱"}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Инфо */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] mb-2">{product.name}</h1>
            <p className="text-sm text-[#aaa] mb-5">{product.weight} · {product.servings} порций</p>

            {/* Кому подойдёт */}
            <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-5 mb-5">
              <div className="flex items-center gap-2 mb-3">
                <Check size={16} className="text-[#E8845A]" />
                <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest">Кому подойдёт</p>
              </div>
              <ul className="flex flex-col gap-2">
                {product.whoNeeds.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1a1a1a]">
                    <Check size={14} className="text-[#E8845A] mt-0.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* Выбор граммовки (только для семян) */}
            {isSeed && product.weightVariants && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-2">Выберите объём</p>
                <div className="flex flex-wrap gap-2">
                  {product.weightVariants.map((v, i) => {
                    const vDiscount = v.oldPrice ? Math.round(((v.oldPrice - v.price) / v.oldPrice) * 100) : null;
                    return (
                      <button
                        key={i}
                        onClick={() => setVariantIdx(i)}
                        className={`relative flex flex-col items-center px-4 py-2.5 rounded-2xl border-2 transition-all text-sm font-semibold ${
                          variantIdx === i
                            ? "border-[#E8845A] bg-[#fff8f5] text-[#E8845A]"
                            : "border-[#f0e8e0] text-[#6b6b6b] hover:border-[#f5c9b0]"
                        }`}
                      >
                        <span className="font-bold">{v.label}</span>
                        <span className={`text-xs mt-0.5 ${variantIdx === i ? "text-[#E8845A]" : "text-[#aaa]"}`}>{v.price.toLocaleString("ru-RU")} ₽</span>
                        {vDiscount && (
                          <span className="absolute -top-2 -right-2 bg-[#FF6B6B] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">-{vDiscount}%</span>
                        )}
                        {v.badge && !vDiscount && (
                          <span className="absolute -top-2 -right-2 bg-[#E8845A] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{v.badge}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Цена */}
            <div className="flex items-baseline gap-3 mb-5">
              <span className="text-3xl font-bold">{activePrice.toLocaleString("ru-RU")} ₽</span>
              {activeOldPrice && <span className="text-lg text-[#aaa] line-through">{activeOldPrice.toLocaleString("ru-RU")} ₽</span>}
              {activeOldPrice && <span className="bg-[#FF6B6B] text-white text-sm font-bold px-2.5 py-1 rounded-full">-{Math.round(((activeOldPrice - activePrice) / activeOldPrice) * 100)}%</span>}
            </div>

            {/* Количество + корзина */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center border border-[#f0e8e0] rounded-full">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center text-[#6b6b6b] hover:bg-[#fdf8f5] rounded-full text-lg">−</button>
                <span className="w-10 text-center font-semibold text-sm">{qty}</span>
                <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 flex items-center justify-center text-[#6b6b6b] hover:bg-[#fdf8f5] rounded-full text-lg">+</button>
              </div>
              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-full transition-all ${added ? "bg-green-500 text-white" : "bg-[#E8845A] hover:bg-[#d4703f] text-white hover:-translate-y-0.5 hover:shadow-lg"}`}
              >
                {added ? <><Check size={18} /> Добавлено!</> : <><ShoppingCart size={18} /> В корзину</>}
              </button>
              <button
                onClick={() => user ? toggleFavorite(product.id) : undefined}
                title={user ? (isFavorite ? "Убрать из избранного" : "В избранное") : "Войдите, чтобы добавить"}
                className={`p-3 rounded-full border transition-all ${isFavorite ? "bg-[#E8845A] border-[#E8845A] text-white" : "border-[#f0e8e0] hover:bg-[#fdf8f5] text-[#E8845A]"}`}
              >
                <Heart size={20} className={isFavorite ? "fill-white" : ""} />
              </button>
            </div>
            <p className="text-sm font-semibold text-center mb-5">
              Итого: {(activePrice * qty).toLocaleString("ru-RU")} ₽
              {isSeed && selectedVariant && <span className="text-[#aaa] font-normal"> · {selectedVariant.label}</span>}
            </p>

            {/* Качество */}
            <div className="border border-[#f0e8e0] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={15} className="text-[#E8845A]" />
                <p className="text-xs font-semibold text-[#aaa] uppercase tracking-widest">Состав и качество</p>
              </div>
              <ul className="flex flex-col gap-2">
                {product.qualityPoints.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-[#E8845A] mt-0.5 flex-shrink-0" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Вкладки */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-1 border-b border-[#f0e8e0] mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-[#E8845A] text-[#E8845A]" : "border-transparent text-[#6b6b6b] hover:text-[#1a1a1a]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "description" && (
          <div className="max-w-3xl space-y-10">
            {/* Описание */}
            <div>
              <p className="text-[#1a1a1a] leading-relaxed text-base">{product.description}</p>
            </div>

            {/* Что даёт */}
            <div>
              <h3 className="text-xl font-bold mb-6">Что даёт регулярный приём</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {product.benefits.map((b, i) => (
                  <div key={i} className="bg-[#fdf8f5] rounded-2xl p-5">
                    <p className="font-semibold text-sm text-[#E8845A] mb-2">{b.title}</p>
                    <p className="text-sm text-[#6b6b6b] leading-relaxed">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Кому подойдёт */}
            <div className="bg-gradient-to-br from-[#FDDCCA]/40 to-[#fdf8f5] rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Кому особенно нужен</h3>
              <ul className="grid sm:grid-cols-2 gap-2.5">
                {product.whoNeeds.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#1a1a1a]">
                    <Check size={15} className="text-[#E8845A] mt-0.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "composition" && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-[#fdf8f5] rounded-2xl p-6">
              <p className="text-xs font-semibold text-[#aaa] uppercase tracking-widest mb-2">Полный состав</p>
              <p className="text-[#1a1a1a] leading-relaxed">{product.composition}</p>
            </div>
            <h3 className="text-lg font-bold">Почему именно такие формы</h3>
            <div className="flex flex-col gap-4">
              {product.compositionDetails.map((c, i) => (
                <div key={i} className="border border-[#f0e8e0] rounded-2xl p-5">
                  <p className="font-semibold text-sm text-[#E8845A] mb-2">{c.title}</p>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "howto" && (
          <div className="max-w-xl">
            <div className="bg-[#fdf8f5] rounded-2xl p-6">
              <p className="text-xs font-semibold text-[#aaa] uppercase tracking-widest mb-3">Схема приёма</p>
              <p className="text-[#1a1a1a] leading-relaxed">{product.howToTake}</p>
            </div>
            <p className="text-xs text-[#aaa] mt-4 leading-relaxed">Не является лекарственным средством. Перед применением проконсультируйтесь со специалистом.</p>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="max-w-xl flex flex-col gap-3">
            {product.documents.map((doc, i) => (
              <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[#fdf8f5] rounded-2xl hover:bg-[#FDDCCA]/30 transition-colors group">
                <FileText size={20} className="text-[#E8845A] flex-shrink-0" />
                <span className="text-sm font-medium group-hover:text-[#E8845A] transition-colors">{doc.name}</span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Похожие */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="text-2xl font-bold mb-8">Похожие товары</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/product/${p.id}`} className="block bg-white rounded-3xl border border-[#f0e8e0] p-5 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="text-5xl text-center mb-3">{p.category === "bads" ? "💊" : "🌱"}</div>
                <p className="font-semibold text-sm mb-1">{p.name}</p>
                <p className="text-xs text-[#aaa] mb-3">{p.weight}</p>
                <p className="font-bold text-[#E8845A]">{p.price.toLocaleString("ru-RU")} ₽</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
