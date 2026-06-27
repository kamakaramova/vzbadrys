import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Политика использования файлов cookie — Взбадрись",
  description: "Как интернет-магазин Взбадрись использует файлы cookie.",
};

export default function CookiePage() {
  const sections = [
    {
      title: "1. Что такое файлы cookie",
      text: "Файлы cookie — это небольшие текстовые файлы, которые сохраняются в браузере вашего устройства при посещении сайта. Они помогают сайту запоминать ваши действия и предпочтения (например, содержимое корзины, вход в личный кабинет) в течение определённого времени.",
    },
    {
      title: "2. Какие cookie мы используем",
      list: [
        "Технические (обязательные) — обеспечивают работу корзины, оформления заказа, авторизации в личном кабинете. Без них сайт не сможет работать корректно.",
        "Функциональные — запоминают ваши настройки и выбор, чтобы вам было удобнее.",
        "Аналитические — помогают нам понять, как посетители пользуются сайтом, чтобы улучшать его. Эти данные обезличены.",
      ],
    },
    {
      title: "3. Цели использования",
      list: [
        "Корректная работа корзины и оформления заказа",
        "Сохранение входа в личный кабинет",
        "Запоминание ваших предпочтений",
        "Анализ посещаемости и улучшение сайта",
      ],
    },
    {
      title: "4. Как управлять файлами cookie",
      text: "Вы можете в любой момент отключить или удалить файлы cookie в настройках вашего браузера. Обратите внимание: при отключении обязательных (технических) cookie некоторые функции сайта — корзина, оформление заказа, личный кабинет — могут работать некорректно.",
    },
    {
      title: "5. Согласие",
      text: "Продолжая использовать сайт после показа уведомления о cookie, вы соглашаетесь с использованием файлов cookie в соответствии с настоящей Политикой. Также рекомендуем ознакомиться с нашей Политикой конфиденциальности.",
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-14">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-3">Правовая информация</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Политика использования файлов cookie</h1>
            <p className="text-[#6b6b6b]">ИП Абдулкина Полина Валентиновна · интернет-магазин «Взбадрись»</p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
          {sections.map((s, i) => (
            <div key={i}>
              <h2 className="text-lg font-bold mb-3">{s.title}</h2>
              {s.text && <p className="text-[#555] leading-relaxed">{s.text}</p>}
              {s.list && (
                <ul className="space-y-2 mt-2">
                  {s.list.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-[#555] leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8845A] flex-shrink-0 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div className="bg-[#fdf8f5] rounded-2xl border border-[#f0e8e0] p-6 text-sm text-[#6b6b6b]">
            <p>По вопросам обработки данных пишите на <a href="mailto:vzbadris@yandex.ru" className="text-[#E8845A] underline">vzbadris@yandex.ru</a> или в Telegram <a href="https://t.me/kama_karamova" className="text-[#E8845A] underline">@kama_karamova</a>.</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
