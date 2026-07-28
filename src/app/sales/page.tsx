import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SaleProductGrids from "@/components/SaleProductGrids";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Акции и скидки — взБАДрись",
  description: "Актуальные акции и скидки на БАДы и семена. Промокод ВЗБАДРИСЬ10 даёт −10% на первый заказ.",
};

export default function SalesPage() {
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

          <SaleProductGrids />

          {/* Условия акций */}
          <section className="bg-[#fdf8f5] rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-5">Условия акций</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: "🎟️", title: "Промокод ВЗБАДРИСЬ10", desc: "Действует для новых покупателей. Одноразовый, применяется в корзине." },
                { icon: "📦", title: "Бесплатная доставка", desc: "При заказе от 3 000 ₽ доставка СДЭК в ПВЗ — бесплатно." },
                { icon: "🏷️", title: "Цены со скидкой", desc: "Скидки действуют до изменения ассортимента. Финальная цена — в карточке товара." },
                { icon: "💬", title: "Вопросы по акциям", desc: "Напишите нам в Telegram @vzbadris — ответим быстро." },
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
