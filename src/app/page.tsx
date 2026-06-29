import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import HeroSection from "@/components/HeroSection";
import { products } from "@/lib/products";
import { ArrowRight, Shield, Truck, FileCheck, Star } from "lucide-react";

export default function Home() {
  const featuredProducts = products.slice(0, 3);

  return (
    <>
      <Header />
      <main>
        <HeroSection />

        {/* ПРЕИМУЩЕСТВА */}
        <section className="py-14 border-b border-[#f0e8e0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: <FileCheck size={22} />, title: "Документы", desc: "Сертификаты на каждый товар" },
                { icon: <Shield size={22} />, title: "Честный состав", desc: "Только проверенные формы" },
                { icon: <Truck size={22} />, title: "Доставка", desc: "По всей России" },
                { icon: <Star size={22} />, title: "Эксперт", desc: "Куратор-нутрициолог" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center p-5 rounded-2xl bg-[#fdf8f5]">
                  <div className="w-11 h-11 rounded-full bg-[#FDDCCA] flex items-center justify-center text-[#E8845A] mb-3">
                    {item.icon}
                  </div>
                  <p className="font-semibold text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-[#6b6b6b]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* КАТЕГОРИИ */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Что вас интересует?</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/catalog?cat=bads" className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FDDCCA] to-[#f5b898] p-8 h-52 flex flex-col justify-between hover:shadow-xl transition-all hover:-translate-y-1">
                <div>
                  <p className="text-xs font-semibold text-[#c07040] uppercase tracking-widest mb-2">Для здоровья</p>
                  <h3 className="text-2xl font-bold text-[#1a1a1a]">БАДы</h3>
                  <p className="text-sm text-[#6b6b6b] mt-2">Магний, цинк, селен и другие</p>
                </div>
                <div className="flex items-center gap-2 text-[#E8845A] font-semibold text-sm">
                  Смотреть <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-20">💊</div>
              </Link>

              <Link href="/catalog?cat=seeds" className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#e8f5e9] to-[#c8e6c9] p-8 h-52 flex flex-col justify-between hover:shadow-xl transition-all hover:-translate-y-1">
                <div>
                  <p className="text-xs font-semibold text-[#388e3c] uppercase tracking-widest mb-2">Суперфуды</p>
                  <h3 className="text-2xl font-bold text-[#1a1a1a]">Семена</h3>
                  <p className="text-sm text-[#6b6b6b] mt-2">Кунжут, тыква, лён и другие</p>
                </div>
                <div className="flex items-center gap-2 text-[#388e3c] font-semibold text-sm">
                  Смотреть <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-20">🌱</div>
              </Link>
            </div>
          </div>
        </section>

        {/* ТОВАРЫ */}
        <section className="py-10 pb-20 bg-[#fdf8f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">Популярные товары</h2>
              <Link href="/catalog" className="text-sm font-semibold text-[#E8845A] hover:text-[#d4703f] flex items-center gap-1">
                Все товары <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* О КОМПАНИИ */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-4 text-center">О компании</p>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-5 max-w-3xl mx-auto leading-tight">
              Два учёных, которые перепроверяют каждый состав
            </h2>
            <p className="text-center text-[#6b6b6b] max-w-2xl mx-auto mb-14 leading-relaxed">
              Бренд «Взбадрись» создали две девушки с биологическим образованием — Кама и Полина.
              Мы познакомились в научной лаборатории и обе по шесть лет проработали с исследованиями,
              анализами и документами. Поэтому к продукту подходим как учёные: разбираем каждый состав,
              ездим на производства вживую и сами смотрим, как и из чего делают то, что потом окажется у вас дома.
            </p>

            <div className="grid md:grid-cols-2 gap-8 items-stretch mb-12">
              {/* Фото команды */}
              <div className="flex justify-center md:justify-end">
                <div className="relative">
                  <div className="w-full max-w-sm h-96 rounded-3xl overflow-hidden shadow-xl">
                    <img
                      src="/komanda-photo.jpg"
                      alt="Кама Карамова и Полина Абдулкина — основатели бренда Взбадрись"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  <div className="absolute -bottom-3 -right-3 bg-[#E8845A] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    Опыт в научной лаборатории
                  </div>
                </div>
              </div>

              {/* Два человека */}
              <div className="space-y-4">
                {/* Кама */}
                <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-base">Кама Карамова</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDDCCA] text-[#8b4513]">Составы</span>
                  </div>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">
                    Нутрициолог, практика более 5 лет. Научный бэкграунд — 6 лет в эколого-биотехнологической
                    лаборатории. Отвечает за составы: подбирает действующие вещества, формы и дозировки,
                    следит за сочетаемостью компонентов внутри каждого БАД.
                  </p>
                </div>
                {/* Полина */}
                <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-base">Полина Абдулкина</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDDCCA] text-[#8b4513]">Качество и документы</span>
                  </div>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">
                    Биологическое образование, 6 лет работы в лаборатории. Поднимала производство с нуля,
                    готовила лабораторию к аккредитации, большой опыт в сертификации. Отвечает за качество:
                    досконально проверяет все документы, сырьё и соответствие стандартам.
                  </p>
                </div>
              </div>
            </div>

            {/* Наш подход */}
            <p className="text-center text-sm font-semibold text-[#E8845A] uppercase tracking-widest mb-6">Как мы подходим к продукту</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  title: "Чистый состав",
                  desc: "Только нужные действующие вещества — без лишних добавок, красителей и балласта.",
                },
                {
                  title: "Сочетаемость компонентов",
                  desc: "Подбираем формы и дозировки так, чтобы компоненты внутри БАД работали вместе, а не мешали друг другу.",
                },
                {
                  title: "Ездим на производство сами",
                  desc: "Вживую смотрим, как и из чего производят, проверяем сырьё и условия — не верим на слово.",
                },
                {
                  title: "Документы на каждый товар",
                  desc: "Свидетельства о госрегистрации и сертификаты — проверяем каждую бумагу до того, как товар попадёт к вам.",
                },
              ].map((card, i) => (
                <div
                  key={i}
                  className="bg-white border border-[#f0e8e0] rounded-2xl p-5 hover:border-[#FDDCCA] hover:shadow-md transition-all"
                >
                  <h3 className="font-semibold text-sm text-[#E8845A] mb-2">{card.title}</h3>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ПРОМОКОД БАННЕР */}
        <section className="py-10 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#1a1a1a] rounded-3xl p-10 md:p-14 text-center text-white">
              <p className="text-[#E8845A] text-sm font-semibold uppercase tracking-widest mb-3">Первый заказ</p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Скидка 10% на первую покупку</h2>
              <p className="text-[#aaa] mb-6">Введите промокод при оформлении заказа</p>
              <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-6 py-3">
                <span className="font-mono font-bold text-xl tracking-widest text-[#FDDCCA]">ВЗБАДРИСЬ10</span>
              </div>
              <div className="mt-6">
                <Link href="/catalog" className="inline-flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-8 py-3.5 rounded-full transition-all">
                  Перейти в каталог <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
