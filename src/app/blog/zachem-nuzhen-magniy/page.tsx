"use client";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";


export default function MagniyArticle() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Хлебные крошки */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <nav className="flex items-center gap-2 text-sm text-[#aaa]">
            <Link href="/" className="hover:text-[#E8845A]">Главная</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#E8845A]">Статьи</Link>
            <span>/</span>
            <span className="text-[#1a1a1a]">Зачем нужен магний</span>
          </nav>
        </div>

        {/* Шапка статьи */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-semibold bg-[#FDDCCA] text-[#8b4513] px-3 py-1 rounded-full">Магний</span>
            <span className="text-xs text-[#aaa]">27 июня 2025</span>
            <span className="text-xs text-[#aaa]">· 8 мин чтения</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-5">
            Зачем нужен магний: дефицит, симптомы и как восполнить
          </h1>
          <p className="text-lg text-[#6b6b6b] leading-relaxed mb-6">
            Магний — один из самых «расходуемых» минералов. Организм тратит его каждый раз, когда вы нервничаете, пьёте кофе или не высыпаетесь. И восполнить его сложнее, чем кажется.
          </p>
          <div className="flex items-center gap-3 p-4 bg-[#fdf8f5] rounded-2xl border border-[#f0e8e0]">
            <div className="w-10 h-10 rounded-full bg-[#FDDCCA] flex items-center justify-center text-lg">👩‍🔬</div>
            <div>
              <p className="text-sm font-semibold">Кама Карамова</p>
              <p className="text-xs text-[#aaa]">Нутрициолог, основатель бренда взБАДрись</p>
            </div>
          </div>
        </section>

        {/* Контент */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="prose-custom space-y-8" style={{ color: "#1a1a1a", lineHeight: 1.8, fontSize: "1.05rem" }}>

            {/* Блок-выделение */}
            <div className="bg-[#FDDCCA]/40 border-l-4 border-[#E8845A] rounded-r-2xl p-5">
              <p className="font-semibold text-[#1a1a1a] mb-1">Коротко о главном</p>
              <p className="text-[#555]">Магний участвует в более чем 300 биохимических реакциях. Это второй по важности внутриклеточный катион после калия. При этом большинство людей получают его недостаточно — просто потому что современный образ жизни буквально вымывает магний из организма.</p>
            </div>

            <section>
              <h2 className="text-2xl font-bold mb-4">Что делает магний в организме</h2>
              <p className="text-[#555] mb-4">Если коротко — почти всё. Вот ключевые функции:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { emoji: "⚡", title: "Энергия", desc: "Магний — кофактор в производстве АТФ, главной «валюты» клеточной энергии. Без него митохондрии работают вполсилы." },
                  { emoji: "🧠", title: "Нервная система", desc: "Регулирует передачу нервных импульсов, активирует ГАМК-рецепторы — тормозную систему мозга. Это напрямую влияет на тревожность и сон." },
                  { emoji: "💪", title: "Мышцы", desc: "Отвечает за расслабление мышц после сокращения. Без достаточного магния — судороги, спазмы, напряжение." },
                  { emoji: "❤️", title: "Сердце", desc: "Стабилизирует сердечный ритм, регулирует тонус сосудов и артериальное давление." },
                  { emoji: "🦴", title: "Кости", desc: "Участвует в формировании костной матрицы и регулирует усвоение кальция. Без магния кальций хуже «встаёт на место»." },
                  { emoji: "🔥", title: "Воспаление", desc: "Дефицит магния усиливает системное воспаление — один из ключевых факторов хронических заболеваний." },
                ].map((item, i) => (
                  <div key={i} className="bg-[#fdf8f5] rounded-2xl p-4">
                    <div className="text-2xl mb-2">{item.emoji}</div>
                    <p className="font-semibold text-sm mb-1">{item.title}</p>
                    <p className="text-sm text-[#6b6b6b] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Почему дефицит магния такой распространённый</h2>
              <p className="text-[#555] mb-4">Дело не только в питании. Магний расходуется усиленно в нескольких ситуациях:</p>
              <ul className="space-y-3">
                {[
                  "Хронический стресс — надпочечники требуют магний для синтеза кортизола",
                  "Кофе и алкоголь — ускоряют выведение магния с мочой",
                  "Интенсивные тренировки — магний теряется с потом",
                  "Приём некоторых лекарств (диуретики, ингибиторы протонной помпы, антибиотики)",
                  "Нарушения ЖКТ — при низкой кислотности и синдроме дырявого кишечника усвоение падает",
                  "Высокое потребление сахара и рафинированных углеводов",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#555]">
                    <span className="text-[#E8845A] mt-1 flex-shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4 p-4 bg-[#fff3ee] rounded-2xl border border-[#f5c9b0]">
                <p className="text-sm text-[#8b4513]">⚠️ Важно: стандартные анализы крови показывают только 1% от общего магния в организме (остальное — внутри клеток и в костях). Поэтому нормальный магний в крови не исключает внутриклеточного дефицита.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Симптомы дефицита магния</h2>
              <p className="text-[#555] mb-5">Эти сигналы часто списывают на стресс, усталость или «просто характер» — но за ними может стоять конкретный дефицит:</p>
              <div className="space-y-3">
                {[
                  { label: "Нервная система", items: ["Тревожность и раздражительность без видимой причины", "Трудно расслабиться вечером, мысли «не останавливаются»", "Депрессивный фон, апатия, потеря мотивации"] },
                  { label: "Сон", items: ["Долго засыпаете", "Поверхностный сон, частые пробуждения", "Просыпаетесь уже уставшими"] },
                  { label: "Мышцы", items: ["Ночные судороги в икрах", "Синдром беспокойных ног", "Напряжение в шее, плечах, спине, которое не проходит"] },
                  { label: "Сердце и сосуды", items: ["Учащённое сердцебиение в моменты стресса", "Повышенное давление", "Чувство «трепетания» в груди"] },
                ].map((group, i) => (
                  <div key={i} className="border border-[#f0e8e0] rounded-2xl overflow-hidden">
                    <div className="bg-[#fdf8f5] px-4 py-2.5">
                      <p className="font-semibold text-sm text-[#E8845A]">{group.label}</p>
                    </div>
                    <ul className="px-4 py-3 space-y-2">
                      {group.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-[#555]">
                          <span className="text-[#E8845A] flex-shrink-0 mt-0.5">—</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Какая форма магния лучше</h2>
              <p className="text-[#555] mb-5">Не все формы магния одинаково усваиваются. Вот сравнение основных:</p>
              <div className="overflow-x-auto rounded-2xl border border-[#f0e8e0]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#fdf8f5]">
                      <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Форма</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Усвоение</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#1a1a1a]">Особенности</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0e8e0]">
                    {[
                      ["Бисглицинат", "До 90% ✅", "Лучшая переносимость, нет слабительного эффекта, подходит при чувствительном ЖКТ. Глицин дополнительно успокаивает нервную систему."],
                      ["Цитрат", "До 90% ✅", "Хорошо изучен, быстро усваивается. Может давать мягкий послабляющий эффект — актуально при запорах."],
                      ["Малат", "Высокое ✅", "Хорошо при хронической усталости — яблочная кислота участвует в производстве энергии."],
                      ["Оксид", "До 4% ❌", "Плохо усваивается, в основном даёт слабительный эффект. Не рекомендуется как источник магния."],
                      ["Сульфат (соль Эпсома)", "Низкое ❌", "Для ванн — хорошо. Внутрь — не подходит."],
                    ].map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#fdfcfb]"}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-[#555]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[#6b6b6b] mt-3">Вывод: для большинства людей оптимальны бисглицинат (особенно при тревожности и нарушениях сна) и цитрат (особенно при запорах или если нет проблем с ЖКТ).</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Как и когда принимать магний</h2>
              <div className="space-y-4">
                {[
                  { q: "Когда лучше принимать?", a: "Вечером или перед сном — магний расслабляет нервную систему и улучшает сон. Если принимаете несколько капсул в день — часть утром, часть вечером." },
                  { q: "До или после еды?", a: "Во время еды или после — так лучше усваивается и меньше риск дискомфорта в желудке." },
                  { q: "Сколько принимать?", a: "Рекомендуемая суточная доза — 300–400 мг элементарного магния. При дефиците — до 600 мг курсом, потом снизить до поддерживающей." },
                  { q: "Как долго?", a: "Минимум 2–3 месяца. Дефицит формировался не за одну неделю — и восполняется тоже постепенно. Многие продолжают постоянно как поддержку." },
                  { q: "С чем не совмещать?", a: "Не принимайте одновременно с кальцием в высоких дозах (конкурируют за усвоение), с некоторыми антибиотиками и препаратами для щитовидки — выдержите интервал 2–4 часа." },
                ].map((item, i) => (
                  <div key={i} className="bg-[#fdf8f5] rounded-2xl p-5">
                    <p className="font-semibold text-sm text-[#E8845A] mb-2">{item.q}</p>
                    <p className="text-sm text-[#555] leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">Продукты с высоким содержанием магния</h2>
              <p className="text-[#555] mb-4">Добавки — не замена питанию, а дополнение. Старайтесь включать в рацион:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ["🌰", "Тыквенные семена", "592 мг/100г"],
                  ["🌿", "Семена чиа", "335 мг/100г"],
                  ["🍫", "Тёмный шоколад", "228 мг/100г"],
                  ["🥑", "Авокадо", "29 мг/100г"],
                  ["🥬", "Шпинат", "79 мг/100г"],
                  ["🫘", "Чечевица", "71 мг/100г"],
                ].map(([emoji, name, amount], i) => (
                  <div key={i} className="text-center bg-white border border-[#f0e8e0] rounded-2xl p-4">
                    <div className="text-3xl mb-2">{emoji}</div>
                    <p className="text-xs font-semibold mb-1">{name}</p>
                    <p className="text-xs text-[#E8845A] font-bold">{amount}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Итог */}
            <div className="bg-gradient-to-br from-[#FDDCCA]/40 to-[#fdf8f5] rounded-3xl p-7">
              <h3 className="text-xl font-bold mb-4">Итог: что запомнить</h3>
              <ul className="space-y-3">
                {[
                  "Магний участвует в 300+ реакциях — от энергии до сна и настроения",
                  "Дефицит встречается очень часто, но анализ крови его не покажет",
                  "Лучшие формы: бисглицинат и цитрат — биодоступность до 90%",
                  "Принимайте вечером, во время еды, курсом минимум 2–3 месяца",
                  "Симптомы дефицита: тревога, плохой сон, судороги, хроническая усталость",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#1a1a1a]">
                    <span className="w-5 h-5 rounded-full bg-[#E8845A] text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA — карточки товаров */}
            <div className="pt-4">
              <p className="text-center text-[#6b6b6b] mb-6 text-lg font-medium">Попробуйте магний от взБАДрись</p>
              <div className="grid sm:grid-cols-2 gap-5 justify-items-center">
                {[
                  {
                    href: "/product/magniy-bisglitinat",
                    name: "Магний Бисглицинат",
                    sub: "60 капсул · 400 мг",
                    price: "1 490 ₽",
                    oldPrice: "1 890 ₽",
                    badge: "Хит",
                    tag: "Лучший для сна и тревожности",
                    img: "/products/magniy-bisglitinat/1.png",
                  },
                  {
                    href: "/product/magniy-citrat-b6",
                    name: "Магний Цитрат + B6",
                    sub: "60 капсул · 300 мг",
                    price: "1 290 ₽",
                    oldPrice: null,
                    badge: "Новинка",
                    tag: "С витамином B6 для нервной системы",
                    img: "/products/magniy-citrat-b6/1.jpg",
                  },
                ].map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="group w-full max-w-[320px] bg-white border border-[#f0e8e0] rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    {/* Фото */}
                    <div className="relative aspect-[4/5] w-full bg-white overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-3 left-3 text-xs font-semibold bg-[#1a1a1a] text-white px-2.5 py-1 rounded-full z-10">{item.badge}</span>
                    </div>
                    {/* Инфо */}
                    <div className="p-5 flex flex-col gap-2 flex-1 min-w-0">
                      <span className="text-xs font-medium text-[#E8845A] bg-[#ffeee6] px-2.5 py-1 rounded-full self-start">{item.tag}</span>
                      <p className="font-bold text-base group-hover:text-[#E8845A] transition-colors">{item.name}</p>
                      <p className="text-xs text-[#aaa]">{item.sub}</p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#f0e8e0]">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-[#E8845A]">{item.price}</span>
                          {item.oldPrice && <span className="text-sm text-[#aaa] line-through">{item.oldPrice}</span>}
                        </div>
                        <span className="bg-[#E8845A] text-white text-sm font-semibold px-4 py-2 rounded-full group-hover:bg-[#d4703f] transition-colors">
                          В корзину →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
