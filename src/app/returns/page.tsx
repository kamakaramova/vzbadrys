import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Обмен и возврат — взБАДрись",
  description: "Условия возврата и обмена товаров в магазине взБАДрись. Что делать если пришёл повреждённый товар, как оформить возврат, сроки и способы.",
};

export default function ReturnsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-14">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center gap-2 text-sm text-[#aaa] mb-6">
              <Link href="/" className="hover:text-[#E8845A]">Главная</Link>
              <span>/</span>
              <span className="text-[#1a1a1a]">Обмен и возврат</span>
            </nav>
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-3">Помощь покупателям</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Обмен и возврат</h1>
            <p className="text-[#6b6b6b] max-w-xl leading-relaxed">
              Мы стараемся, чтобы каждая покупка была удачной. Здесь — честно и подробно о том, в каких ситуациях возможен возврат и что делать, если что-то пошло не так.
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">

          {/* Важное — БАДы по закону */}
          <div className="bg-[#fff8f5] border border-[#f5d5c0] rounded-3xl p-7 mb-10">
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">📋</span>
              <div>
                <h2 className="font-bold text-lg mb-2">Важно знать о возврате БАДов</h2>
                <p className="text-[#555] text-sm leading-relaxed mb-3">
                  БАДы и семена относятся к категории товаров, которые по закону <strong>не подлежат обмену и возврату надлежащего качества</strong> — на основании Постановления Правительства РФ № 55 от 19.01.1998 (ред. от 2021 г.), пункт «Товары для профилактики и лечения заболеваний в домашних условиях».
                </p>
                <p className="text-[#555] text-sm leading-relaxed">
                  Это значит: если товар качественный, целый, правильный — вернуть его просто потому, что «передумали», не получится. <strong>Но мы всегда идём навстречу</strong> в нестандартных ситуациях — читайте ниже.
                </p>
              </div>
            </div>
          </div>

          {/* Когда возврат возможен */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Когда возврат или замена возможны</h2>
            <div className="space-y-4">
              {[
                {
                  icon: "📦",
                  title: "Товар пришёл повреждённым",
                  desc: "Упаковка смята, вскрыта или повреждена при доставке. Сфотографируйте коробку и товар при получении (лучше сразу, не вскрывая) и напишите нам в течение 48 часов. Мы заменим товар или вернём деньги.",
                  tag: "Возврат / Замена",
                  tagColor: "bg-green-100 text-green-700",
                },
                {
                  icon: "❌",
                  title: "Прислали не тот товар",
                  desc: "В заказе оказался другой товар — не то название, не та граммовка. Напишите нам в течение 7 дней с фото. Мы отправим правильный товар за наш счёт или вернём деньги.",
                  tag: "Возврат / Замена",
                  tagColor: "bg-green-100 text-green-700",
                },
                {
                  icon: "⚠️",
                  title: "Товар с истёкшим сроком годности",
                  desc: "Такого не должно случиться — мы следим за сроками. Но если вдруг получили товар с истёкшим или подходящим к концу сроком (менее 30 дней), напишите нам с фото этикетки. Заменим или вернём деньги.",
                  tag: "Возврат / Замена",
                  tagColor: "bg-green-100 text-green-700",
                },
                {
                  icon: "🔍",
                  title: "Брак или несоответствие описанию",
                  desc: "Если состав или характеристики товара существенно отличаются от описанных на сайте — это основание для возврата. Опишите ситуацию и приложите фото.",
                  tag: "Рассматриваем индивидуально",
                  tagColor: "bg-blue-100 text-blue-700",
                },
                {
                  icon: "🚚",
                  title: "Заказ не прибыл в срок",
                  desc: "Если посылка значительно задержалась (более 30 дней с момента отправки) и трек не обновляется — напишите нам. Разберёмся с транспортной компанией и при необходимости повторно отправим заказ.",
                  tag: "Помогаем решить",
                  tagColor: "bg-yellow-100 text-yellow-700",
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-3xl border border-[#f0e8e0] p-6 flex items-start gap-5">
                  <span className="text-3xl flex-shrink-0">{item.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-base">{item.title}</h3>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${item.tagColor}`}>{item.tag}</span>
                    </div>
                    <p className="text-sm text-[#555] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Когда возврат невозможен */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Когда возврат невозможен</h2>
            <div className="bg-[#fdf8f5] rounded-3xl border border-[#f0e8e0] p-6">
              <ul className="space-y-4">
                {[
                  {
                    icon: "🔓",
                    text: "Упаковка вскрыта и товар надлежащего качества",
                    sub: "По санитарным нормам и закону вернуть вскрытые БАДы или семена нельзя.",
                  },
                  {
                    icon: "💭",
                    text: "Передумали, не понравился вкус или запах",
                    sub: "Это субъективные причины, которые не являются основанием для возврата по закону.",
                  },
                  {
                    icon: "⏰",
                    text: "Прошло более 14 дней с момента получения (для товаров надлежащего качества)",
                    sub: "Гражданский кодекс устанавливает 14-дневный срок для обращений по товарам надлежащего качества.",
                  },
                  {
                    icon: "📸",
                    text: "Нет фото или доказательств повреждения",
                    sub: "Для рассмотрения любой претензии нам нужны фото. Фотографируйте при получении.",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-[#1a1a1a]">{item.text}</p>
                      <p className="text-xs text-[#6b6b6b] mt-0.5 leading-relaxed">{item.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Как оформить возврат */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Как оформить возврат — пошагово</h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Сфотографируйте товар",
                  desc: "Сделайте фото упаковки (целой и с повреждениями), этикетки с датой, содержимого. Чем больше фото — тем быстрее решим.",
                },
                {
                  step: "2",
                  title: "Напишите нам в Telegram",
                  desc: "Напишите в @vzbadris или на почту, указав: номер заказа, причину обращения и приложите фото.",
                },
                {
                  step: "3",
                  title: "Ждите ответа в течение 1 рабочего дня",
                  desc: "Мы рассмотрим обращение и предложим решение: замену, повторную отправку или возврат денег.",
                },
                {
                  step: "4",
                  title: "Получите решение",
                  desc: "Деньги возвращаем на карту в течение 5–10 рабочих дней. Замену отправляем в течение 2 рабочих дней после согласования.",
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-full bg-[#E8845A] text-white font-bold text-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div className="bg-white rounded-2xl border border-[#f0e8e0] p-5 flex-1">
                    <p className="font-bold text-base mb-1">{item.title}</p>
                    <p className="text-sm text-[#555] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Возврат денег */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Сроки возврата денег</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "💳",
                  title: "Банковская карта",
                  desc: "5–10 рабочих дней после одобрения возврата. Срок зависит от вашего банка.",
                },
                {
                  icon: "📱",
                  title: "СБП",
                  desc: "1–3 рабочих дня. Возврат на тот же номер телефона, с которого была оплата.",
                },
                {
                  icon: "📄",
                  title: "Что нужно для возврата денег",
                  desc: "Номер заказа и реквизиты — больше ничего. Мы сделаем всё сами.",
                },
                {
                  icon: "✉️",
                  title: "Электронный чек",
                  desc: "После возврата денег вы получите уведомление и чек на email по 54-ФЗ.",
                },
              ].map((item, i) => (
                <div key={i} className="bg-[#fdf8f5] rounded-2xl p-5 flex items-start gap-4">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1">{item.title}</p>
                    <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Правовая база */}
          <section className="mb-12">
            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">⚖️ Правовая основа</h3>
              <ul className="space-y-3 text-sm text-[#555]">
                {[
                  "Закон РФ № 2300-1 «О защите прав потребителей» — право на возврат товара ненадлежащего качества, претензии в течение гарантийного срока.",
                  "Постановление Правительства РФ № 55 от 19.01.1998 — перечень товаров, не подлежащих обмену. БАДы включены в категорию «товары для профилактики и лечения».",
                  "Гражданский кодекс РФ, ст. 475–477 — права покупателя при обнаружении недостатков товара.",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-[#E8845A] flex-shrink-0 mt-0.5">→</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-gradient-to-br from-[#FDDCCA]/40 to-[#fdf8f5] rounded-3xl p-8 text-center">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="font-bold text-xl mb-2">Остались вопросы?</h3>
            <p className="text-[#6b6b6b] mb-6 text-sm max-w-md mx-auto">
              Напишите нам — разберёмся в любой ситуации. Мы работаем для того, чтобы вы были довольны каждой покупкой.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://t.me/vzbadris"
                className="inline-flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-6 py-3 rounded-full transition-all hover:-translate-y-0.5"
              >
                Написать в Telegram →
              </a>
              <Link
                href="/delivery"
                className="inline-flex items-center gap-2 border border-[#f0e8e0] text-[#6b6b6b] hover:text-[#E8845A] hover:border-[#E8845A] font-semibold px-6 py-3 rounded-full transition-all"
              >
                Доставка и оплата
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
}
