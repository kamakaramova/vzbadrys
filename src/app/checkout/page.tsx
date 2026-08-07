"use client";
import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import PochtaWidget, { PochtaPoint } from "@/components/PochtaWidget";
import PaymentLogos from "@/components/PaymentLogos";
import { productImagePaths } from "@/lib/productImages";
import { Check, MapPin, Package, CreditCard, MessageSquare } from "lucide-react";

type DeliveryMethod = "pickup" | "sdek_pvz" | "yandex_pvz" | "ozon_pvz" | "pochta";

// Приводит ввод к российскому формату: 8… или 9… автоматически становятся +7…
function formatPhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  else if (d.startsWith("9")) d = "7" + d;
  d = d.slice(0, 11);
  if (!d) return "";
  let r = "+7";
  if (d.length > 1) r += " (" + d.slice(1, 4);
  if (d.length >= 4) r += ") " + d.slice(4, 7);
  if (d.length >= 7) r += "-" + d.slice(7, 9);
  if (d.length >= 9) r += "-" + d.slice(9, 11);
  return r;
}

const phoneDigits = (v: string) => v.replace(/\D/g, "").length;
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discountAmt = useCartStore((s) => s.discount());
  const total = useCartStore((s) => s.total());
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const referralCode = useCartStore((s) => s.referralCode);
  const referralDiscount = useCartStore((s) => s.referralDiscount);
  const bonusPointsToSpend = useCartStore((s) => s.bonusPointsToSpend);
  const setBonusPointsToSpend = useCartStore((s) => s.setBonusPointsToSpend);
  const user = useAuthStore((s) => s.user);

  const [delivery, setDelivery] = useState<DeliveryMethod>("sdek_pvz");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [form, setForm] = useState({
    name: "",
    surname: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    zip: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [showPochtaMap, setShowPochtaMap] = useState(false);
  const [pochtaPoint, setPochtaPoint] = useState<PochtaPoint | null>(null);

  const deliveryOptions: { id: DeliveryMethod; label: string; desc: string; price: number; days: string; isPvz: boolean }[] = [
    { id: "pickup", label: "Самовывоз — Казань", desc: "г. Казань, ул. Айдарова, 15", price: 0, days: "после готовности заказа", isPvz: false },
    { id: "sdek_pvz", label: "СДЭК — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ СДЭК", price: subtotal >= 3000 ? 0 : 300, days: "2–5 дней", isPvz: true },
    { id: "yandex_pvz", label: "Яндекс — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ Яндекс", price: subtotal >= 3000 ? 0 : 300, days: "3–6 дней", isPvz: true },
    { id: "ozon_pvz", label: "Ozon — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ Ozon", price: subtotal >= 3000 ? 0 : 250, days: "3–7 дней", isPvz: true },
    { id: "pochta", label: "Почта России", desc: "В любой населённый пункт России", price: subtotal >= 3000 ? 0 : 250, days: "5–14 дней", isPvz: false },
  ];

  const selectedDelivery = deliveryOptions.find((d) => d.id === delivery)!;
  const deliveryPriceKopecks = delivery === "pochta"
    ? (subtotal >= 3000 ? 0 : pochtaPoint?.deliveryPriceKopecks)
    : selectedDelivery.price * 100;
  const deliveryPrice = (deliveryPriceKopecks ?? 0) / 100;
  const formatPrice = (price: number) => price.toLocaleString("ru-RU", {
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const maxBonusPayment = Math.floor(subtotal * 0.3);
  const promoDiscountAmount = Math.round((subtotal * promoDiscount) / 100);
  const referralDiscountAmount = Math.round((subtotal * referralDiscount) / 100);
  const allowedBonusPayment = Math.min(bonusPointsToSpend, maxBonusPayment, user?.bonusPoints || 0);
  const finalTotal = Math.max(0, total - allowedBonusPayment) + deliveryPrice;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Введите имя";
    if (!form.surname.trim()) e.surname = "Введите фамилию";
    if (phoneDigits(form.phone) !== 11) e.phone = "Введите номер полностью: +7 и 10 цифр";
    if (!isValidEmail(form.email)) e.email = "Проверьте email — похоже, есть опечатка";
    if (delivery !== "pickup" && !form.city.trim()) e.city = "Введите город";
    if (selectedDelivery.isPvz && !form.address.trim()) e.address = "Введите адрес пункта выдачи";
    if (delivery === "pochta" && !form.address.trim()) e.address = "Выберите отделение Почты России на карте";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!agreeTerms) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const session = supabase ? await supabase.auth.getSession() : null;
      const response = await fetch("/api/ozon/create-order", {
        method: "POST",
        headers: { "content-type": "application/json", ...(session?.data.session?.access_token ? { authorization: `Bearer ${session.data.session.access_token}` } : {}) },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          customer: {
            name: form.name,
            surname: form.surname,
            phone: form.phone,
            email: form.email,
          },
          delivery: {
            method: delivery,
            city: delivery === "pickup" ? "Казань" : form.city,
            address: delivery === "pickup" ? "ул. Айдарова, 15" : form.address,
            zip: delivery === "pickup" ? "" : form.zip,
            ...(delivery === "pochta" && pochtaPoint ? {
              priceKopecks: deliveryPriceKopecks,
              pointId: pochtaPoint.id,
              deliveryDescription: pochtaPoint.deliveryDescription,
            } : {}),
          },
          promoCode,
          referralCode,
          bonusPointsToSpend: allowedBonusPayment,
          comment,
          userId: user?.id,
          agreementAccepted: true,
          marketingAccepted,
        }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.payLink !== "string") {
        throw new Error(data.error || "Не удалось открыть оплату");
      }
      window.location.assign(data.payLink);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Не удалось открыть оплату Ozon. Попробуйте ещё раз.");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
          <div className="text-center">
            <div className="text-7xl mb-6">🛒</div>
            <h1 className="text-2xl font-bold mb-4">Корзина пуста</h1>
            <Link href="/catalog" className="inline-block bg-[#E8845A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#d4703f] transition-all">
              В каталог →
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Функция-рендер (НЕ компонент) — чтобы поле не пересоздавалось при каждом нажатии
  // и курсор не слетал. Вызывается как {renderField({...})}, а не <Field/>.
  const renderField = ({ label, name, type = "text", placeholder }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-xs font-semibold text-[#6b6b6b] mb-1.5 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => { const val = name === "phone" ? formatPhone(e.target.value) : e.target.value; setForm((f) => ({ ...f, [name]: val })); setErrors((err) => ({ ...err, [name]: "" })); }}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${errors[name] ? "border-red-300 bg-red-50" : "border-[#f0e8e0] focus:border-[#E8845A]"}`}
      />
      {errors[name] && <p className="text-xs text-red-400 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfcfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <nav className="flex items-center gap-2 text-sm text-[#aaa] mb-4">
              <Link href="/" className="hover:text-[#E8845A]">Главная</Link>
              <span>/</span>
              <Link href="/cart" className="hover:text-[#E8845A]">Корзина</Link>
              <span>/</span>
              <span className="text-[#1a1a1a]">Оформление</span>
            </nav>
            <h1 className="text-3xl font-bold">Оформление заказа</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Форма — левая часть */}
            <div className="lg:col-span-2 space-y-6">

              {/* Контактные данные */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-[#E8845A] text-white text-xs font-bold flex items-center justify-center">1</div>
                  <h2 className="font-bold text-base">Контактные данные</h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {renderField({ label: "Имя", name: "name", placeholder: "Имя" })}
                  {renderField({ label: "Фамилия", name: "surname", placeholder: "Фамилия" })}
                  {renderField({ label: "Телефон", name: "phone", type: "tel", placeholder: "+7 (___) ___-__-__" })}
                  {renderField({ label: "Email", name: "email", type: "email", placeholder: "на него придёт чек и уведомление" })}
                </div>
              </div>

              {/* Доставка */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-[#E8845A] text-white text-xs font-bold flex items-center justify-center">2</div>
                  <h2 className="font-bold text-base flex items-center gap-2"><MapPin size={16} className="text-[#E8845A]" /> Способ доставки</h2>
                </div>
                <div className="space-y-3 mb-5">
                  {deliveryOptions.map((opt) => (
                    <label key={opt.id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${delivery === opt.id ? "border-[#E8845A] bg-[#fff8f5]" : "border-[#f0e8e0] hover:border-[#f5c9b0]"}`}>
                      <input type="radio" name="delivery" value={opt.id} checked={delivery === opt.id} onChange={() => setDelivery(opt.id)} className="mt-0.5 accent-[#E8845A]" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <span className={`text-sm font-bold ${opt.id === "pochta" ? (deliveryPriceKopecks === 0 ? "text-green-600" : "text-[#1a1a1a]") : (opt.price === 0 ? "text-green-600" : "text-[#1a1a1a]")}`}>
                            {opt.id === "pochta"
                              ? (deliveryPriceKopecks === undefined ? "По тарифу Почты" : deliveryPriceKopecks === 0 ? "Бесплатно" : `${formatPrice(deliveryPrice)} ₽`)
                              : (opt.price === 0 ? "Бесплатно" : `${opt.price} ₽`)}
                          </span>
                        </div>
                        <p className="text-xs text-[#aaa] mt-0.5">{opt.desc} · {opt.days}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {subtotal < 3000 && delivery !== "pickup" && (
                  <div className="bg-[#fff8f5] border border-[#f5d5c0] rounded-2xl p-4 mb-5 text-sm text-[#8b4513]">
                    🎁 До бесплатной доставки не хватает <strong>{(3000 - subtotal).toLocaleString("ru-RU")} ₽</strong>
                  </div>
                )}

                {delivery === "pickup" ? (
                  <div className="rounded-2xl border border-[#c8e6d4] bg-[#f0f8f4] p-4">
                    <p className="font-semibold text-[#1a7a4a]">Адрес самовывоза</p>
                    <p className="mt-1 text-sm text-[#1a1a1a]">г. Казань, ул. Айдарова, 15</p>
                    <p className="mt-2 text-xs text-[#6b6b6b]">Когда заказ будет готов, мы сообщим, что его можно забрать.</p>
                  </div>
                ) : delivery === "pochta" ? (
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Отделение Почты России</label>
                    {pochtaPoint ? (
                      <div className="flex items-start justify-between gap-3 bg-[#f0f8f4] border border-[#c8e6d4] rounded-2xl px-4 py-3">
                        <div className="text-sm">
                          <p className="font-semibold text-[#1a7a4a]">📍 {pochtaPoint.index && `${pochtaPoint.index}, `}{pochtaPoint.address}</p>
                          <p className="text-xs text-[#6b6b6b] mt-0.5">
                            {pochtaPoint.name} · {deliveryPriceKopecks === undefined ? "Стоимость уточняется" : deliveryPriceKopecks === 0 ? "Бесплатно" : `Доставка: ${formatPrice(deliveryPrice)} ₽`}
                            {pochtaPoint.deliveryDescription ? ` · ${pochtaPoint.deliveryDescription}` : ""}
                          </p>
                        </div>
                        <button type="button" onClick={() => setShowPochtaMap(true)} className="text-xs text-[#E8845A] font-semibold hover:underline whitespace-nowrap">
                          Изменить
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPochtaMap(true)}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed font-semibold text-sm transition-all ${
                          errors.address ? "border-red-300 text-red-400 bg-red-50" : "border-[#E8845A] text-[#E8845A] hover:bg-[#fff8f5]"
                        }`}
                      >
                        <MapPin size={16} /> Выбрать отделение на карте
                      </button>
                    )}
                    {errors.address && !pochtaPoint && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
                    <p className="text-xs text-[#aaa] mt-2">
                      {subtotal >= 3000
                        ? "Доставка бесплатна при заказе от 3 000 ₽."
                        : "Стоимость доставки будет рассчитана Почтой России при выборе отделения."}
                    </p>
                  </div>
                ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {renderField({ label: "Город", name: "city", placeholder: "Казань" })}
                  {renderField({ label: "Индекс (необязательно)", name: "zip", placeholder: "123456" })}
                  {selectedDelivery.isPvz && (
                    <div className="sm:col-span-2">
                      {renderField({ label: "Адрес пункта выдачи", name: "address", placeholder: "Например: ул. Ленина, 5 — ПВЗ на первом этаже" })}
                      <p className="text-xs text-[#aaa] mt-1">Найдите ближайший ПВЗ на сайте службы доставки и введите его адрес</p>
                    </div>
                  )}

                </div>
                )}
              </div>

              {/* Оплата */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-[#E8845A] text-white text-xs font-bold flex items-center justify-center">3</div>
                  <h2 className="font-bold text-base flex items-center gap-2"><CreditCard size={16} className="text-[#E8845A]" /> Способ оплаты</h2>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-2xl border-2 border-[#E8845A] bg-[#fff8f5]">
                  <span className="text-2xl" aria-hidden="true">🔒</span>
                  <div>
                    <p className="font-semibold text-sm">Безопасная оплата через Ozon Pay</p>
                    <p className="text-xs text-[#777] mt-1 leading-relaxed">
                      После нажатия кнопки откроется защищённая форма Ozon. В рабочем режиме там можно выбрать СБП, банковскую или Ozon Карту. В тестовом режиме доступна тестовая карта.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-[#aaa]">Принимаем к оплате:</span>
                  <PaymentLogos />
                </div>
              </div>

              {/* Комментарий */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#f0e8e0] text-[#6b6b6b] text-xs font-bold flex items-center justify-center">4</div>
                  <h2 className="font-bold text-base flex items-center gap-2"><MessageSquare size={16} className="text-[#aaa]" /> Комментарий к заказу</h2>
                  <span className="text-xs text-[#aaa]">необязательно</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Пожелания по доставке, уточнения к заказу..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] transition-colors resize-none"
                />
              </div>
            </div>

            {/* Правая часть — итог */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package size={18} className="text-[#E8845A]" />
                  Ваш заказ
                </h2>

                {/* Список товаров */}
                <div className="space-y-3 mb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-[#fdf8f5] rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={item.image || productImagePaths(item.id.replace(/-(\d+)g$/, ""), 1)[0]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(event) => { event.currentTarget.style.display = "none"; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-2 leading-snug">{item.name}</p>
                        <p className="text-xs text-[#aaa]">{item.quantity} шт.</p>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#f0e8e0] pt-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Товары</span>
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
                  {allowedBonusPayment > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-[#E8845A]">Бонусы</span><span className="text-[#E8845A] font-semibold">−{allowedBonusPayment.toLocaleString("ru-RU")} ₽</span></div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Доставка</span>
                    <span className={deliveryPriceKopecks === 0 ? "text-green-600 font-semibold" : ""}>
                      {delivery === "pochta" && deliveryPriceKopecks === undefined
                        ? "Выберите отделение"
                        : deliveryPriceKopecks === 0 ? "Бесплатно" : `${formatPrice(deliveryPrice)} ₽`}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#f0e8e0] pt-4 mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Итого</span>
                    <span className="font-bold text-2xl text-[#E8845A]">{finalTotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                {user ? (
                  <div className="mb-5 rounded-2xl bg-[#fff8f5] border border-[#f5d5c0] p-4">
                    <div className="flex justify-between gap-3 mb-2"><span className="text-sm font-semibold">Оплатить бонусами</span><span className="text-xs text-[#8b4513]">Доступно: {user.bonusPoints}</span></div>
                    <input type="number" min="0" max={Math.min(user.bonusPoints, maxBonusPayment)} value={bonusPointsToSpend || ""} onChange={(e) => setBonusPointsToSpend(Math.min(Math.max(0, Number(e.target.value || 0)), user.bonusPoints, maxBonusPayment))} placeholder="0" className="w-full bg-white px-3 py-2.5 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]" />
                    <p className="text-xs text-[#8b6b5d] mt-2">1 бонус = 1 ₽. Бонусами можно оплатить до 30% стоимости товаров.</p>
                  </div>
                ) : (
                  <p className="mb-5 text-xs text-[#8b6b5d] bg-[#fff8f5] rounded-xl p-3">Войдите в личный кабинет, чтобы оплатить часть заказа бонусами.</p>
                )}

                {/* Чекбоксы */}
                <div className="space-y-3 mb-5">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 w-4 h-4 accent-[#E8845A] cursor-pointer"
                    />
                    <span className="text-xs text-[#555] leading-relaxed">
                      Оформляя заказ, я принимаю{" "}
                      <a href="/oferta" target="_blank" className="underline text-[#E8845A] hover:text-[#d4703f]">Публичную оферту</a>,{" "}
                      <a href="/privacy" target="_blank" className="underline text-[#E8845A] hover:text-[#d4703f]">Политику конфиденциальности</a>{" "}
                      и даю{" "}
                      <a href="/soglasie" target="_blank" className="underline text-[#E8845A] hover:text-[#d4703f]">согласие на обработку персональных данных</a>{" "}
                      в целях выполнения заказа.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={marketingAccepted}
                      onChange={(e) => setMarketingAccepted(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 w-4 h-4 accent-[#E8845A] cursor-pointer"
                    />
                    <span className="text-xs text-[#555] leading-relaxed">
                      Я хочу получать акции, новинки и полезные материалы «взБАДрись» и даю{" "}
                      <a href="/soglasie-na-reklamnuyu-rassylku.html" target="_blank" rel="noreferrer" className="underline text-[#E8845A] hover:text-[#d4703f]">согласие на рекламную рассылку</a>. Отказаться можно в любое время.
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !agreeTerms || (delivery === "pochta" && !pochtaPoint)}
                  className={`w-full font-bold py-4 rounded-full text-white text-base transition-all flex items-center justify-center gap-2 ${
                    submitting || !agreeTerms || (delivery === "pochta" && !pochtaPoint)
                      ? "bg-[#f5c9b0] cursor-not-allowed"
                      : "bg-[#E8845A] hover:bg-[#d4703f] hover:-translate-y-0.5 hover:shadow-lg"
                  }`}
                >
                  {submitting ? (
                    <span className="animate-pulse">Оформляем...</span>
                  ) : (
                    <>Оплатить заказ {formatPrice(finalTotal)} ₽</>
                  )}
                </button>

                {submitError && (
                  <p role="alert" className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    {submitError}
                  </p>
                )}

                <p className="text-xs text-center text-[#aaa] mt-3">
                  Нажимая кнопку, вы подтверждаете ознакомление с условиями оферты и согласие на обработку персональных данных.
                </p>

                <div className="mt-4 space-y-1.5">
                  {["Безопасная оплата — Ozon Pay", "Электронный чек на email (54-ФЗ)", "Документы на все товары"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#6b6b6b]">
                      <Check size={12} className="text-[#E8845A] flex-shrink-0" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {showPochtaMap && (
        <PochtaWidget
          onSelect={(p) => {
            setPochtaPoint(p);
            setForm((f) => ({ ...f, city: p.city || f.city, address: p.address, zip: p.index || f.zip }));
            setErrors((e) => ({ ...e, address: undefined }));
            setShowPochtaMap(false);
          }}
          onClose={() => setShowPochtaMap(false)}
        />
      )}
    </>
  );
}
