"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { Trash2, Tag, ShoppingBag, Check, X, Gift, Percent } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { productImagePaths } from "@/lib/productImages";

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const subtotal = useCartStore((s) => s.subtotal());
  const discountAmt = useCartStore((s) => s.discount());
  const total = useCartStore((s) => s.total());
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const referralCode = useCartStore((s) => s.referralCode);
  const referralDiscount = useCartStore((s) => s.referralDiscount);
  const setPromo = useCartStore((s) => s.setPromo);
  const setReferral = useCartStore((s) => s.setReferral);
  const removePromo = useCartStore((s) => s.removePromo);
  const removeReferral = useCartStore((s) => s.removeReferral);
  const user = useAuthStore((s) => s.user);

  const [promoInput, setPromoInput] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [referralError, setReferralError] = useState("");
  const freeDeliveryThreshold = 3000;
  const promoDiscountAmount = Math.round((subtotal * promoDiscount) / 100);
  const referralDiscountAmount = Math.round((subtotal * referralDiscount) / 100);
  const discountedSubtotal = Math.max(0, subtotal - promoDiscountAmount - referralDiscountAmount);
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - discountedSubtotal);
  const freeDeliveryProgress = Math.min(100, (discountedSubtotal / freeDeliveryThreshold) * 100);

  const validateCode = async (kind: "promo" | "referral", rawCode: string) => {
    if (!rawCode.trim()) return;
    const sessionResult = supabase ? await supabase.auth.getSession() : null;
    const token = sessionResult?.data.session?.access_token;
    const response = await fetch("/api/loyalty/validate", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ kind, code: rawCode }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (kind === "promo") setPromoError(payload.error || "Промокод не найден");
      else setReferralError(payload.error || "Реферальный код не найден");
      return;
    }
    if (kind === "promo") {
      setPromo(payload.code, payload.discountPercent);
      setPromoError("");
    } else {
      setReferral(payload.code, payload.discountPercent, payload.ownerId);
      setReferralError("");
    }
  };

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && !referralCode) {
      setReferralInput(code.toUpperCase());
      void validateCode("referral", code);
    }
  // Реферальный код из ссылки проверяется один раз при открытии корзины.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
          <div className="text-center max-w-sm">
            <div className="text-7xl mb-6">🛒</div>
            <h1 className="text-2xl font-bold mb-3">Корзина пуста</h1>
            <p className="text-[#6b6b6b] mb-8">Добавьте товары из каталога, чтобы оформить заказ</p>
            <Link href="/catalog" className="inline-flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-8 py-3.5 rounded-full transition-all hover:-translate-y-0.5">
              Перейти в каталог →
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfcfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Заголовок */}
          <div className="mb-8">
            <nav className="flex items-center gap-2 text-sm text-[#aaa] mb-4">
              <Link href="/" className="hover:text-[#E8845A]">Главная</Link>
              <span>/</span>
              <span className="text-[#1a1a1a]">Корзина</span>
            </nav>
            <h1 className="text-3xl font-bold">Корзина <span className="text-[#aaa] font-normal text-xl">({items.length} {items.length === 1 ? "товар" : items.length < 5 ? "товара" : "товаров"})</span></h1>
          </div>

          {!user && (
            <div className="mb-8 bg-[#fff4ee] border-l-4 border-[#E8845A] px-6 py-5 sm:px-8 sm:py-6">
              <p className="text-lg sm:text-xl text-[#3d332e] leading-relaxed">
                Покупали ранее?{" "}
                <Link
                  href="/auth?mode=login&redirect=/cart"
                  className="font-semibold underline underline-offset-4 decoration-[#E8845A] hover:text-[#E8845A] transition-colors"
                >
                  Авторизуйтесь
                </Link>
                {" "}или{" "}
                <Link
                  href="/auth?mode=register&redirect=/cart"
                  className="font-semibold underline underline-offset-4 decoration-[#E8845A] hover:text-[#E8845A] transition-colors"
                >
                  зарегистрируйтесь
                </Link>
              </p>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Левая часть — товары */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl border border-[#f0e8e0] p-4 sm:p-5 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-5">
                  {/* Изображение */}
                  <Link href={`/product/${item.id.replace(/-(\d+)g$/, "")}`} className="relative w-16 h-16 sm:w-20 sm:h-20 bg-[#fdf8f5] rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden hover:scale-105 transition-transform">
                    <span aria-hidden="true">{item.category === "seeds" ? "🌱" : "💊"}</span>
                    <img src={productImagePaths(item.id.replace(/-(\d+)g$/, ""), 1)[0] || item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.remove(); }} />
                  </Link>

                  {/* Инфо */}
                  <div className="flex-1 min-w-[calc(100%-5rem)] sm:min-w-0">
                    <Link href={`/product/${item.id}`} className="font-semibold text-sm hover:text-[#E8845A] transition-colors line-clamp-2 leading-snug">
                      {item.name}
                    </Link>
                    {item.unit && <p className="text-xs text-[#aaa] mt-0.5">{item.unit}</p>}
                    <p className="text-sm font-bold text-[#E8845A] mt-1">{item.price.toLocaleString("ru-RU")} ₽ / шт.</p>
                  </div>

                  {/* Количество */}
                  <div className="order-3 sm:order-none flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full border border-[#f0e8e0] flex items-center justify-center text-lg hover:bg-[#fdf8f5] hover:border-[#E8845A] transition-colors"
                    >−</button>
                    <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full border border-[#f0e8e0] flex items-center justify-center text-lg hover:bg-[#fdf8f5] hover:border-[#E8845A] transition-colors"
                    >+</button>
                  </div>

                  {/* Итог + удалить */}
                  <div className="ml-auto sm:ml-2 text-right flex-shrink-0">
                    <p className="font-bold text-base">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</p>
                    <button onClick={() => removeItem(item.id)} className="mt-2 flex items-center gap-1 text-xs text-[#aaa] hover:text-red-400 transition-colors ml-auto">
                      <Trash2 size={13} /> Удалить
                    </button>
                  </div>
                </div>
              ))}

              {/* Промокод и реферальный код */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={16} className="text-[#E8845A]" />
                  <p className="font-semibold text-sm">Скидки</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-2">Промокод</p>
                {promoCode ? (
                  <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-[#e8f5ee]">
                    <div className="flex items-center gap-2">
                      <Percent size={16} className="text-green-600" />
                      <span className="font-bold text-sm font-mono tracking-wide text-green-700">{promoCode}</span>
                      <span className="text-sm text-green-600">— скидка {promoDiscount}%</span>
                    </div>
                    <button onClick={removePromo} className="text-[#aaa] hover:text-red-400 ml-2">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && void validateCode("promo", promoInput)}
                      placeholder="Например, ВЗБАДРИСЬ10"
                      className="flex-1 px-4 py-2.5 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors font-mono tracking-wide uppercase"
                    />
                    <button
                      onClick={() => void validateCode("promo", promoInput)}
                      className="px-5 py-2.5 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold text-sm rounded-2xl transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs text-red-400 mt-2">{promoError}</p>}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-2">Реферальный код</p>
                    {referralCode ? (
                      <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-[#fff8f5] border border-[#f5d5c0]">
                        <div className="flex items-center gap-2"><Gift size={16} className="text-[#E8845A]" /><span className="font-bold text-sm font-mono tracking-wide text-[#E8845A]">{referralCode}</span><span className="text-sm text-[#8b4513]">— скидка {referralDiscount}%</span></div>
                        <button onClick={removeReferral} className="text-[#aaa] hover:text-red-400 ml-2"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" value={referralInput} onChange={(e) => { setReferralInput(e.target.value.toUpperCase()); setReferralError(""); }} onKeyDown={(e) => e.key === "Enter" && void validateCode("referral", referralInput)} placeholder="Код от подруги или блогера" className="flex-1 px-4 py-2.5 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors font-mono tracking-wide uppercase" />
                        <button onClick={() => void validateCode("referral", referralInput)} className="px-5 py-2.5 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold text-sm rounded-2xl transition-colors">Применить</button>
                      </div>
                    )}
                    {referralError && <p className="text-xs text-red-400 mt-2">{referralError}</p>}
                  </div>
                </div>
                <p className="text-xs text-[#aaa] mt-3">Можно применить один промокод и один реферальный код — скидки суммируются.</p>
              </div>
            </div>

            {/* Правая часть — итог */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-5">Итог заказа</h2>

                <div className="flex items-center gap-4 rounded-2xl bg-[#fff7f2] p-4 mb-5">
                  <div className="relative h-16 w-16 flex-shrink-0" aria-hidden="true">
                    <svg className="-rotate-90 h-16 w-16" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        fill="none"
                        stroke="#F4E4DA"
                        strokeWidth="8"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="25"
                        fill="none"
                        stroke="#E8845A"
                        strokeWidth="8"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - freeDeliveryProgress}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#E8845A]">
                      {Math.round(freeDeliveryProgress)}%
                    </span>
                  </div>
                  <div>
                    {amountToFreeDelivery > 0 ? (
                      <>
                        <p className="text-sm font-semibold leading-snug text-[#3d332e]">
                          До бесплатной доставки не хватает
                        </p>
                        <p className="mt-1 text-lg font-bold text-[#E8845A]">
                          {amountToFreeDelivery.toLocaleString("ru-RU")} ₽
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[#3d332e]">
                          Бесплатная доставка доступна
                        </p>
                        <p className="mt-1 text-xs text-[#8b6b5d]">
                          Сумма товаров после скидок — от 3 000 ₽
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Товары ({items.reduce((s, i) => s + i.quantity, 0)} шт.)</span>
                    <span>{subtotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  {promoCode && promoDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Промокод {promoCode} ({promoDiscount}%)</span>
                      <span className="text-green-600 font-semibold">−{promoDiscountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  {referralCode && referralDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#E8845A]">Реферальный код {referralCode} ({referralDiscount}%)</span>
                      <span className="text-[#E8845A] font-semibold">−{referralDiscountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Доставка</span>
                    <span className="text-green-600 font-semibold">
                      {discountedSubtotal >= freeDeliveryThreshold ? "0 ₽" : "от 250 ₽"}
                    </span>
                  </div>
                  <p className="text-xs text-[#aaa] bg-[#fdf8f5] rounded-xl p-3">
                    Самовывоз в Казани — бесплатно. Точную стоимость другого способа выберете при оформлении.
                  </p>
                </div>

                <div className="border-t border-[#f0e8e0] pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">К оплате</span>
                    <span className="font-bold text-xl text-[#E8845A]">{total.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full bg-[#E8845A] hover:bg-[#d4703f] text-white font-bold py-4 rounded-full transition-all hover:-translate-y-0.5 hover:shadow-lg text-base flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} />
                  Оформить заказ
                </button>

                <div className="mt-4 space-y-2">
                  {["Документы на каждый товар", "Безопасная оплата через Ozon Pay", "Доставка по всей России"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#6b6b6b]">
                      <Check size={13} className="text-[#E8845A] flex-shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Продолжить покупки */}
          <div className="mt-8">
            <Link href="/catalog" className="inline-flex items-center gap-2 text-sm text-[#6b6b6b] hover:text-[#E8845A] transition-colors">
              ← Продолжить покупки
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
