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
                <span className="text-xs">4 ноября 2026 · 7 минут</span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mx-auto mb-8 max-w-3xl space-y-4 text-base sm:text-[1.05rem]">
              <p className={paragraphClass}>На первый взгляд это разные проблемы. Волосы отдельно, иммунитет отдельно, живот вообще живёт своей жизнью. Но иногда у них есть общее слабое звено: организму не хватает цинка и селена.</p>
              <p className={paragraphClass}>Я не люблю совет «попейте что-нибудь для иммунитета». Мне важно, чтобы вы понимали, зачем принимаете добавку и что именно она поддерживает. Поэтому сначала короткий тест, а ниже объясню всё простыми словами.</p>
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
                  <p className={paragraphClass}>Цинк особенно нужен там, где организм постоянно что-то обновляет: в коже, волосах, ногтях, слизистых и кишечнике. Он помогает иммунным клеткам работать, участвует в заживлении и влияет даже на вкус и аппетит.</p>
                  <p className={paragraphClass}>Когда цинка не хватает, у одной женщины начинают сильнее выпадать волосы, у другой дольше заживают трещинки на коже, третья чаще болеет. Иногда меняется вкус еды, снижается аппетит или становится нестабильным стул.</p>
                  <p className={paragraphClass}>И это не редкая история. По разным оценкам, цинка с питанием недополучает заметная часть взрослых. Особенно если мясо, рыба и морепродукты появляются на столе от случая к случаю.</p>
                  <p className={paragraphClass}>Конечно, один сломанный ноготь ещё не говорит о дефиците. Но если одновременно выпадают волосы, кожа стала проблемной, простуды затягиваются, а с ЖКТ всё нестабильно, я уже смотрю на цинк вместе с белком, ферритином и щитовидной железой. Именно вместе, а не по одному симптому.</p>
                </div>
              </section>

              <section aria-labelledby="zinc-immunity">
                <h2 id="zinc-immunity" className="text-2xl font-extrabold sm:text-3xl">Как цинк связан с иммунитетом</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Цинк нужен нашим защитным клеткам. Если его мало, организму сложнее вовремя отреагировать на инфекцию и восстановиться после болезни. Поэтому частые простуды и долгое восстановление я никогда не рассматриваю отдельно от питания и дефицитов.</p>
                  <p className={paragraphClass}>Иммунитет нельзя «включить» одной капсулой. Но можно дать ему то, чего ему не хватает для нормальной работы. И цинк здесь один из базовых элементов.</p>
                </div>

                <div className="mt-7 rounded-3xl border border-[#eaded6] bg-[#faf7f4] p-5 sm:p-6">
                  <h3 className="text-lg font-extrabold">Можно ли начать принимать цинк, когда заболели</h3>
                  <div className="mt-4 space-y-4">
                    <p className={paragraphClass}>Да, можно. Есть исследования, в которых приём цинка помогал сократить продолжительность простуды. Поэтому при первых симптомах его можно подключить как поддержку иммунитета.</p>
                    <p className={paragraphClass}>Если вы до этого не принимали цинк, комплекс «Цинк + Селен» можно начать по инструкции. Только проверьте, чтобы цинка не было ещё в мультивитаминах или других добавках.</p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="gut-role">
                <h2 id="gut-role" className="text-2xl font-extrabold sm:text-3xl">Почему состояние ЖКТ имеет значение</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Цинк всасывается в кишечнике. Если вас постоянно беспокоят вздутие, тяжесть после еды или нестабильный стул, минералы могут усваиваться хуже. Получается круг: ЖКТ мешает усвоить цинк, а самой слизистой цинк нужен для нормального обновления.</p>
                  <p className={paragraphClass}>Есть исследования, в которых на фоне приёма цинка улучшалось состояние слизистой кишечника. Для меня это ещё один повод не разделять дефициты и пищеварение на две разные темы.</p>
                  <p className={paragraphClass}>Поэтому при проблемах с ЖКТ я смотрю не только на список продуктов. Мне важно понять, хватает ли белка и минералов, как работает желчь, что со стулом и почему живот вообще начал так реагировать.</p>
                </div>
              </section>

              <section aria-labelledby="selenium-role">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9b7355]">Теперь — селен</p>
                <h2 id="selenium-role" className="mt-3 text-2xl font-extrabold sm:text-3xl">Зачем нужен селен</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Селен я в первую очередь связываю со щитовидной железой. Он помогает организму переводить гормон Т4 в активную форму Т3. Проще говоря, помогает щитовидке не просто выработать гормоны, а нормально ими воспользоваться.</p>
                  <p className={paragraphClass}>Ещё селен защищает клетки от повреждения и поддерживает иммунитет. Поэтому при АИТ, гипотиреозе, выпадении волос и постоянной усталости я обязательно смотрю, хватает ли его в рационе и добавках.</p>
                  <p className={paragraphClass}>Есть исследования, где на фоне приёма селена у людей с АИТ снижались антитела к ТПО. Это не повод отменять основную терапию. Это повод помнить, что щитовидная железа зависит не только от одного ТТГ, и дефициты здесь тоже имеют значение.</p>
                </div>
              </section>

              <section aria-labelledby="why-together">
                <h2 id="why-together" className="text-2xl font-extrabold sm:text-3xl">Почему цинк и селен часто объединяют</h2>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>Цинк и селен закрывают сразу несколько частых запросов: иммунитет, волосы, кожа, восстановление и поддержка щитовидной железы. Поэтому их удобно принимать вместе одним понятным курсом, а не собирать несколько банок и путаться в дозировках.</p>
                  <p className={paragraphClass}>В составе комплекса рабочие формы: цитрат цинка и селенометионин. Они хорошо усваиваются, а витамин C помогает клеткам справляться с ежедневной нагрузкой.</p>
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
                <p className={`${paragraphClass} mt-5`}>Это не комплекс для бесконечного приёма. Оптимальный курс — один месяц. Этого достаточно, чтобы поддержать организм и не наслоить цинк и селен из разных добавок.</p>
              </section>

              <section aria-labelledby="who-needs">
                <h2 id="who-needs" className="text-2xl font-extrabold sm:text-3xl">Кому стоит внимательнее посмотреть на цинк и селен</h2>
                <p className={`${paragraphClass} mt-5`}>Посмотрите внимательнее на цинк и селен, если вы:</p>
                <ul className="mt-5 space-y-3">
                  {[
                    "редко едите мясо, рыбу и морепродукты;",
                    "часто болеете и долго приходите в себя;",
                    "замечаете вздутие, тяжесть после еды или нестабильный стул;",
                    "одновременно столкнулись с выпадением волос, ломкостью ногтей и проблемной кожей;",
                    "наблюдаетесь по поводу АИТ, гипотиреоза или других изменений щитовидной железы.",
                  ].map((item) => <li key={item} className="flex items-start gap-3 leading-relaxed text-[#58514d]"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E8845A]" aria-hidden="true" />{item}</li>)}
                </ul>
                <p className={`${paragraphClass} mt-5`}>Можно сдать анализ на цинк, но я не делаю вывод по одной цифре. Смотрю на питание, симптомы, состояние ЖКТ и то, какие добавки женщина уже принимает. Так картина получается гораздо честнее.</p>
              </section>

              <section aria-labelledby="before-taking" className="rounded-[28px] border border-[#efd2c2] bg-[#fff6f0] p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="shrink-0 text-[#E8845A]" size={26} aria-hidden="true" />
                  <h2 id="before-taking" className="text-2xl font-extrabold sm:text-3xl">Что важно проверить перед приёмом</h2>
                </div>
                <div className="mt-5 space-y-4">
                  <p className={paragraphClass}>В одной капсуле уже есть 25 мг цинка и 150 мкг селена. Если вы пьёте мультивитамины, сначала посмотрите состав. Если там уже есть цинк и селен, вместе с этим комплексом их принимать не нужно.</p>
                  <p className={paragraphClass}><strong className="text-[#3d3733]">Курс — один месяц.</strong> Больше не значит лучше: избыток цинка и селена тоже может навредить.</p>
                  <p className={paragraphClass}>Цинк принимайте отдельно от железа. Если вы беременны, кормите грудью или регулярно принимаете лекарства, согласуйте курс со специалистом.</p>
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
