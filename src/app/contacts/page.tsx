import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Контакты — взБАДрись",
  description: "Контакты интернет-магазина взБАДрись. Напишите нам в Telegram, по email или телефону.",
};

export default function ContactsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-14">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-3">Связь с нами</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Контакты</h1>
            <p className="text-[#6b6b6b] max-w-lg">
              Напишите нам по любому вопросу — ответим быстро в рабочее время.
            </p>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-2 gap-8">

            {/* Левая колонка — способы связи */}
            <div className="space-y-5">
              <h2 className="text-xl font-bold mb-2">Способы связи</h2>

              {/* Telegram — основной */}
              <a
                href="https://t.me/vzbadris"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 bg-white border border-[#f0e8e0] rounded-3xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FDDCCA] flex items-center justify-center text-3xl flex-shrink-0">
                  ✈️
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">Telegram</p>
                  <p className="text-[#E8845A] text-sm font-semibold">@vzbadris</p>
                  <p className="text-xs text-[#aaa] mt-0.5">Отвечаем в течение нескольких часов</p>
                </div>
                <span className="text-[#aaa] group-hover:text-[#E8845A] transition-colors text-xl">→</span>
              </a>

              {/* Email */}
              <a
                href="mailto:vzbadris@yandex.ru"
                className="flex items-center gap-5 bg-white border border-[#f0e8e0] rounded-3xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FDDCCA] flex items-center justify-center text-3xl flex-shrink-0">
                  📧
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">Email</p>
                  <p className="text-[#E8845A] text-sm font-semibold">vzbadris@yandex.ru</p>
                  <p className="text-xs text-[#aaa] mt-0.5">Ответ в течение 1 рабочего дня</p>
                </div>
                <span className="text-[#aaa] group-hover:text-[#E8845A] transition-colors text-xl">→</span>
              </a>

              {/* Телефон */}
              <a
                href="tel:+79872970767"
                className="flex items-center gap-5 bg-white border border-[#f0e8e0] rounded-3xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FDDCCA] flex items-center justify-center text-3xl flex-shrink-0">
                  📞
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">Телефон</p>
                  <p className="text-[#E8845A] text-sm font-semibold">+7 987 297 07 67</p>
                  <p className="text-xs text-[#aaa] mt-0.5">Пн–Пт, 10:00–19:00 МСК</p>
                </div>
                <span className="text-[#aaa] group-hover:text-[#E8845A] transition-colors text-xl">→</span>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/vzbadris"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-5 bg-white border border-[#f0e8e0] rounded-3xl p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#FDDCCA] flex items-center justify-center text-3xl flex-shrink-0">
                  📸
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">Instagram*</p>
                  <p className="text-[#E8845A] text-sm font-semibold">@vzbadris</p>
                  <p className="text-xs text-[#aaa] mt-0.5">Контент о здоровье и питании</p>
                </div>
                <span className="text-[#aaa] group-hover:text-[#E8845A] transition-colors text-xl">→</span>
              </a>
            </div>

            {/* Правая колонка */}
            <div className="space-y-5">

              {/* Режим работы */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">🕐 Режим работы</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { day: "Понедельник — Пятница", time: "10:00 — 19:00 МСК" },
                    { day: "Суббота", time: "11:00 — 17:00 МСК" },
                    { day: "Воскресенье", time: "Выходной" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-[#f0e8e0] last:border-0 pb-2 last:pb-0">
                      <span className="text-[#6b6b6b]">{row.day}</span>
                      <span className={`font-semibold ${row.time === "Выходной" ? "text-[#aaa]" : "text-[#1a1a1a]"}`}>{row.time}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#aaa] mt-4">В Telegram отвечаем быстрее — можно писать в любое время, ответим при первой возможности.</p>
              </div>

              {/* По каким вопросам */}
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h3 className="font-bold text-base mb-4">По каким вопросам пишут нам</h3>
                <ul className="space-y-2.5">
                  {[
                    "Помощь с выбором товара",
                    "Статус заказа и трек-номер",
                    "Возврат или замена товара",
                    "Оплата и технические вопросы",
                    "Оптовые заказы",
                    "Сотрудничество и партнёрство",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#555]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8845A] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Юридическая информация */}
              <div className="bg-[#fdf8f5] rounded-3xl border border-[#f0e8e0] p-6">
                <h3 className="font-bold text-base mb-4">⚖️ Юридическая информация</h3>
                <div className="space-y-2 text-sm text-[#6b6b6b]">
                  {[
                    ["Наименование", "ИП Абдулкина Полина Валентиновна"],
                    ["ИНН", "166107199180"],
                    ["ОГРНИП", "326169000086855"],
                    ["Страна регистрации", "Россия"],
                    ["Юридический адрес", "РТ, г. Казань, ул. Айдарова, д. 15, кв. 96"],
                    ["Телефон", "+7 987 297 07 67"],
                  ].map(([label, value], i) => (
                    <div key={i} className={`flex justify-between gap-4 ${i > 0 ? "border-t border-[#f0e8e0] pt-2" : ""}`}>
                      <span className="flex-shrink-0">{label}</span>
                      <span className="text-[#1a1a1a] font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#aaa] mt-4">Полные реквизиты указаны в <a href="/oferta" target="_blank" className="underline hover:text-[#E8845A]">публичной оферте</a>.</p>
              </div>
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div className="mt-10 pt-10 border-t border-[#f0e8e0]">
            <p className="text-sm text-[#6b6b6b] mb-4 font-semibold">Полезные разделы</p>
            <div className="flex flex-wrap gap-3">
              {[
                { href: "/delivery", label: "Доставка и оплата" },
                { href: "/returns", label: "Возврат и обмен" },
                { href: "/oferta", label: "Публичная оферта" },
                { href: "/privacy", label: "Политика конфиденциальности" },
                { href: "/faq", label: "Частые вопросы" },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="px-4 py-2 bg-white border border-[#f0e8e0] rounded-full text-sm text-[#6b6b6b] hover:text-[#E8845A] hover:border-[#E8845A] transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
