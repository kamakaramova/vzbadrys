import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Доставка и оплата — Взбадрись",
  description: "Доставка БАДов и семян по всей России. Быстрая доставка, удобная оплата, официальные документы на каждый товар.",
};

export default function DeliveryPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-3">Магазин</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Доставка и оплата</h1>
            <p className="text-[#6b6b6b] max-w-lg">Доставляем по всей России. Каждая посылка сопровождается документами на товар.</p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-2 gap-8">

            {/* Доставка */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Способы доставки</h2>
              <div className="space-y-4">
                {[
                  {
                    icon: "📍",
                    title: "Самовывоз в Казани",
                    time: "После готовности заказа",
                    price: "Бесплатно",
                    desc: "Заберите заказ по адресу: г. Казань, ул. Айдарова, 15. Мы сообщим, когда заказ будет готов к выдаче.",
                    badge: "0 ₽",
                    badgeColor: "bg-[#e7f5ec] text-[#1a7a4a]",
                  },
                  {
                    icon: "🟠",
                    title: "Ozon — Пункт выдачи",
                    time: "3–7 рабочих дней",
                    price: "от 250 ₽ · Бесплатно от 3 000 ₽",
                    desc: "Самый выгодный вариант. Пункты выдачи Ozon есть практически в каждом городе. Выберите удобный ПВЗ и заберите в любое время.",
                    badge: "Выгоднее всего",
                    badgeColor: "bg-[#FDDCCA] text-[#8b4513]",
                  },
                  {
                    icon: "📦",
                    title: "СДЭК — Пункт выдачи",
                    time: "2–5 рабочих дней",
                    price: "от 300 ₽ · Бесплатно от 3 000 ₽",
                    desc: "Широкая сеть пунктов выдачи по всей России. Укажите адрес удобного ПВЗ при оформлении заказа.",
                    badge: "Популярно",
                    badgeColor: "bg-[#FDDCCA] text-[#8b4513]",
                  },
                  {
                    icon: "⚡",
                    title: "Яндекс — Пункт выдачи",
                    time: "3–6 рабочих дней",
                    price: "от 300 ₽ · Бесплатно от 3 000 ₽",
                    desc: "Доставка в пункты выдачи Яндекса по всей России. Отправляем из Казани.",
                    badge: null,
                    badgeColor: "",
                  },
                  {
                    icon: "🚚",
                    title: "Почта России",
                    time: "5–14 рабочих дней",
                    price: "от 250 ₽ · Бесплатно от 3 000 ₽",
                    desc: "Доставка в любой населённый пункт России, включая отдалённые регионы.",
                    badge: null,
                    badgeColor: "",
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-[#f0e8e0] rounded-3xl p-6 relative">
                    {item.badge && (
                      <span className={`absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#fdf8f5] flex items-center justify-center text-2xl flex-shrink-0">{item.icon}</div>
                      <div>
                        <p className="font-bold text-base mb-1">{item.title}</p>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-[#6b6b6b]">🕐 {item.time}</span>
                          <span className="text-sm font-semibold text-[#E8845A]">{item.price}</span>
                        </div>
                        <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Бесплатная доставка */}
              <div className="mt-6 bg-gradient-to-r from-[#FDDCCA]/60 to-[#fdf8f5] rounded-3xl p-6 border border-[#f5d5c0]">
                <p className="text-2xl mb-2">🎁</p>
                <p className="font-bold text-base mb-1">Бесплатная доставка от 3 000 ₽</p>
                <p className="text-sm text-[#6b6b6b]">Самовывоз в Казани бесплатный при любой сумме заказа. При заказе от 3 000 ₽ доставка в пункты выдачи Ozon, СДЭК, Яндекс и Почтой России также бесплатна.</p>
              </div>
            </div>

            {/* Оплата */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Способы оплаты</h2>
              <div className="space-y-4">
                {[
                  {
                    icon: "💳",
                    title: "Банковская карта",
                    desc: "Visa, Mastercard, Мир. Оплата проходит через защищённый шлюз Ozon Pay. Данные карты не хранятся на нашем сервере.",
                    badge: "Безопасно",
                  },
                  {
                    icon: "📱",
                    title: "СБП (Система быстрых платежей)",
                    desc: "Оплата по QR-коду или ссылке. Деньги списываются мгновенно без комиссии.",
                  },
                  {
                    icon: "🏦",
                    title: "Электронные кошельки",
                    desc: "ЮMoney, Ozon Card и другие поддерживаемые кошельки через Ozon Pay.",
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-[#f0e8e0] rounded-3xl p-6 relative">
                    {item.badge && (
                      <span className="absolute top-4 right-4 text-xs font-semibold bg-[#e8f5ee] text-[#2d7a4f] px-3 py-1 rounded-full">{item.badge}</span>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#fdf8f5] flex items-center justify-center text-2xl flex-shrink-0">{item.icon}</div>
                      <div>
                        <p className="font-bold text-base mb-2">{item.title}</p>
                        <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Документы */}
              <div className="mt-6 bg-white border border-[#f0e8e0] rounded-3xl p-6">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">📄 Документы и чек</h3>
                <ul className="space-y-3">
                  {[
                    "Электронный чек отправляется на email после оплаты (54-ФЗ)",
                    "На каждый товар — декларация соответствия и сертификат качества",
                    "Накладная на отгрузку вкладывается в посылку",
                    "По запросу предоставляем документы для юридических лиц",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#555]">
                      <span className="text-[#E8845A] flex-shrink-0 mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Как проходит оплата */}
          <div className="mt-14">
            <h2 className="text-2xl font-bold mb-6">Как проходит оплата</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { n: "1", t: "Оформляете заказ", d: "Добавляете товары в корзину и заполняете данные для доставки." },
                { n: "2", t: "Переходите к оплате", d: "Нажимаете «Оплатить» — открывается защищённая платёжная страница Ozon Pay." },
                { n: "3", t: "Оплачиваете картой или СБП", d: "Вводите данные карты или сканируете QR-код. Платёж проходит через банк по протоколу 3-D Secure." },
                { n: "4", t: "Получаете подтверждение", d: "На email приходит электронный чек (54-ФЗ), а после отправки — трек-номер." },
              ].map((s, i) => (
                <div key={i} className="bg-white border border-[#f0e8e0] rounded-3xl p-6">
                  <div className="w-9 h-9 rounded-full bg-[#E8845A] text-white font-bold flex items-center justify-center mb-3">{s.n}</div>
                  <p className="font-bold text-sm mb-1.5">{s.t}</p>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Безопасность платежей */}
          <div className="mt-14">
            <h2 className="text-2xl font-bold mb-6">Безопасность платежей и защита от мошенничества</h2>
            <div className="bg-[#fdf8f5] border border-[#f0e8e0] rounded-3xl p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  "Приём платежей организован в партнёрстве с ООО «ОЗОН Банк» через сервис Ozon Pay.",
                  "Все платёжные страницы работают по защищённому протоколу HTTPS (SSL-шифрование).",
                  "Данные вашей карты вводятся на стороне банка и не хранятся на нашем сайте.",
                  "Каждая операция по карте проходит проверку по технологии 3-D Secure (подтверждение кодом из банка).",
                  "Расчёты соответствуют стандарту безопасности PCI DSS.",
                  "При подозрении на мошенническую операцию банк вправе запросить дополнительное подтверждение или отклонить платёж.",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[#555] leading-relaxed">
                    <span className="text-[#2d7a4f] flex-shrink-0 mt-0.5">🔒</span>
                    {t}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#aaa] mt-6">
                Если у вас возникли вопросы по оплате или вы заметили подозрительную операцию — напишите нам в Telegram
                <a href="https://t.me/vzbadris" className="text-[#E8845A] underline"> @vzbadris</a> или на
                <a href="mailto:vzbadris@yandex.ru" className="text-[#E8845A] underline"> vzbadris@yandex.ru</a>.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="mt-14">
            <h2 className="text-2xl font-bold mb-6">Частые вопросы</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { q: "Как отследить посылку?", a: "После отправки вы получите трек-номер на email. Отслеживание доступно на сайте выбранной службы доставки — Ozon, СДЭК, Яндекс или Почты России." },
                { q: "Можно ли вернуть товар?", a: "Да, в течение 14 дней с момента получения при условии сохранности упаковки и товарного вида. Исключение: вскрытые упаковки БАДов." },
                { q: "Что делать, если пришёл повреждённый товар?", a: "Сфотографируйте упаковку и напишите нам в течение 48 часов. Мы решим вопрос в кратчайшие сроки." },
                { q: "Можно ли забрать самовывозом?", a: "Пока самовывоз недоступен. Отправляем только курьерскими службами по всей России." },
              ].map((item, i) => (
                <div key={i} className="bg-[#fdf8f5] rounded-2xl p-5">
                  <p className="font-semibold text-sm mb-2">— {item.q}</p>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Контакты */}
          <div className="mt-10 bg-gradient-to-br from-[#FDDCCA]/40 to-[#fdf8f5] rounded-3xl p-8 text-center">
            <p className="text-2xl mb-3">💬</p>
            <h3 className="font-bold text-xl mb-2">Остались вопросы?</h3>
            <p className="text-[#6b6b6b] mb-5 text-sm max-w-md mx-auto">Напишите нам — ответим в течение нескольких часов в рабочее время.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://t.me/vzbadris"
                className="inline-flex items-center gap-2 bg-[#E8845A] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#d4703f] transition-all hover:-translate-y-0.5"
              >
                Написать в Telegram →
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
