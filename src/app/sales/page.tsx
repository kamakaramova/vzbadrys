import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getProducts } from "@/lib/products";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Акции и скидки — Взбадрись",
  description: "Актуальные акции и скидки на БАДы и семена. Промокод ВЗБАДРИСЬ10 даёт −10% на первый заказ.",
};

export default function SalesPage() {
  const allProducts = getProducts();
  const saleProducts = allProducts.filter((p) => p.badge === "Скидка" || p.oldPrice);
  const hitProducts = allProducts.filter((p) => p.badge === "Хит");

  const discount = (price: number, old: number) => Math.round((1 - price / old) * 100);

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#E8845A] to-[#d4703f] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-4">Специальные предложения</p>
            <h1 className="text-4xl md:text-5xl font-black mb-4">Акции и скидки</h1>
            <p className="text-lg opacity-90 max-w-md mx-auto">Промокоды, скидки на хиты продаж и выгодные комплекты — всё в одном месте.</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

          {/* Промокод */}
          <div className="mb-14">
            <div className="bg-[#1a1a1a] rounded-3xl p-8 md:p-12 relative overflow-hidden">
              {/* Декоративные элементы */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#E8845A]/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-5 w-36 h-36 rounded-full bg-[#FDDCCA]/10 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-white">
                  <span className="inline-block text-xs font-semibold bg-[#E8845A]/20 text-[#f5a87e] px-3 py-1 rounded-full mb-4 uppercase tracking-widest">Промокод</span>
                  <h2 className="text-3xl md:text-4xl font-black mb-3">−10% на первый заказ</h2>
                  <p className="text-[#aaa] max-w-sm leading-relaxed">Для новых покупателей. Введите промокод при оформлении заказа и получите скидку 10%.</p>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5 mb-3">
                    <p className="text-white font-black text-2xl tracking-widest font-mono">ВЗБАДРИСЬ10</p>
                  </div>
                  <p className="text-[#aaa] text-xs">Нажмите, чтобы скопировать</p>
                </div>
              </div>
            </div>
          </div>

          {/* Товары со скидкой */}
          {saleProducts.length > 0 && (
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold">Скидки</h2>
                <span className="text-xs font-semibold bg-[#ffeee6] text-[#E8845A] px-3 py-1 rounded-full">{saleProducts.length} товара</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {saleProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`} className="group block bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="relative h-48 bg-gradient-to-br from-[#fdf8f5] to-[#FDDCCA]/30 flex items-center justify-center">
                      <span className="text-6xl">
                        {product.category === "seeds" ? "🌱" : "💊"}
                      </span>
                      {product.oldPrice && (
                        <span className="absolute top-3 left-3 bg-[#E8845A] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                          −{discount(product.price, product.oldPrice)}%
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-sm leading-snug mb-2 group-hover:text-[#E8845A] transition-colors line-clamp-2">{product.name}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-[#E8845A]">{product.price} ₽</span>
                        {product.oldPrice && (
                          <span className="text-sm text-[#aaa] line-through">{product.oldPrice} ₽</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Хиты продаж */}
          {hitProducts.length > 0 && (
            <section className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold">Хиты продаж</h2>
                <span className="text-xs font-semibold bg-[#fff3e0] text-[#e65100] px-3 py-1 rounded-full">🔥 Топ</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {hitProducts.map((product) => (
                  <Link key={product.id} href={`/product/${product.id}`} className="group block bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="relative h-48 bg-gradient-to-br from-[#fdf8f5] to-[#FDDCCA]/30 flex items-center justify-center">
                      <span className="text-6xl">
                        {product.category === "seeds" ? "🌱" : "💊"}
                      </span>
                      <span className="absolute top-3 left-3 bg-[#1a1a1a] text-white text-xs font-bold px-2.5 py-1 rounded-full">Хит</span>
                    </div>
                    <div className="p-4">
                      <p className="font-bold text-sm leading-snug mb-2 group-hover:text-[#E8845A] transition-colors line-clamp-2">{product.name}</p>
                      <span className="text-lg font-black text-[#E8845A]">{product.price} ₽</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Условия акций */}
          <section className="bg-[#fdf8f5] rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-5">Условия акций</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: "🎟️", title: "Промокод ВЗБАДРИСЬ10", desc: "Действует для новых покупателей. Одноразовый, применяется в корзине." },
                { icon: "📦", title: "Бесплатная доставка", desc: "При заказе от 5 000 ₽ доставка СДЭК в ПВЗ — бесплатно." },
                { icon: "🏷️", title: "Цены со скидкой", desc: "Скидки действуют до изменения ассортимента. Финальная цена — в карточке товара." },
                { icon: "💬", title: "Вопросы по акциям", desc: "Напишите нам в Telegram @kama_karamova — ответим быстро." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1">{item.title}</p>
                    <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
