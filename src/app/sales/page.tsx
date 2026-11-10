import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SaleProductGrids from "@/components/SaleProductGrids";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Акции и скидки — взБАДрись",
  description: "Актуальные акции и скидки на БАДы. Промокод ВЗБАДРИСЬ10 даёт −10% на первый заказ, доставка от 3 000 ₽ — бесплатно.",
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
            <p className="text-lg opacity-90 max-w-lg mx-auto">Промокоды, скидки на БАДы и бесплатная доставка — всё в одном месте.</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

          {/* Чёрная пятница */}
          <section className="mb-8 overflow-hidden rounded-3xl bg-[#151515] text-white relative">
            <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-[#ffd84d]/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[#E8845A]/20 blur-3xl pointer-events-none" />
            <div className="relative z-10 grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div>
                <span className="inline-flex rounded-full bg-[#ffd84d] px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#151515]">
                  11–15 ноября
                </span>
                <p className="mt-5 text-sm font-bold uppercase tracking-[0.25em] text-[#ffd84d]">Чёрная пятница</p>
                <h2 className="mt-2 text-3xl font-black leading-tight md:text-5xl">Три баночки за 1 499 ₽</h2>
                <p className="mt-4 max-w-2xl text-[#d4d4d4] leading-relaxed">
                  Селен + цинк, магний хелат и магний цитрат + B6. По отдельности — 2 484 ₽, ваша экономия — 985 ₽.
                </p>
                <p className="mt-3 font-semibold text-white">На остальные товары — скидка 20% в дни акции.</p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="text-left md:text-right">
                  <p className="text-sm text-[#a3a3a3]">Срок акции</p>
                  <p className="text-lg font-bold">11–15 ноября · МСК</p>
                </div>
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center rounded-full bg-[#ffd84d] px-7 py-3.5 font-black text-[#151515] transition-transform hover:-translate-y-0.5"
                >
                  Посмотреть товары →
                </Link>
              </div>
            </div>
          </section>

          {/* Промокод */}
          <div className="mb-8">
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

          {/* Бесплатная доставка */}
          <section className="mb-14 overflow-hidden rounded-3xl border border-[#cfe1f7] bg-[#edf6ff] relative">
            <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#8fc5ff]/35 blur-3xl pointer-events-none" />
            <div className="relative z-10 grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
              <div className="flex items-start gap-5">
                <div className="hidden h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-[#2866a8] shadow-sm sm:flex">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5 12 3l8.25 4.5L12 12 3.75 7.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5V16.5L12 21l8.25-4.5V7.5M12 12v9" />
                  </svg>
                </div>
                <div>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#2866a8] shadow-sm">
                    Доставка за 0 ₽
                  </span>
                  <h2 className="mt-4 text-3xl font-black leading-tight text-[#17212c] md:text-4xl">Бесплатная доставка от 3 000 ₽</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-[#506070]">
                    Соберите заказ на сумму от 3 000 ₽, и мы бесплатно доставим его в пункт выдачи Ozon. Условие применится автоматически при оформлении.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 md:items-end">
                <div className="md:text-right">
                  <p className="text-sm font-semibold text-[#60758d]">Стоимость доставки</p>
                  <p className="text-4xl font-black text-[#2866a8]">0 ₽</p>
                </div>
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center rounded-full bg-[#2866a8] px-7 py-3.5 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2866a8] focus-visible:ring-offset-2"
                >
                  Собрать заказ →
                </Link>
              </div>
            </div>
          </section>

          <SaleProductGrids />

          {/* Условия акций */}
          <section className="bg-[#fdf8f5] rounded-3xl p-8">
            <h2 className="text-xl font-bold mb-5">Условия акций</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: "🎟️", title: "Промокод ВЗБАДРИСЬ10", desc: "Действует для новых покупателей. Одноразовый, применяется в корзине." },
                { icon: "🖤", title: "Чёрная пятница", desc: "С 11 по 15 ноября: три баночки за 1 499 ₽, на остальные товары — скидка 20%." },
                { icon: "📦", title: "Бесплатная доставка", desc: "При заказе от 3 000 ₽ доставка в пункт выдачи Ozon — бесплатно." },
                { icon: "🏷️", title: "Цены со скидкой", desc: "Финальная цена всегда указана в карточке товара и корзине." },
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
