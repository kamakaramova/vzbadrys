"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { usePromoStore } from "@/store/promoStore";
import { Trash2, Tag, ShoppingBag, Check, X, Gift, Percent } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const promoType = useCartStore((s) => s.promoType);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const removePromo = useCartStore((s) => s.removePromo);
  const user = useAuthStore((s) => s.user);
  const users = useAuthStore((s) => s.users);
  const promos = usePromoStore((s) => s.promos);
  const activePromos = useMemo(() => {
    const now = new Date();
    return promos.filter((p) => p.active && (!p.expiresAt || new Date(p.expiresAt) >= now));
  }, [promos]);

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const freeDelivery = subtotal >= 3000;
  const deliveryCost = freeDelivery ? 0 : 300;

  const handlePromo = () => {
    if (!promoInput.trim()) return;
    const result = applyPromo(
      promoInput,
      users.map((u) => ({ id: u.id, referralCode: u.referralCode })),
      activePromos.map((p) => ({ code: p.code, discount: p.discount }))
    );
    if (result.ok) {
      setPromoError("");
    } else {
      setPromoError(result.error || "Промокод не найден");
    }
  };

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
                <div key={item.id} className="bg-white rounded-3xl border border-[#f0e8e0] p-5 flex items-center gap-5">
                  {/* Изображение */}
                  <Link href={`/product/${item.id}`} className="w-20 h-20 bg-[#fdf8f5] rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 hover:scale-105 transition-transform">
                    {item.category === "seeds" ? "🌱" : "💊"}
                  </Link>

                  {/* Инфо */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${item.id}`} className="font-semibold text-sm hover:text-[#E8845A] transition-colors line-clamp-2 leading-snug">
                      {item.name}
                    </Link>
                    {item.unit && <p className="text-xs text-[#aaa] mt-0.5">{item.unit}</p>}
                    <p className="text-sm font-bold text-[#E8845A] mt-1">{item.price.toLocaleString("ru-RU")} ₽ / шт.</p>
                  </div>

                  {/* Количество */}
                  <div className="flex items-center gap-2 flex-shrink-0">
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
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold text-base">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</p>
                    <button onClick={() => removeItem(item.id)} className="mt-2 flex items-center gap-1 text-xs text-[#aaa] hover:text-red-400 transition-colors ml-auto">
                      <Trash2 size={13} /> Удалить
                    </button>
                  </div>
                </div>
              ))}

              {/* Промокод / реферальный код */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Tag size={16} className="text-[#E8845A]" />
                  <p className="font-semibold text-sm">Промокод или реферальный код</p>
                </div>

                {promoCode ? (
                  <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ${promoType === "referral" ? "bg-[#fff8f5] border border-[#f5d5c0]" : "bg-[#e8f5ee]"}`}>
                    <div className="flex items-center gap-2">
                      {promoType === "referral"
                        ? <Gift size={16} className="text-[#E8845A]" />
                        : <Percent size={16} className="text-green-600" />
                      }
                      <span className={`font-bold text-sm font-mono tracking-wide ${promoType === "referral" ? "text-[#E8845A]" : "text-green-700"}`}>{promoCode}</span>
                      <span className={`text-sm ${promoType === "referral" ? "text-[#8b4513]" : "text-green-600"}`}>
                        {promoType === "referral" ? `— реферальная скидка ${promoDiscount}%` : `— скидка ${promoDiscount}%`}
                      </span>
                    </div>
                    <button onClick={removePromo} className="text-[#aaa] hover:text-red-400 ml-2">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && handlePromo()}
                      placeholder="ВЗБАДРИСЬ10 или реферальный код"
                      className="flex-1 px-4 py-2.5 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors font-mono tracking-wide uppercase"
                    />
                    <button
                      onClick={handlePromo}
                      className="px-5 py-2.5 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold text-sm rounded-2xl transition-colors"
                    >
                      Применить
                    </button>
                  </div>
                )}
                {promoError && <p className="text-xs text-red-400 mt-2">{promoError}</p>}
                <p className="text-xs text-[#aaa] mt-2">Промокод магазина или код от подруги — вводятся в одно поле</p>
              </div>
            </div>

            {/* Правая часть — итог */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-5">Итог заказа</h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Товары ({items.reduce((s, i) => s + i.quantity, 0)} шт.)</span>
                    <span>{subtotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Промокод {promoCode}</span>
                      <span className="text-green-600 font-semibold">−{discountAmt.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Доставка</span>
                    <span className={freeDelivery ? "text-green-600 font-semibold" : ""}>
                      {freeDelivery ? "Бесплатно 🎉" : `${deliveryCost} ₽`}
                    </span>
                  </div>
                  {!freeDelivery && (
                    <p className="text-xs text-[#aaa] bg-[#fdf8f5] rounded-xl p-3">
                      До бесплатной доставки осталось {(3000 - subtotal).toLocaleString("ru-RU")} ₽
                    </p>
                  )}
                </div>

                <div className="border-t border-[#f0e8e0] pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-bold text-lg">К оплате</span>
                    <span className="font-bold text-xl text-[#E8845A]">{(total + deliveryCost).toLocaleString("ru-RU")} ₽</span>
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
