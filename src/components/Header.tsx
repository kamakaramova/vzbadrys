"use client";
import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Search, User, Menu, X, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const { user } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const totalItems = useCartStore((s) => s.totalItems());
  const subtotal = useCartStore((s) => s.subtotal());
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#f0e8e0]">
      {/* Верхняя полоска */}
      <div className="bg-[#FDDCCA] py-2 px-4 text-center text-xs font-medium text-[#8b4513]">
        🌿 Бесплатная доставка от 5 000 ₽ · Документы на каждый товар
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Логотип */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#E8845A] flex items-center justify-center">
              <span className="text-white font-bold text-sm">В</span>
            </div>
            <span className="font-black text-xl tracking-tight text-[#1a1a1a]" style={{ fontFamily: "Montserrat, sans-serif" }}>
              вз<span style={{ background: "linear-gradient(135deg, #E8845A, #f5a87e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>БАД</span>рись
            </span>
          </Link>

          {/* Навигация десктоп */}
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/catalog?cat=bads" className="text-sm font-medium text-[#1a1a1a] hover:text-[#E8845A] transition-colors">БАДы</Link>
            <Link href="/catalog?cat=seeds" className="text-sm font-medium text-[#1a1a1a] hover:text-[#E8845A] transition-colors">Семена</Link>
            <Link href="/blog" className="text-sm font-medium text-[#1a1a1a] hover:text-[#E8845A] transition-colors">Статьи</Link>
            <Link href="/delivery" className="text-sm font-medium text-[#1a1a1a] hover:text-[#E8845A] transition-colors">Доставка</Link>
            <Link href="/sales" className="text-sm font-semibold text-[#E8845A] hover:text-[#d4703f] transition-colors">Акции 🔥</Link>
            <Link href="/about" className="text-sm font-medium text-[#1a1a1a] hover:text-[#E8845A] transition-colors">О компании</Link>
          </nav>

          {/* Иконки справа */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-2 rounded-full hover:bg-[#fdf8f5] transition-colors text-[#6b6b6b] hover:text-[#E8845A]">
              <Search size={20} />
            </button>
            <Link href={user ? "/account" : "/auth"} className="hidden md:flex items-center gap-2 p-2 rounded-full hover:bg-[#fdf8f5] transition-colors text-[#6b6b6b] hover:text-[#E8845A]">
              {user ? (
                <div className="w-7 h-7 rounded-full bg-[#E8845A] text-white text-xs font-bold flex items-center justify-center">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              ) : (
                <User size={20} />
              )}
            </Link>

            {/* Корзина с мини-дропдауном */}
            <div className="relative">
              <button
                onClick={() => setCartOpen(!cartOpen)}
                className="relative p-2 rounded-full hover:bg-[#fdf8f5] transition-colors text-[#6b6b6b] hover:text-[#E8845A]"
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#E8845A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </button>

              {/* Мини-корзина */}
              {cartOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCartOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-[#f0e8e0] z-50 overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                      <p className="font-bold text-base">Корзина</p>
                      <button onClick={() => setCartOpen(false)}><X size={18} className="text-[#aaa] hover:text-[#1a1a1a]" /></button>
                    </div>

                    {items.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className="text-4xl mb-3">🛒</p>
                        <p className="text-sm text-[#aaa]">Корзина пуста</p>
                        <Link href="/catalog" onClick={() => setCartOpen(false)} className="inline-block mt-4 text-sm font-semibold text-[#E8845A] hover:underline">Перейти в каталог →</Link>
                      </div>
                    ) : (
                      <>
                        <div className="max-h-72 overflow-y-auto">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 px-5 py-3 border-b border-[#f0e8e0] last:border-0">
                              <div className="w-12 h-12 rounded-xl bg-[#fdf8f5] flex items-center justify-center text-2xl flex-shrink-0">
                                {item.category === "seeds" ? "🌱" : "💊"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold line-clamp-2 leading-snug">{item.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-5 h-5 rounded-full bg-[#f0e8e0] text-xs flex items-center justify-center hover:bg-[#FDDCCA]">−</button>
                                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                  <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-5 h-5 rounded-full bg-[#f0e8e0] text-xs flex items-center justify-center hover:bg-[#FDDCCA]">+</button>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-[#E8845A]">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</p>
                                <button onClick={() => removeItem(item.id)} className="mt-1 text-[#aaa] hover:text-red-400">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-5 bg-[#fdf8f5]">
                          <div className="flex justify-between text-sm mb-4">
                            <span className="text-[#6b6b6b]">Итого</span>
                            <span className="font-bold text-base">{subtotal.toLocaleString("ru-RU")} ₽</span>
                          </div>
                          <Link
                            href="/cart"
                            onClick={() => setCartOpen(false)}
                            className="block w-full bg-[#E8845A] hover:bg-[#d4703f] text-white text-center font-semibold py-3 rounded-full transition-all"
                          >
                            Оформить заказ →
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <button className="md:hidden p-2 rounded-full hover:bg-[#fdf8f5] transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Поиск */}
        {searchOpen && (
          <div className="pb-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input
                autoFocus
                type="text"
                placeholder="Поиск товаров..."
                className="w-full pl-11 pr-4 py-3 bg-[#fdf8f5] rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] transition-colors"
              />
            </div>
          </div>
        )}
      </div>

      {/* Мобильное меню */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#f0e8e0] px-4 py-4 flex flex-col gap-3">
          <Link href="/catalog?cat=bads" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>БАДы</Link>
          <Link href="/catalog?cat=seeds" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Семена</Link>
          <Link href="/blog" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Статьи</Link>
          <Link href="/delivery" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Доставка</Link>
          <Link href="/returns" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Возврат</Link>
          <Link href="/contacts" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Контакты</Link>
          <Link href="/sales" className="py-2 text-sm font-medium text-[#E8845A]" onClick={() => setMobileOpen(false)}>Акции 🔥</Link>
          <Link href="/about" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>О компании</Link>
          <Link href="/cart" className="py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Корзина ({totalItems})</Link>
        </div>
      )}
    </header>
  );
}
