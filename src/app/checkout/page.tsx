"use client";
import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useProductStore } from "@/store/productStore";
import PochtaWidget, { PochtaPoint } from "@/components/PochtaWidget";
import PaymentLogos from "@/components/PaymentLogos";
import { Check, MapPin, Package, CreditCard, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

type DeliveryMethod = "sdek_pvz" | "yandex_pvz" | "ozon_pvz" | "pochta";
type PaymentMethod = "card" | "sbp";

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
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const discountAmt = useCartStore((s) => s.discount());
  const total = useCartStore((s) => s.total());
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const clearCart = useCartStore((s) => s.clearCart);
  const { user, addOrder, addBonusToUser } = useAuthStore();
  const writeOffStock = useProductStore((s) => s.writeOffStock);
  const referrerId = useCartStore((s) => s.referrerId);
  const promoType = useCartStore((s) => s.promoType);

  const [delivery, setDelivery] = useState<DeliveryMethod>("sdek_pvz");
  const [payment, setPayment] = useState<PaymentMethod>("sbp");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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
  const [showPochtaMap, setShowPochtaMap] = useState(false);
  const [pochtaPoint, setPochtaPoint] = useState<PochtaPoint | null>(null);

  const deliveryOptions: { id: DeliveryMethod; label: string; desc: string; price: number; days: string; isPvz: boolean }[] = [
    { id: "sdek_pvz", label: "СДЭК — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ СДЭК", price: subtotal >= 3000 ? 0 : 300, days: "2–5 дней", isPvz: true },
    { id: "yandex_pvz", label: "Яндекс — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ Яндекс", price: subtotal >= 3000 ? 0 : 300, days: "3–6 дней", isPvz: true },
    { id: "ozon_pvz", label: "Ozon — Пункт выдачи", desc: "Укажите адрес удобного ПВЗ Ozon", price: subtotal >= 3000 ? 0 : 250, days: "3–7 дней", isPvz: true },
    { id: "pochta", label: "Почта России", desc: "В любой населённый пункт России", price: subtotal >= 3000 ? 0 : 250, days: "5–14 дней", isPvz: false },
  ];

  const selectedDelivery = deliveryOptions.find((d) => d.id === delivery)!;
  const finalTotal = total + selectedDelivery.price;

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "Введите имя";
    if (!form.surname.trim()) e.surname = "Введите фамилию";
    if (phoneDigits(form.phone) !== 11) e.phone = "Введите номер полностью: +7 и 10 цифр";
    if (!isValidEmail(form.email)) e.email = "Проверьте email — похоже, есть опечатка";
    if (!form.city.trim()) e.city = "Введите город";
    if (selectedDelivery.isPvz && !form.address.trim()) e.address = "Введите адрес пункта выдачи";
    if (delivery === "pochta" && !form.address.trim()) e.address = "Выберите отделение Почты России на карте";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));

    // Если пользователь авторизован — сохраняем заказ в историю
    if (user) {
      const deliveryLabels: Record<string, string> = {
        sdek_pvz: "СДЭК — ПВЗ",
        yandex_pvz: "Яндекс — ПВЗ",
        ozon_pvz: "Ozon — ПВЗ",
        pochta: "Почта России",
      };
      const paymentLabels: Record<string, string> = {
        card: "Банковская карта",
        sbp: "СБП",
      };
      addOrder({
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, category: i.category })),
        subtotal,
        discount: discountAmt,
        deliveryCost: selectedDelivery.price,
        total: finalTotal,
        promoCode: promoCode || undefined,
        deliveryMethod: deliveryLabels[delivery] || delivery,
        deliveryAddress: [form.city, form.address, form.zip].filter(Boolean).join(", "),
        paymentMethod: paymentLabels[payment] || payment,
        comment: comment || undefined,
      });
    }

    // Списываем остатки. Для семян id вида "base-100g" — списываем граммы (вес × кол-во упаковок).
    const decrements = items.map((item) => {
      const seedMatch = item.id.match(/^(.+)-(\d+)g$/);
      if (seedMatch) {
        return { id: seedMatch[1], amount: Number(seedMatch[2]) * item.quantity };
      }
      return { id: item.id, amount: item.quantity };
    });
    // Локально (на случай если база ещё не подключена)
    decrements.forEach((d) => writeOffStock(d.id, d.amount));
    // В базе данных (чтобы остаток обновился для всех)
    fetch("/api/decrement-stock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: decrements }),
    }).catch(() => {});

    // Если использован реферальный код — начисляем 100 бонусов рефереру
    if (promoType === "referral" && referrerId) {
      addBonusToUser(referrerId, 100);
    }

    clearCart();
    setSuccess(true);
    setSubmitting(false);
  };

  if (items.length === 0 && !success) {
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

  if (success) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={36} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Заказ оформлен!</h1>
            <p className="text-[#6b6b6b] mb-2">Спасибо, {form.name}! Мы получили ваш заказ.</p>
            <p className="text-[#6b6b6b] mb-8 text-sm">Подтверждение отправлено на <span className="font-semibold text-[#1a1a1a]">{form.email}</span></p>
            <div className="bg-[#fdf8f5] rounded-2xl p-5 mb-8 text-left">
              <p className="text-sm font-semibold mb-3">Что дальше:</p>
              <ul className="space-y-2">
                {[
                  "Ваш заказ принят и передан в сборку",
                  "После оплаты мы соберём и упакуем заказ",
                  "Как только заказ будет отправлен — сообщим вам и пришлём трек-номер для отслеживания",
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#555]">
                    <span className="text-[#E8845A] flex-shrink-0">{i + 1}.</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="inline-block bg-[#E8845A] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#d4703f] transition-all">
                На главную
              </Link>
              <Link href="/catalog" className="inline-block border border-[#E8845A] text-[#E8845A] font-semibold px-8 py-3.5 rounded-full hover:bg-[#E8845A] hover:text-white transition-all">
                Ещё покупки
              </Link>
            </div>
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
                          <span className={`text-sm font-bold ${opt.price === 0 ? "text-green-600" : "text-[#1a1a1a]"}`}>
                            {opt.price === 0 ? "Бесплатно" : (opt.id === "pochta" ? `от ${opt.price} ₽` : `${opt.price} ₽`)}
                          </span>
                        </div>
                        <p className="text-xs text-[#aaa] mt-0.5">{opt.desc} · {opt.days}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {subtotal < 3000 && (
                  <div className="bg-[#fff8f5] border border-[#f5d5c0] rounded-2xl p-4 mb-5 text-sm text-[#8b4513]">
                    🎁 До бесплатной доставки не хватает <strong>{(3000 - subtotal).toLocaleString("ru-RU")} ₽</strong>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {renderField({ label: "Город", name: "city", placeholder: "Казань" })}
                  {renderField({ label: "Индекс (необязательно)", name: "zip", placeholder: "123456" })}
                  {selectedDelivery.isPvz && (
                    <div className="sm:col-span-2">
                      {renderField({ label: "Адрес пункта выдачи", name: "address", placeholder: "Например: ул. Ленина, 5 — ПВЗ на первом этаже" })}
                      <p className="text-xs text-[#aaa] mt-1">Найдите ближайший ПВЗ на сайте службы доставки и введите его адрес</p>
                    </div>
                  )}

                  {/* Почта России — выбор отделения на карте */}
                  {delivery === "pochta" && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-[#1a1a1a] mb-1.5">Отделение Почты России</label>
                      {pochtaPoint ? (
                        <div className="flex items-start justify-between gap-3 bg-[#f0f8f4] border border-[#c8e6d4] rounded-2xl px-4 py-3">
                          <div className="text-sm">
                            <p className="font-semibold text-[#1a7a4a]">📍 {pochtaPoint.index && `${pochtaPoint.index}, `}{pochtaPoint.address}</p>
                            {pochtaPoint.name && <p className="text-xs text-[#6b6b6b] mt-0.5">{pochtaPoint.name}</p>}
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
                      {pochtaPoint?.raw && (
                        <details className="mt-2">
                          <summary className="text-xs text-[#aaa] cursor-pointer">Тех. данные для Почты России (JSON)</summary>
                          <pre className="mt-1 text-[10px] bg-[#f7f2ee] rounded-xl p-3 overflow-auto max-h-40 whitespace-pre-wrap break-all select-all">{pochtaPoint.raw}</pre>
                        </details>
                      )}
                      {errors.address && !pochtaPoint && <p className="text-xs text-red-400 mt-1">{errors.address}</p>}
                      <p className="text-xs text-[#aaa] mt-2">
                        {subtotal >= 3000
                          ? "Доставка Почтой России бесплатна при заказе от 3 000 ₽."
                          : "Стоимость доставки Почтой России зависит от адреса — точную сумму сообщим после оформления. Ориентировочно от 250 ₽."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Оплата */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-[#E8845A] text-white text-xs font-bold flex items-center justify-center">3</div>
                  <h2 className="font-bold text-base flex items-center gap-2"><CreditCard size={16} className="text-[#E8845A]" /> Способ оплаты</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { id: "sbp" as PaymentMethod, label: "СБП (быстрые платежи)", desc: "По QR-коду, без комиссии", icon: "📱" },
                    { id: "card" as PaymentMethod, label: "Банковская карта", desc: "Visa, Mastercard, Мир — через Ozon Pay", icon: "💳" },
                  ].map((opt) => (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${payment === opt.id ? "border-[#E8845A] bg-[#fff8f5]" : "border-[#f0e8e0] hover:border-[#f5c9b0]"}`}>
                      <input type="radio" name="payment" value={opt.id} checked={payment === opt.id} onChange={() => setPayment(opt.id)} className="accent-[#E8845A]" />
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{opt.label}</p>
                        <p className="text-xs text-[#aaa]">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
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
                      <div className="w-10 h-10 bg-[#fdf8f5] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        {item.category === "seeds" ? "🌱" : "💊"}
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
                  {discountAmt > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Промокод {promoCode} ({promoDiscount}%)</span>
                      <span className="text-green-600 font-semibold">−{discountAmt.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b6b6b]">Доставка</span>
                    <span className={selectedDelivery.price === 0 ? "text-green-600 font-semibold" : ""}>
                      {selectedDelivery.price === 0 ? "Бесплатно" : (delivery === "pochta" ? `от ${selectedDelivery.price} ₽` : `${selectedDelivery.price} ₽`)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#f0e8e0] pt-4 mb-6">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Итого</span>
                    <span className="font-bold text-2xl text-[#E8845A]">{finalTotal.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

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
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !agreeTerms}
                  className={`w-full font-bold py-4 rounded-full text-white text-base transition-all flex items-center justify-center gap-2 ${
                    submitting || !agreeTerms
                      ? "bg-[#f5c9b0] cursor-not-allowed"
                      : "bg-[#E8845A] hover:bg-[#d4703f] hover:-translate-y-0.5 hover:shadow-lg"
                  }`}
                >
                  {submitting ? (
                    <span className="animate-pulse">Оформляем...</span>
                  ) : (
                    <>Оплатить заказ {finalTotal.toLocaleString("ru-RU")} ₽</>
                  )}
                </button>

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
            setForm((f) => ({ ...f, address: p.address, zip: p.index || f.zip }));
            setErrors((e) => ({ ...e, address: undefined }));
            setShowPochtaMap(false);
          }}
          onClose={() => setShowPochtaMap(false)}
        />
      )}
    </>
  );
}
