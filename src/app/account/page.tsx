"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthStore, Order, STATUS_LABELS } from "@/store/authStore";
import { getProductById } from "@/lib/products";
import { productImagePaths } from "@/lib/productImages";
import { useCartStore } from "@/store/cartStore";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  User, Package, LogOut, Gift, Copy, Check, ChevronRight,
  Clock, Truck, CheckCircle, XCircle, RotateCcw, ShoppingBag,
  Heart, Camera, Eye, EyeOff, Save, MapPin, Pencil,
  Star,
} from "lucide-react";

type Tab = "orders" | "favorites" | "profile" | "bonuses" | "reviews";

const STATUS_COLORS: Record<Order["status"], string> = {
  processing: "bg-yellow-100 text-yellow-700",
  confirmed:  "bg-blue-100 text-blue-700",
  shipped:    "bg-purple-100 text-purple-700",
  delivered:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
};

const STATUS_ICONS: Record<Order["status"], React.ReactNode> = {
  processing: <RotateCcw size={13} />,
  confirmed:  <Check size={13} />,
  shipped:    <Truck size={13} />,
  delivered:  <CheckCircle size={13} />,
  cancelled:  <XCircle size={13} />,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default function AccountPage() {
  const router = useRouter();
  const { user, initialized, logout, getUserOrders, updateProfile, changePassword, toggleFavorite } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);

  const [tab, setTab] = useState<Tab>("orders");
  const [copiedReferralLink, setCopiedReferralLink] = useState(false);
  const [copiedReferralCode, setCopiedReferralCode] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loyalty, setLoyalty] = useState({ bonusPoints: 0, referralOrders: 0 });
  const [reviewForm, setReviewForm] = useState({ productId: "", orderId: "", productName: "", rating: 0, body: "", imageData: "" });
  const [reviewMessage, setReviewMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Профиль
  const [editMode, setEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "" });
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Пароль
  const [passForm, setPassForm] = useState({ current: "", next: "", confirm: "" });
  const [showPass, setShowPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mounted && initialized && !user) router.push("/auth?redirect=/account");
    if (user) {
      const timer = window.setTimeout(
        () => setProfileForm({ name: user.name, email: user.email, phone: user.phone }),
        0
      );
      return () => window.clearTimeout(timer);
    }
  }, [mounted, initialized, user, router]);

  useEffect(() => {
    if (!user || !supabase) return;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/account/loyalty", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setLoyalty({ bonusPoints: Number(payload.bonusPoints || 0), referralOrders: Number(payload.referralOrders || 0) });
    })();
  }, [user]);

  if (!mounted || !initialized || !user) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#E8845A] border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  const orders = getUserOrders();
  const favoriteProducts = user.favorites
    .map((id) => getProductById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getProductById>>[];

  const handleLogout = async () => { await logout(); router.push("/"); };

  const copyStoreLink = () => {
    // Латинский адрес надёжно распознаётся мессенджерами и не содержит скидочных кодов.
    navigator.clipboard.writeText("https://vzbadris.ru");
    setCopiedReferralLink(true);
    setTimeout(() => setCopiedReferralLink(false), 2000);
  };
  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopiedReferralCode(true);
    setTimeout(() => setCopiedReferralCode(false), 2000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ ok: false, text: "Файл слишком большой (макс. 5 МБ)" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      updateProfile({ avatar: result });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    if (!profileForm.name.trim()) { setProfileMsg({ ok: false, text: "Введите имя" }); return; }
    const res = await updateProfile(profileForm);
    setProfileMsg({ ok: res.ok, text: res.ok ? "Данные сохранены" : (res.error || "Ошибка") });
    if (res.ok) setEditMode(false);
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handlePasswordChange = async () => {
    if (!passForm.current || !passForm.next) { setPassMsg({ ok: false, text: "Заполните все поля" }); return; }
    if (passForm.next !== passForm.confirm) { setPassMsg({ ok: false, text: "Новые пароли не совпадают" }); return; }
    const res = await changePassword(passForm.current, passForm.next);
    setPassMsg({ ok: res.ok, text: res.ok ? "Пароль изменён" : (res.error || "Ошибка") });
    if (res.ok) setPassForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPassMsg(null), 3000);
  };

  const submitReview = async () => {
    if (!reviewForm.productId || reviewForm.rating < 1 || reviewForm.body.trim().length < 3) {
      setReviewMessage({ ok: false, text: "Поставьте оценку и напишите хотя бы несколько слов" }); return;
    }
    if (!supabase) return;
    setReviewSubmitting(true); setReviewMessage(null);
    const { data } = await supabase.auth.getSession();
    const response = await fetch(`/api/products/${reviewForm.productId}/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify({ rating: reviewForm.rating, body: reviewForm.body, imageData: reviewForm.imageData || undefined }),
    });
    const payload = await response.json().catch(() => ({}));
    setReviewSubmitting(false);
    if (!response.ok) { setReviewMessage({ ok: false, text: payload.error || "Не удалось отправить отзыв" }); return; }
    setReviewMessage({ ok: true, text: "Спасибо! Отзыв опубликован, вам начислено 20 бонусов." });
    setReviewForm({ productId: "", orderId: "", productName: "", rating: 0, body: "", imageData: "" });
    const responseLoyalty = await fetch("/api/account/loyalty", { headers: { authorization: `Bearer ${data.session?.access_token}` } });
    const loyaltyData = await responseLoyalty.json().catch(() => ({}));
    if (responseLoyalty.ok) setLoyalty({ bonusPoints: Number(loyaltyData.bonusPoints || 0), referralOrders: Number(loyaltyData.referralOrders || 0) });
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "orders",    label: "Мои заказы",  icon: <Package size={16} />, count: orders.length },
    { key: "favorites", label: "Избранное",   icon: <Heart size={16} />,   count: favoriteProducts.length },
    { key: "profile",   label: "Профиль",     icon: <User size={16} /> },
    { key: "bonuses",   label: "Бонусы",      icon: <Gift size={16} /> },
    { key: "reviews",   label: "Отзывы",      icon: <Star size={16} /> },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#fdfcfb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* Шапка профиля */}
          <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Аватар */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#E8845A] to-[#FDDCCA] flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{user.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <button
                onClick={() => avatarRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#E8845A] rounded-full flex items-center justify-center shadow hover:bg-[#d4703f] transition-colors"
                title="Сменить фото"
              >
                <Camera size={12} className="text-white" />
              </button>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{user.name}</h1>
              <p className="text-sm text-[#6b6b6b]">{user.email}</p>
              <p className="text-sm text-[#aaa]">{user.phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-[#aaa]">Бонусные баллы</p>
                <p className="text-2xl font-bold text-[#E8845A]">{loyalty.bonusPoints}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-[#aaa] hover:text-red-400 transition-colors px-4 py-2 rounded-xl border border-[#f0e8e0] hover:border-red-200"
              >
                <LogOut size={15} /> Выйти
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Боковая навигация */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-2 sm:p-3 flex lg:block gap-1 overflow-x-auto">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                      tab === t.key ? "bg-[#E8845A] text-white" : "text-[#6b6b6b] hover:bg-[#fdf8f5] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                    {t.count !== undefined && t.count > 0 && (
                      <span className={`ml-auto text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${tab === t.key ? "bg-white/20 text-white" : "bg-[#FDDCCA] text-[#8b4513]"}`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Основное содержимое */}
            <div className="lg:col-span-3">

              {/* ── ЗАКАЗЫ ── */}
              {tab === "orders" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">История заказов</h2>
                  {orders.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#f0e8e0] p-12 text-center">
                      <ShoppingBag size={48} className="text-[#f0e8e0] mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">Заказов пока нет</p>
                      <p className="text-sm text-[#aaa] mb-6">Перейдите в каталог, чтобы сделать первый заказ</p>
                      <Link href="/catalog" className="inline-flex items-center gap-2 bg-[#E8845A] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d4703f] transition-all">
                        В каталог →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
                          <button
                            className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-5 text-left hover:bg-[#fdfcfb] transition-colors"
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <span className="font-bold text-base">#{order.id}</span>
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                                  {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                                </span>
                                {order.trackNumber && (
                                  <span className="text-xs text-[#aaa] flex items-center gap-1"><Truck size={11} /> {order.trackNumber}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#aaa]">
                                <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(order.date)}</span>
                                <span>{order.items.reduce((s, i) => s + i.quantity, 0)} товара</span>
                                <span className="flex items-center gap-1"><MapPin size={11} /> {order.deliveryMethod}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3" aria-label="Товары в заказе">
                                {order.items.slice(0, 5).map((item, index) => {
                                  const productId = item.id.replace(/-(\d+)g$/, "");
                                  return <div key={`${item.id}-${index}`} className="relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl border border-[#f0e8e0] bg-[#fdf8f5] overflow-hidden flex items-center justify-center">
                                    <img src={productImagePaths(productId, 1)[0]} alt={item.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                                  </div>;
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0">
                              <span className="font-bold text-lg text-[#E8845A]">{order.total.toLocaleString("ru-RU")} ₽</span>
                              <ChevronRight size={18} className={`text-[#aaa] transition-transform ${expandedOrder === order.id ? "rotate-90" : ""}`} />
                            </div>
                          </button>

                          {expandedOrder === order.id && (
                            <div className="border-t border-[#f0e8e0] p-5">
                              <div className="space-y-3 mb-5">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#fdf8f5] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                                      {item.category === "seeds" ? "🌱" : "💊"}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{item.name}</p>
                                      <p className="text-xs text-[#aaa]">{item.quantity} шт. × {item.price.toLocaleString("ru-RU")} ₽</p>
                                    </div>
                                    <p className="text-sm font-bold">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</p>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-[#fdf8f5] rounded-2xl p-4 text-sm space-y-2">
                                <div className="flex justify-between"><span className="text-[#6b6b6b]">Товары</span><span>{order.subtotal.toLocaleString("ru-RU")} ₽</span></div>
                                {order.discount > 0 && <div className="flex justify-between"><span className="text-green-600">Скидка {order.promoCode && `(${order.promoCode})`}</span><span className="text-green-600">−{order.discount.toLocaleString("ru-RU")} ₽</span></div>}
                                <div className="flex justify-between"><span className="text-[#6b6b6b]">Доставка</span><span>{order.deliveryCost === 0 ? "Бесплатно" : `${order.deliveryCost} ₽`}</span></div>
                                <div className="flex justify-between font-bold border-t border-[#f0e8e0] pt-2"><span>Итого</span><span className="text-[#E8845A]">{order.total.toLocaleString("ru-RU")} ₽</span></div>
                              </div>
                              <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
                                <div><p className="text-xs text-[#aaa] mb-1 uppercase tracking-wide">Доставка</p><p className="font-medium">{order.deliveryMethod}</p><p className="text-[#6b6b6b]">{order.deliveryAddress}</p></div>
                                <div><p className="text-xs text-[#aaa] mb-1 uppercase tracking-wide">Оплата</p><p className="font-medium">{order.paymentMethod}</p></div>
                              </div>
                              {order.comment && <div className="mt-4 text-sm"><p className="text-xs text-[#aaa] mb-1 uppercase tracking-wide">Комментарий</p><p className="text-[#555] italic">«{order.comment}»</p></div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ОТЗЫВЫ ── */}
              {tab === "reviews" && (
                <div>
                  <h2 className="text-xl font-bold mb-2">Отзывы</h2>
                  <p className="text-sm text-[#6b6b6b] mb-5">Оставьте отзыв о купленном товаре — за него начислим 20 бонусов. Фото можно добавить по желанию.</p>
                  {reviewMessage && <div className={`mb-5 rounded-2xl px-4 py-3 text-sm ${reviewMessage.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{reviewMessage.text}</div>}
                  <div className="space-y-4">
                    {orders.filter((order) => order.paymentStatus === "paid").flatMap((order) => order.items.map((item) => ({ order, item }))).map(({ order, item }) => {
                      const productId = item.id.replace(/-(\d+)g$/, "");
                      const editing = reviewForm.productId === productId;
                      return <div key={`${order.id}-${item.id}`} className="bg-white rounded-3xl border border-[#f0e8e0] p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#fdf8f5]"><img src={productImagePaths(productId, 1)[0]} alt="" className="w-full h-full object-cover" /></div>
                          <div className="flex-1"><p className="font-semibold text-sm">{item.name}</p><p className="text-xs text-[#aaa] mt-1">Заказ #{order.id} · {formatDate(order.date)}</p></div>
                          {!editing && <button onClick={() => { setReviewMessage(null); setReviewForm({ productId, orderId: order.id, productName: item.name, rating: 0, body: "", imageData: "" }); }} className="px-4 py-2.5 rounded-xl bg-[#E8845A] text-white text-sm font-semibold">Оставить отзыв</button>}
                        </div>
                        {editing && <div className="mt-5 pt-5 border-t border-[#f0e8e0]"><p className="text-sm font-semibold mb-3">Ваша оценка</p><div className="flex gap-1 mb-4">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => setReviewForm((form) => ({ ...form, rating: star }))} aria-label={`${star} из 5`}><Star size={30} className={star <= reviewForm.rating ? "fill-[#E8845A] text-[#E8845A]" : "text-[#d9d2cd]"} /></button>)}</div><textarea value={reviewForm.body} onChange={(event) => setReviewForm((form) => ({ ...form, body: event.target.value }))} rows={4} placeholder="Расскажите, как вам товар" className="w-full rounded-2xl border border-[#f0e8e0] px-4 py-3 text-sm outline-none focus:border-[#E8845A]" /><label className="mt-3 inline-flex items-center gap-2 text-sm text-[#6b6b6b] cursor-pointer"><Camera size={16} className="text-[#E8845A]" /> Добавить фото (необязательно)<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setReviewMessage({ ok: false, text: "Фото должно быть не больше 5 МБ" }); return; } const reader = new FileReader(); reader.onload = () => setReviewForm((form) => ({ ...form, imageData: String(reader.result || "") })); reader.readAsDataURL(file); }} /></label>{reviewForm.imageData && <p className="text-xs text-green-600 mt-2">Фото прикреплено</p>}<div className="flex gap-3 mt-4"><button onClick={() => void submitReview()} disabled={reviewSubmitting} className="px-5 py-3 rounded-xl bg-[#E8845A] text-white font-semibold text-sm disabled:opacity-60">{reviewSubmitting ? "Отправляем…" : "Опубликовать отзыв"}</button><button onClick={() => setReviewForm({ productId: "", orderId: "", productName: "", rating: 0, body: "", imageData: "" })} className="px-5 py-3 rounded-xl border border-[#f0e8e0] text-sm">Отмена</button></div></div>}
                      </div>;
                    })}
                    {!orders.some((order) => order.paymentStatus === "paid" && order.items.length > 0) && <div className="bg-white rounded-3xl border border-[#f0e8e0] p-10 text-center"><Star size={42} className="mx-auto text-[#f0e8e0] mb-3" /><p className="font-semibold">Пока нет товаров для отзыва</p><p className="text-sm text-[#aaa] mt-2">После оплаченного заказа здесь появится возможность поделиться впечатлением.</p></div>}
                  </div>
                </div>
              )}

              {/* ── ИЗБРАННОЕ ── */}
              {tab === "favorites" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Избранное</h2>
                  {favoriteProducts.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-[#f0e8e0] p-12 text-center">
                      <Heart size={48} className="text-[#f0e8e0] mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-2">Список пуст</p>
                      <p className="text-sm text-[#aaa] mb-6">Нажмите ❤️ на карточке товара, чтобы добавить в избранное</p>
                      <Link href="/catalog" className="inline-flex items-center gap-2 bg-[#E8845A] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d4703f] transition-all">
                        В каталог →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {favoriteProducts.map((product) => (
                        <div key={product.id} className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden flex">
                          <Link href={`/product/${product.id}`} className="relative w-24 h-24 bg-[#fdf8f5] flex items-center justify-center flex-shrink-0 hover:scale-105 transition-transform m-3 rounded-2xl overflow-hidden">
                            <img src={productImagePaths(product.id, 1)[0]} alt={product.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                          </Link>
                          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                            <div>
                              <Link href={`/product/${product.id}`} className="font-semibold text-sm hover:text-[#E8845A] transition-colors line-clamp-2 leading-snug">
                                {product.name}
                              </Link>
                              <p className="text-xs text-[#aaa] mt-0.5">{product.weight}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-[#E8845A]">{product.price.toLocaleString("ru-RU")} ₽</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => addItem({ id: product.id, name: product.name, price: product.price, category: product.category, unit: product.weight })}
                                  className="text-xs bg-[#E8845A] hover:bg-[#d4703f] text-white px-3 py-1.5 rounded-full font-semibold transition-colors"
                                >
                                  В корзину
                                </button>
                                <button
                                  onClick={() => toggleFavorite(product.id)}
                                  className="p-1.5 rounded-full text-[#E8845A] hover:bg-[#fdf8f5] transition-colors"
                                  title="Убрать из избранного"
                                >
                                  <Heart size={15} className="fill-[#E8845A]" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── ПРОФИЛЬ ── */}
              {tab === "profile" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold">Мои данные</h2>
                    {!editMode && (
                      <button onClick={() => setEditMode(true)} className="flex items-center gap-2 text-sm font-semibold text-[#E8845A] hover:underline">
                        <Pencil size={14} /> Редактировать
                      </button>
                    )}
                  </div>

                  {/* Фото профиля */}
                  <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                    <p className="text-sm font-semibold text-[#6b6b6b] uppercase tracking-wide mb-4">Фото профиля</p>
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#E8845A] to-[#FDDCCA] flex items-center justify-center flex-shrink-0">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold text-3xl">{user.name.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => avatarRef.current?.click()}
                          className="flex items-center gap-2 text-sm font-semibold text-white bg-[#E8845A] hover:bg-[#d4703f] px-4 py-2 rounded-full transition-all mb-2"
                        >
                          <Camera size={15} /> Загрузить фото
                        </button>
                        <p className="text-xs text-[#aaa]">JPG, PNG или WebP, до 5 МБ</p>
                        {user.avatar && (
                          <button onClick={() => updateProfile({ avatar: "" })} className="text-xs text-red-400 hover:underline mt-1 block">
                            Удалить фото
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Основные данные */}
                  <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                    <p className="text-sm font-semibold text-[#6b6b6b] uppercase tracking-wide mb-4">Личные данные</p>
                    {profileMsg && (
                      <div className={`mb-4 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 ${profileMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {profileMsg.ok ? <Check size={15} /> : null} {profileMsg.text}
                      </div>
                    )}
                    {editMode ? (
                      <div className="space-y-4">
                        {[
                          { label: "Имя", key: "name" as const, type: "text", placeholder: "Ваше имя" },
                          { label: "Email", key: "email" as const, type: "email", placeholder: "email@mail.ru" },
                          { label: "Телефон", key: "phone" as const, type: "tel", placeholder: "+7 (999) 000-00-00" },
                        ].map((f) => (
                          <div key={f.key}>
                            <label className="block text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-1.5">{f.label}</label>
                            <input
                              type={f.type}
                              value={profileForm[f.key]}
                              onChange={(e) => setProfileForm((p) => ({ ...p, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="w-full px-4 py-3 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors"
                            />
                          </div>
                        ))}
                        <div className="flex gap-3 pt-1">
                          <button onClick={handleProfileSave} className="flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-6 py-2.5 rounded-full transition-all">
                            <Save size={15} /> Сохранить
                          </button>
                          <button onClick={() => { setEditMode(false); setProfileForm({ name: user.name, email: user.email, phone: user.phone }); }} className="px-6 py-2.5 rounded-full border border-[#f0e8e0] text-sm font-semibold hover:bg-[#fdf8f5] transition-colors">
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-5">
                        {[
                          { label: "Имя", value: user.name },
                          { label: "Email", value: user.email },
                          { label: "Телефон", value: user.phone },
                          { label: "Дата регистрации", value: formatDate(user.createdAt) },
                        ].map((f, i) => (
                          <div key={i}>
                            <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-1">{f.label}</p>
                            <p className="text-base font-medium">{f.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Смена пароля */}
                  <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                    <p className="text-sm font-semibold text-[#6b6b6b] uppercase tracking-wide mb-4">Сменить пароль</p>
                    {passMsg && (
                      <div className={`mb-4 rounded-2xl px-4 py-3 text-sm flex items-center gap-2 ${passMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {passMsg.ok ? <Check size={15} /> : null} {passMsg.text}
                      </div>
                    )}
                    <div className="space-y-3">
                      {[
                        { label: "Текущий пароль", key: "current" as const },
                        { label: "Новый пароль", key: "next" as const },
                        { label: "Повторите новый пароль", key: "confirm" as const },
                      ].map((f) => (
                        <div key={f.key} className="relative">
                          <label className="block text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-1.5">{f.label}</label>
                          <div className="relative">
                            <input
                              type={showPass ? "text" : "password"}
                              value={passForm[f.key]}
                              onChange={(e) => setPassForm((p) => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full pl-4 pr-10 py-3 border border-[#f0e8e0] rounded-2xl text-sm outline-none focus:border-[#E8845A] transition-colors"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa]">
                              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={handlePasswordChange} className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold px-6 py-2.5 rounded-full transition-all mt-1">
                        <Save size={15} /> Изменить пароль
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── БОНУСЫ ── */}
              {tab === "bonuses" && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Бонусная программа</h2>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-[#E8845A] to-[#d4703f] rounded-3xl p-7 text-white">
                      <p className="text-sm opacity-80 mb-1">Ваши бонусные баллы</p>
                      <p className="text-5xl font-black mb-1">{loyalty.bonusPoints}</p>
                      <p className="text-sm opacity-70">1 бонус = 1 рубль. Бонусами можно оплатить до 30% покупки.</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                      <h3 className="font-bold text-base mb-2 flex items-center gap-2"><Gift size={18} className="text-[#E8845A]" /> Пригласить подругу</h3>
                      <p className="text-sm text-[#6b6b6b] mb-4">Поделитесь ссылкой на магазин и кодом отдельно: подруге — скидка 5%, вам — 50 бонусов после её первого оплаченного заказа.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-[#fff8f5] border border-[#f5d5c0] rounded-2xl p-4">
                          <p className="text-xs font-semibold text-[#8b6b5d] uppercase tracking-wide">Ссылка на магазин</p>
                          <p className="mt-2 text-xs text-[#6b6b6b] truncate">vzbadris.ru</p>
                          <button onClick={copyStoreLink} className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${copiedReferralLink ? "bg-green-500 text-white" : "bg-[#E8845A] hover:bg-[#d4703f] text-white"}`}>
                            {copiedReferralLink ? <><Check size={15} /> Скопировано</> : <><Copy size={15} /> Копировать ссылку</>}
                          </button>
                        </div>
                        <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-4">
                          <p className="text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide">Ваш реферальный код</p>
                          <p className="mt-2 font-black text-xl tracking-widest text-[#E8845A] font-mono">{user.referralCode}</p>
                          <button onClick={copyReferralCode} className={`mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${copiedReferralCode ? "bg-green-500 text-white" : "border border-[#E8845A] text-[#E8845A] hover:bg-[#fff1e9]"}`}>
                            {copiedReferralCode ? <><Check size={15} /> Скопировано</> : <><Copy size={15} /> Копировать код</>}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-[#aaa] mt-3">Заказов с вашим кодом: {loyalty.referralOrders}</p>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                      <h3 className="font-bold text-base mb-4">Как зарабатывать баллы</h3>
                      <div className="space-y-3">
                        {[
                          { icon: "🛒", title: "1% с каждого заказа", desc: "Автоматически после подтверждения заказа" },
                          { icon: "👭", title: "50 бонусов за реферала", desc: "Когда друг делает первый оплаченный заказ по вашей ссылке" },
                          { icon: "⭐", title: "20 бонусов за отзыв", desc: "Фото можно добавить по желанию" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-4">
                            <span className="text-2xl">{item.icon}</span>
                            <div><p className="font-semibold text-sm">{item.title}</p><p className="text-xs text-[#6b6b6b]">{item.desc}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
