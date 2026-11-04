import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ExternalLink, FlaskConical, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ZincSeleniumQuiz from "@/components/ZincSeleniumQuiz";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "Зачем нужны цинк и селен и как понять, что их может не хватать — взБАДрись",
  description: "Как цинк и селен связаны с иммунитетом, кожей, волосами, пищеварением и щитовидной железой. Тест нутрициолога и разбор исследований.",
  alternates: { canonical: "/blog/zachem-nuzhny-tsink-i-selen" },
  openGraph: {
    title: "Зачем нужны цинк и селен и как понять, что их может не хватать",
    description: "Тест из пяти вопросов и понятный разбор цинка и селена от нутрициолога Камы Карамовой.",
    type: "article",
    url: "/blog/zachem-nuzhny-tsink-i-selen",
  },
};

function getZincSeleniumProduct() {
  const product = products.find((item) => item.id === "selen-tsink");
  if (!product) throw new Error("Product selen-tsink not found");
  return product;
}

const zincSeleniumProduct = getZincSeleniumProduct();

const sources = [
  { label: "NIH Office of Dietary Supplements: Zinc — Fact Sheet for Health Professionals", href: "https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/" },
  { label: "NIH Office of Dietary Supplements: Selenium — Fact Sheet for Health Professionals", href: "https://ods.od.nih.gov/factsheets/Selenium-HealthProfessional/" },
  { label: "Nault D. et al. Zinc for prevention and treatment of the common cold. Cochrane Database of Systematic Reviews, 2024", href: "https://pubmed.ncbi.nlm.nih.gov/38719213/" },
  { label: "Del Rio E.A. et al. Zinc Gluconate and the Human Intestinal Barrier, 2025", href: "https://pubmed.ncbi.nlm.nih.gov/40943460/" },
  { label: "Larsen C. et al. Selenium supplementation in patients with hypothyroidism, 2024", href: "https://pubmed.ncbi.nlm.nih.gov/38215286/" },
  { label: "EFSA: Dietary reference values and the updated tolerable upper intake level for selenium", href: "https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values" },
];

const paragraphClass = "leading-[1.8] text-[#58514d]";

export default function ZincSeleniumArticlePage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <article>
          <header className="border-b border-[#efe4dd] bg-[#fdf8f5]">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
              <nav className="mb-7 flex flex-wrap items-center gap-1.5 text-xs text-[#93877f]" aria-label="Хлебные крошки">
                <Link href="/" className="transition hover:text-[#E8845A]">Главная</Link>
                <ChevronRight size={13} aria-hidden="true" />
                <Link href="/blog" className="transition hover:text-[#E8845A]">Блог</Link>
                <ChevronRight size={13} aria-hidden="true" />
                <span className="text-[#5f554f]">Цинк и селен</span>
              </nav>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#FDDCCA] px-3 py-1.5 text-xs font-bold text-[#7c3d25]">
                <FlaskConical size={14} aria-hidden="true" /> Статья и тест нутрициолога
              </div>
              <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-[1.12] tracking-[-0.025em] sm:text-4xl md:text-5xl">
                Почему организму нужны цинк и селен и как понять, что их может не хватать
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-relaxed text-[#625b57] sm:text-lg">
                Сначала першит горло. Потом простуда затягивается дольше обычного. Волосы остаются на расчёске, ногти слоятся, кожа стала капризной, а живот реагирует даже на привычную еду.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-[#756b65]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-black text-[#E8845A] shadow-sm">КК</div>
                <div>
                  <p className="font-bold text-[#403a37]">Кама Карамова</p>
                  <p className="text-xs">Нутрициолог, учёный, мама</p>
                </div>
                <span className="hidden h-8 w-px bg-[#e5d9d1] sm:block" aria-hidden="true" />
                <span className="text-xs">4 ноября 2026 · 10 минут</span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto mb-8 max-w-3xl space-y-4 text-base sm:text-[1.05rem]">
              <p className={paragraphClass}>Кажется, что это несколько отдельных проблем. И причины у них действительно могут быть разными: железодефицит, щитовидная железа, нехватка белка, стресс, состояние ЖКТ. Но есть два микроэлемента, которые участвуют сразу во многих этих процессах. Это цинк и селен.</p>
              <p className={paragraphClass}>Я не люблю совет «попейте что-нибудь для иммунитета». Мне важно понять, что именно мы поддерживаем, почему выбран этот состав и нужен ли он вам вообще.</p>
            </div>

            <ZincSeleniumQuiz fallbackProduct={zincSeleniumProduct} />

            <div className="mx-auto mt-8 max-w-3xl rounded-2xl border-l-4 border-[#E8845A] bg-[#fff7f2] p-5 text-sm leading-relaxed text-[#5f554f] sm:text-base">
              Если хотите понять, для чего цинк и селен нужны иммунитету, коже, волосам, щитовидной железе и пищеварению, читайте статью ниже.
            </div>

            <div className="mx-auto mt-14 max-w-3xl space-y-12 text-base sm:mt-16 sm:text-[1.05rem]">
              <section aria-labelledby="zinc-role">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">Сначала — цинк</p>
                <h2 id="zinc-role" className="mt-3 text-2xl font-extrabold sm:text-3xl">Зачем организму цинк</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Цинк нужен для работы сотен ферментов. Он участвует в синтезе белка и ДНК, делении клеток, заживлении тканей, работе иммунной системы и восприятии вкуса.</p>
                  <p className={paragraphClass}>Особенно хорошо его роль заметна там, где клетки быстро обновляются: в коже, слизистых, волосяных фолликулах и кишечном эпителии. Поэтому при выраженном дефиците могут появляться частые инфекции, ухудшение заживления, изменения кожи, выпадение волос, снижение аппетита, нарушение вкуса и диарея.</p>
                  <p className={paragraphClass}>Недостаточное поступление цинка нельзя назвать редкостью. В американском исследовании питания около 15% взрослых получали меньше расчётной средней потребности, а глобальная модель оценила долю людей с риском нехватки примерно в 17%. Это популяционные оценки. По ним нельзя определить ваш личный уровень цинка, зато они объясняют, почему я всегда спрашиваю о рационе и пищеварении.</p>
                  <p className={paragraphClass}>Тут важно не поставить себе дефицит по одной сломанной ногтевой пластине. Выпадение волос бывает при низком ферритине, нехватке белка, проблемах щитовидной железы, после родов и на фоне сильного стресса. Я смотрю на сочетание признаков и контекст: питание, пищеварение, белок, ферритин, щитовидную железу, лекарства и добавки.</p>
                </div>
              </section>

              <section aria-labelledby="zinc-immunity">
                <h2 id="zinc-immunity" className="text-2xl font-extrabold sm:text-3xl">Как цинк связан с иммунитетом</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Иммунные клетки должны созревать, делиться, распознавать угрозу и вовремя завершать воспалительную реакцию. Для всех этих этапов нужен цинк. При его нехватке иммунный ответ может становиться менее слаженным, а восстановление после инфекций затягиваться.</p>
                  <p className={paragraphClass}>Это не означает, что капсула цинка остановит вирус. Цинк создаёт условия, в которых иммунная система выполняет свою работу. Если питания и запасов хватает, дополнительная высокая дозировка не превращает иммунитет в «усиленный».</p>
                </div>

                <div className="mt-7 rounded-3xl border border-[#eaded6] bg-[#faf7f4] p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold">Можно ли начать принимать цинк, когда заболели</h3>
                  <div className="mt-4 space-y-4">
                    <p className={paragraphClass}>В обзоре Cochrane 2024 года объединили 34 исследования с участием 8 526 человек. Цинк мог сократить продолжительность уже начавшейся простуды примерно на два дня, но уверенность в этом результате была низкой. На риск заболеть он почти не влиял, а данные о выраженности симптомов остались неясными.</p>
                    <p className={paragraphClass}>В большинстве исследований использовали пастилки для рассасывания, чаще с глюконатом или ацетатом цинка. Они находились в контакте со слизистой рта и горла, а дозировки отличались от обычной капсулы. Обзор также исключал комплексы, где цинк сочетался с другими витаминами и минералами.</p>
                    <p className={paragraphClass}>Поэтому обычной капсуле «цинк + селен» нельзя приписывать результат пастилок из этих исследований. Если вы заболели и до этого не принимали цинк, комплекс можно рассматривать как поддержку рациона в рамках инструкции, если нет противопоказаний и вы не дублируете цинк из других банок. Он не заменяет лечение, осмотр при тревожных симптомах и обычные меры восстановления.</p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="gut-role">
                <h2 id="gut-role" className="text-2xl font-extrabold sm:text-3xl">Почему состояние ЖКТ имеет значение</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Связь здесь двусторонняя. Цинк всасывается в кишечнике, поэтому хроническая диарея, воспалительные заболевания кишечника, целиакия, операции на ЖКТ и выраженные нарушения пищеварения повышают риск его нехватки. Одновременно цинк участвует в обновлении кишечного эпителия и работе контактов между клетками слизистой.</p>
                  <p className={paragraphClass}>В 2025 году появилось небольшое исследование с участием людей, где приём глюконата цинка менял экспрессию белков плотных контактов и снижал один из маркеров пассивной кишечной проницаемости. Данные интересные, но исследование было первым в своём роде. По нему рано обещать, что цинк «восстановит кишечник».</p>
                  <p className={paragraphClass}>Практический вывод проще: если живот постоянно вздут, стул нестабильный, есть тяжесть после еды или диагностированное заболевание ЖКТ, одной банки может оказаться мало. Нужно одновременно разбираться, почему минерал плохо поступает или усваивается.</p>
                </div>
              </section>

              <section aria-labelledby="selenium-role">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9b7355]">Теперь — селен</p>
                <h2 id="selenium-role" className="mt-3 text-2xl font-extrabold sm:text-3xl">Зачем нужен селен</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Селен входит в состав 25 известных селенопротеинов. Они участвуют в защите клеток от окислительного повреждения, синтезе ДНК, репродуктивной функции, иммунном ответе и обмене гормонов щитовидной железы.</p>
                  <p className={paragraphClass}>Щитовидная железа содержит много селена. Селенопротеины участвуют в превращении Т4 в активный Т3 и помогают защищать ткань железы от перекиси водорода, которая образуется во время синтеза гормонов.</p>
                  <p className={paragraphClass}>Это не делает селен универсальным средством при АИТ или гипотиреозе. В рандомизированном исследовании 2024 года 412 пациентов с аутоиммунным тиреоидитом получали 200 мкг селена или плацебо в дополнение к левотироксину. Антитела к ТПО в группе селена немного снизились, но качество жизни, дозировка левотироксина и соотношение свободных Т3 и Т4 не улучшились.</p>
                  <p className={paragraphClass}>Этот пример хорошо показывает разницу между изменением одного лабораторного маркера и реальным улучшением самочувствия. Мы всегда смотрим на человека целиком.</p>
                </div>
              </section>

              <section aria-labelledby="why-together">
                <h2 id="why-together" className="text-2xl font-extrabold sm:text-3xl">Почему цинк и селен часто объединяют</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Цинк участвует в работе иммунных клеток, обновлении тканей и заживлении. Селен нужен для селенопротеинов, антиоксидантной защиты и обмена гормонов щитовидной железы. В одной капсуле их удобно принимать курсом, когда есть основания поддержать оба направления.</p>
                  <p className={paragraphClass}>Это сочетание не означает, что минералы «усиливают друг друга в несколько раз». Для здорового человека с полноценным рационом дополнительная банка может вообще не понадобиться.</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    ["25 мг", "цинка в форме цитрата"],
                    ["150 мкг", "селена в форме селенометионина"],
                    ["Витамин C", "в форме аскорбата натрия"],
                  ].map(([value, label]) => (
                    <div key={value} className="rounded-2xl border border-[#eee2da] bg-[#fffaf7] p-5">
                      <p className="text-xl font-extrabold text-[#E8845A]">{value}</p>
                      <p className="mt-1 text-sm leading-relaxed text-[#6b625d]">{label}</p>
                    </div>
                  ))}
                </div>
                <p className={`${paragraphClass} mt-5`}>Цитрат цинка хорошо всасывается. Селенометионин относится к органическим формам селена и тоже хорошо усваивается. Дозировки заметно выше базовой суточной потребности, поэтому комплекс рассчитан на осознанный курс по инструкции, а не на бесконечный приём «на всякий случай».</p>
              </section>

              <section aria-labelledby="who-needs">
                <h2 id="who-needs" className="text-2xl font-extrabold sm:text-3xl">Кому стоит внимательнее посмотреть на цинк и селен</h2>
                <p className={`${paragraphClass} mt-5`}>Я бы начала с оценки рациона и факторов риска, если вы:</p>
                <ul className="mt-5 space-y-3">
                  {[
                    "редко едите мясо, рыбу, морепродукты, яйца и молочные продукты;",
                    "придерживаетесь преимущественно растительного рациона и часто едите продукты с высоким содержанием фитатов;",
                    "имеете хроническую диарею, целиакию, воспалительные заболевания кишечника или перенесли бариатрическую операцию;",
                    "часто болеете и долго восстанавливаетесь;",
                    "замечаете сочетание выпадения волос, проблемной кожи, медленного заживления и изменений вкуса или аппетита;",
                    "наблюдаетесь по поводу щитовидной железы и хотите разобраться в микроэлементах вместе со специалистом.",
                  ].map((item) => <li key={item} className="flex items-start gap-3 leading-relaxed text-[#58514d]"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E8845A]" aria-hidden="true" />{item}</li>)}
                </ul>
                <p className={`${paragraphClass} mt-5`}>Анализ крови на цинк может быть частью оценки, но он не идеален. Уровень меняется в течение дня, зависит от инфекции, воспаления, гормонального фона и недавнего питания. Один показатель без симптомов и рациона легко вводит в заблуждение.</p>
              </section>

              <section aria-labelledby="before-taking" className="rounded-[28px] border border-[#efd2c2] bg-[#fff6f0] p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="shrink-0 text-[#E8845A]" size={26} aria-hidden="true" />
                  <h2 id="before-taking" className="text-2xl font-extrabold sm:text-3xl">Что важно проверить перед приёмом</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>В комплексе уже 25 мг цинка и 150 мкг селена. Если вы принимаете мультивитамины, проверьте, есть ли в составе цинк и селен. Если есть, совмещать их с этим комплексом не нужно.</p>
                  <p className={paragraphClass}><strong className="text-[#3d3733]">Избыток цинка и селена может быть опасен, поэтому рекомендуемый курс комплекса составляет один месяц.</strong> Продолжать приём дольше без пересмотра питания, добавок и состояния не стоит.</p>
                  <p className={paragraphClass}>Избыток цинка может вызывать тошноту, дискомфорт в животе, рвоту и металлический вкус. Длительные высокие дозы нарушают обмен меди. При избытке селена могут выпадать волосы, становиться ломкими ногти, появляться тошнота, диарея или сыпь.</p>
                  <p className={paragraphClass}>Цинк нужно принимать отдельно от препаратов железа. Он также взаимодействует с некоторыми антибиотиками и пеницилламином. При беременности, грудном вскармливании и регулярном приёме лекарств схему лучше согласовать со специалистом.</p>
                </div>
                <Link href="/product/selen-tsink" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-6 text-sm font-bold text-white transition hover:bg-[#d8734b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8845A]">
                  Посмотреть «Цинк + Селен» <ChevronRight size={17} aria-hidden="true" />
                </Link>
                <p className="mt-3 text-xs text-[#81766f]">БАД — не является лекарственным средством</p>
              </section>

              <section aria-labelledby="sources">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">Научная база</p>
                <h2 id="sources" className="mt-3 text-2xl font-extrabold sm:text-3xl">На какие исследования и материалы я опиралась</h2>
                <ol className="mt-6 space-y-3">
                  {sources.map((source, index) => (
                    <li key={source.href} className="grid grid-cols-[26px_minmax(0,1fr)] gap-2 text-sm leading-relaxed text-[#665e59]">
                      <span className="font-bold text-[#b46b49]">{index + 1}.</span>
                      <a href={source.href} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 underline decoration-[#ddb8a4] underline-offset-4 transition hover:text-[#c9653e]">
                        <span>{source.label}</span><ExternalLink className="mt-1 shrink-0" size={13} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
