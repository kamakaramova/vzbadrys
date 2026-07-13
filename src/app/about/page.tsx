import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О компании — Взбадрись",
  description: "Бренд «Взбадрись» создали Кама Карамова и Полина Абдулкина — два специалиста с биологическим образованием и опытом в научной лаборатории. Мы ездим на производство сами и проверяем каждый состав.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-4">О компании</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-5 leading-tight">
              Наука, документы и личная проверка каждого продукта
            </h1>
            <p className="text-[#6b6b6b] max-w-2xl mx-auto leading-relaxed">
              «Взбадрись» — это БАДы и суперфуды, к которым мы подходим как учёные.
              Мы не перепродаём то, что нашли у поставщика, — мы сами разбираем составы,
              ездим на производство и проверяем каждый документ.
            </p>
          </div>
        </section>

        {/* Кто мы */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8 items-center mb-12">
              <div className="flex justify-center md:justify-start">
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
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">Как всё начиналось</h2>
                <p className="text-[#6b6b6b] leading-relaxed mb-4">
                  Мы — Кама и Полина. Познакомились в научной лаборатории и обе по шесть лет
                  проработали с исследованиями, анализами и документами. У обеих —
                  биологическое образование и привычка перепроверять всё на цифрах и фактах.
                </p>
                <p className="text-[#6b6b6b] leading-relaxed">
                  Когда мы решили делать свой бренд, для нас было принципиально: не верить
                  на слово ни одному поставщику. Поэтому мы лично ездим на производства,
                  смотрим, как и из чего делают продукт, и проверяем каждую бумагу.
                </p>
              </div>
            </div>

            {/* Два человека */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">Кама Карамова</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDDCCA] text-[#8b4513]">Составы</span>
                </div>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">
                  Нутрициолог, практика более 5 лет. Научный бэкграунд — 6 лет в
                  эколого-биотехнологической лаборатории, диссертация по устойчивости к антибиотикам.
                  Отвечает за составы: подбирает действующие вещества, формы и дозировки,
                  следит за сочетаемостью компонентов внутри каждого БАД.
                </p>
              </div>
              <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">Полина Абдулкина</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDDCCA] text-[#8b4513]">Качество и документы</span>
                </div>
                <p className="text-sm text-[#6b6b6b] leading-relaxed">
                  Биологическое образование, 6 лет работы в лаборатории. Поднимала производство
                  с нуля, готовила лабораторию к аккредитации, большой опыт в сертификации.
                  Отвечает за качество: досконально проверяет все документы, сырьё и соответствие стандартам.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Производство */}
        <section className="py-16 bg-[#fdf8f5] border-y border-[#f0e8e0]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-4 text-center">Производство</p>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">Мы ездим на производство сами</h2>
            <p className="text-center text-[#6b6b6b] max-w-2xl mx-auto mb-10 leading-relaxed">
              Прежде чем добавить продукт в каталог, мы приезжаем на производство вживую:
              смотрим, в каких условиях его делают, из какого сырья, как контролируют качество.
              Только так можно быть уверенными в том, что потом окажется у вас дома.
            </p>

            {/* Галерея фото производства */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {[
                "Цех производства",
                "Контроль качества сырья",
                "Фасовка и упаковка",
                "Лаборатория контроля",
                "Проверка документов",
                "Готовая продукция",
              ].map((caption, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white border border-[#f0e8e0] flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                  <span className="text-3xl mb-2 opacity-40">📷</span>
                  <p className="text-xs text-[#aaa] leading-snug">{caption}</p>
                </div>
              ))}
            </div>

            {/* Что мы проверяем */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Чистый состав", desc: "Только нужные действующие вещества — без лишних добавок, красителей и балласта." },
                { title: "Сочетаемость компонентов", desc: "Формы и дозировки подобраны так, чтобы компоненты внутри БАД работали вместе." },
                { title: "Качественное сырьё", desc: "Проверяем происхождение и чистоту сырья прямо на производстве." },
                { title: "Сертификация", desc: "Свидетельства о госрегистрации и сертификаты — проверяем каждый документ." },
              ].map((card, i) => (
                <div key={i} className="bg-white border border-[#f0e8e0] rounded-2xl p-5">
                  <h3 className="font-semibold text-sm text-[#E8845A] mb-2">{card.title}</h3>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Контакты и блог */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Связь и мой блог</h2>
            <p className="text-center text-[#6b6b6b] max-w-xl mx-auto mb-10">
              Я веду блог о здоровье, питании и разборах анализов — заходите, там много пользы.
              А по любым вопросам всегда можно написать напрямую.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a href="https://t.me/vzbadris" target="_blank" rel="noopener noreferrer" className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="text-3xl mb-3">✈️</div>
                <p className="font-bold text-sm">Telegram</p>
                <p className="text-[#E8845A] text-sm font-semibold mt-0.5">@vzbadris</p>
              </a>
              <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">📸</div>
                <p className="font-bold text-sm">Instagram / блог</p>
                <p className="text-[#6b6b6b] text-sm mt-0.5">@vzbadris</p>
              </div>
              <a href="mailto:vzbadris@yandex.ru" className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="text-3xl mb-3">📧</div>
                <p className="font-bold text-sm">Email</p>
                <p className="text-[#E8845A] text-sm font-semibold mt-0.5">vzbadris@yandex.ru</p>
              </a>
              <a href="tel:+79872970767" className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-2xl p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="text-3xl mb-3">📞</div>
                <p className="font-bold text-sm">Телефон</p>
                <p className="text-[#E8845A] text-sm font-semibold mt-0.5">+7 987 297 07 67</p>
              </a>
            </div>

            <div className="text-center mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/blog" className="inline-block bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-8 py-3.5 rounded-full transition-all">
                Читать статьи о здоровье
              </Link>
              <Link href="/contacts" className="inline-block border border-[#E8845A] text-[#E8845A] hover:bg-[#E8845A] hover:text-white font-semibold px-8 py-3.5 rounded-full transition-all">
                Все контакты и реквизиты
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
