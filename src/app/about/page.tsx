import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { products } from "@/lib/products";
import {
  ArrowUpRight,
  ClipboardCheck,
  Eye,
  FileText,
  FlaskConical,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "О компании — взБАДрись",
  description:
    "Как Кама Карамова и Полина Абдулкина создают добавки «взБАДрись»: личная проверка производства, контроль сырья и открытая видеоэкскурсия.",
};

const productionChecks = [
  {
    icon: PackageCheck,
    title: "Порядок на складе и строгий отбор сырья",
    description:
      "На складе каждый мешок промаркирован, ничего не лежит на полу, соблюдаются условия хранения и проверяются сроки годности. Нам отдельно показали сырьё, которое не прошло внутренний контроль: его не стали фасовать и подготовили к возврату поставщику. Так же поступают с сырьём, если оставшегося срока годности недостаточно для выпуска партии с необходимым запасом.",
  },
  {
    icon: ClipboardCheck,
    title: "Баночки из каждой партии остаются на производстве",
    description:
      "Производство хранит несколько запечатанных баночек из каждой выпущенной партии каждого бренда. Даже когда мы распродадим всю партию, там останутся её точные экземпляры: с тем же составом, номером партии и датой фасовки. Их сохраняют в течение всего срока годности продукта, чтобы при необходимости можно было исследовать именно эту партию.",
  },
  {
    icon: ShieldCheck,
    title: "Проверяют даже материал баночек",
    description:
      "Нам показали документы на пластиковые баночки, выбранные для фасовки. Материал упаковки прошёл лабораторную проверку безопасности: производство опирается на результаты исследований, а не только на маркировку на дне банки. Для нас важно, чтобы хороший состав хранился в проверенной упаковке.",
  },
];

const qualityChecks = [
  {
    title: "Сырьё проверяют повторно",
    description:
      "Поставщик передаёт документы и результаты анализов, но производство не ограничивается ими. От каждой поступившей партии отбирают отдельную пробу и проводят предусмотренные для этого сырья исследования. Например, порошок магния из мешка высевают на питательные среды и проверяют, нет ли недопустимой микрофлоры, включая патогенные микроорганизмы.",
  },
  {
    title: "Воздух и поверхности проверяют каждый день",
    description:
      "С рабочих поверхностей и помещений берут смывы. Для контроля воздуха в производственной зоне на установленное время открывают чашки Петри с питательной средой: частицы и микроорганизмы из воздуха оседают на неё, после чего в лаборатории оценивают, появился ли рост. Так контролируют среду, в которой фасуются добавки.",
  },
  {
    title: "Чистота поддерживается на каждом переходе",
    description:
      "Перед посещением у нас проверили медицинские книжки: без них на производство не допускают. Внутри обязательны халаты, шапочки и бахилы, чтобы волосы, одежда и уличная пыль не попали в рабочую зону. Между помещениями и на выходе из туалета лежат дезинфицирующие коврики, на которых обрабатывают обувь перед возвращением в коридор и цех.",
  },
];

export default function AboutPage() {
  const supplements = products.filter((product) => product.category === "bads");

  return (
    <>
      <Header />
      <main className="min-h-screen overflow-hidden">
        <section className="border-b border-[#f0e8e0] bg-white py-14 md:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                Кто отвечает за продукт
              </p>
              <h1 className="mb-3 text-3xl font-bold text-balance md:text-5xl">
                Кама и Полина — основатели «взБАДрись»
              </h1>
              <p className="mx-auto max-w-2xl leading-relaxed text-[#6b6b6b]">
                Мы познакомились в научной лаборатории. Биологическое образование и годы
                исследовательской работы приучили нас смотреть на составы, процессы и документы внимательно.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <article className="rounded-3xl border border-[#eadfd8] bg-[#fdf8f5] p-6 md:p-8">
                <span className="mb-4 inline-flex rounded-full bg-[#FDDCCA] px-3 py-1 text-xs font-bold text-[#8b4513]">Составы</span>
                <h2 className="mb-3 text-xl font-bold">Кама Карамова</h2>
                <p className="text-sm leading-relaxed text-[#6b6b6b]">
                  Нутрициолог с практикой более 5 лет. Шесть лет работала в эколого-биотехнологической
                  лаборатории и писала диссертацию по устойчивости к антибиотикам. Отвечает за формы,
                  дозировки и сочетаемость компонентов.
                </p>
              </article>
              <article className="rounded-3xl border border-[#eadfd8] bg-[#fdf8f5] p-6 md:p-8">
                <span className="mb-4 inline-flex rounded-full bg-[#FDDCCA] px-3 py-1 text-xs font-bold text-[#8b4513]">Качество и документы</span>
                <h2 className="mb-3 text-xl font-bold">Полина Абдулкина</h2>
                <p className="text-sm leading-relaxed text-[#6b6b6b]">
                  Биолог по образованию, шесть лет работала в лаборатории. Участвовала в запуске
                  производства с нуля и подготовке лаборатории к аккредитации. Проверяет документацию,
                  сырьё и соответствие процессов требованиям качества.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b border-[#f0e8e0] bg-[#fdf8f5] py-10 md:py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <div className="order-2 lg:order-1">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                О компании
              </p>
              <h2 className="mb-5 text-3xl font-bold leading-[1.12] md:text-5xl">
                Мы знаем, где и как сделаны наши добавки
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-[#6b6b6b] md:text-lg">
                Первую линейку «взБАДрись» мы выпускаем на производстве «Метафарм».
                До запуска мы приехали туда лично и прошли весь путь сырья: от склада
                и лаборатории до помещений, где наполняют и упаковывают баночки.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#7b746f] md:text-base">
                Мы спокойно называем завод, потому что видели его работу изнутри и задавали
                вопросы на месте. Это первое выбранное нами производство; если в будущем
                появятся другие площадки, к ним будет такой же подход.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm font-medium text-[#454545]">
                <span className="rounded-full border border-[#efd9cc] bg-white px-4 py-2">Личный визит</span>
                <span className="rounded-full border border-[#efd9cc] bg-white px-4 py-2">Проверка документов</span>
                <span className="rounded-full border border-[#efd9cc] bg-white px-4 py-2">Открытое производство</span>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative overflow-hidden rounded-[28px] border border-[#eadfd8] bg-white shadow-[0_24px_70px_rgba(91,62,45,0.13)]">
                <Image
                  src="/about/production-choice.jpg"
                  alt="Кама Карамова и Полина Абдулкина на производстве Метафарм"
                  width={1800}
                  height={1350}
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  priority
                  className="aspect-[4/3] h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[#454545] shadow-lg backdrop-blur">
                  Первый визит на производство
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                Почему мы выбрали это производство
              </p>
              <h2 className="mb-4 text-2xl font-bold leading-tight md:text-4xl">
                Решение появилось ещё до того, как мы поднялись в цех
              </h2>
              <p className="leading-relaxed text-[#6b6b6b]">
                Эта фотография сделана в самом начале визита: мы с Полиной поднимаемся
                на второй этаж производства. К этому моменту нам уже показали склад,
                входной контроль и мешки с сырьём, которое не прошло проверку и ожидало
                возврата. Всё стояло на своих местах, было промаркировано и хранилось
                на стеллажах. Тогда мы впервые подумали: похоже, первую линейку будем делать здесь.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {productionChecks.map((check) => (
                <article
                  key={check.title}
                  className="rounded-3xl border border-[#f0e8e0] bg-[#fdf8f5] p-6"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDDCCA] text-[#c8643c]">
                    <check.icon size={22} />
                  </div>
                  <h3 className="mb-2 font-bold">{check.title}</h3>
                  <p className="text-sm leading-relaxed text-[#6b6b6b]">{check.description}</p>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-relaxed text-[#8b817a]">
              Нам также показали документы на производственные процессы и материалы,
              сертификаты качества и сертификат «Халяль». Мы хотим, чтобы вы могли
              увидеть те же детали и подтверждения, на которые смотрели мы сами.
            </p>
          </div>
        </section>

        <section className="border-y border-[#f0e8e0] bg-[#fdf8f5] py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                Контроль качества
              </p>
              <h2 className="mb-5 text-2xl font-bold leading-tight text-balance md:text-4xl">
                Проверка начинается до фасовки
              </h2>
              <p className="leading-relaxed text-[#6b6b6b]">
                Эта фотография сделана в лаборатории контроля сырья. Нам показали,
                как производство перепроверяет то, что получает от поставщиков, ведёт
                журналы контроля и каждый день следит за чистотой помещений. Для нас
                это был один из главных моментов визита: правила здесь можно увидеть в работе.
              </p>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
              <div className="relative overflow-hidden rounded-[28px] border border-[#eadfd8] bg-white shadow-[0_20px_60px_rgba(91,62,45,0.1)]">
                <Image
                  src="/about/production-lab.jpg"
                  alt="Кама Карамова в лаборатории контроля сырья на производстве"
                  width={1800}
                  height={1350}
                  sizes="(min-width: 1024px) 46vw, 100vw"
                  className="aspect-[4/5] h-full w-full object-cover object-top sm:aspect-[4/3] lg:aspect-[4/5]"
                />
                <div className="absolute bottom-4 left-4 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-[#454545] shadow-lg backdrop-blur">
                  В лаборатории контроля сырья
                </div>
              </div>

              <div className="space-y-4">
                {qualityChecks.slice(0, 2).map((check) => (
                  <div key={check.title} className="flex gap-4 rounded-2xl border border-[#eadfd8] bg-white p-4">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDDCCA] text-[#c8643c]">
                      <FlaskConical size={16} />
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-bold">{check.title}</h3>
                      <p className="text-sm leading-relaxed text-[#6b6b6b]">{check.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-4xl">
              {qualityChecks.slice(2).map((check) => (
                <div
                  key={check.title}
                  className="flex gap-4 rounded-2xl border border-[#eadfd8] bg-white p-5 md:px-7 md:py-6"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDDCCA] text-[#c8643c]">
                    <FlaskConical size={16} />
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-bold">{check.title}</h3>
                    <p className="text-sm leading-relaxed text-[#6b6b6b]">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_390px] lg:px-8">
            <div className="max-w-2xl">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDDCCA] text-[#c8643c]">
                <PlayCircle size={25} />
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                Видеоэкскурсия · 2 минуты 38 секунд
              </p>
              <h2 className="mb-5 text-2xl font-bold leading-tight md:text-4xl">
                Пройдите производство вместе с нами
              </h2>
              <p className="mb-5 leading-relaxed text-[#6b6b6b]">
                Видео начинается у входа и проходит через помещения производства глазами
                посетителя. Вы сами увидите, где хранится сырьё, как устроены переходы
                между зонами, где проходят проверки и в каких помещениях фасуют готовые добавки.
              </p>
              <p className="mb-7 leading-relaxed text-[#6b6b6b]">
                Бренды редко показывают производство настолько подробно. Мы оставили этот
                маршрут открытым, потому что нам не стыдно за место, которое мы выбрали,
                и хочется дать вам возможность посмотреть всё своими глазами.
              </p>
              <a
                href="https://kinescope.io/0QExahU3gD4JoaFv4Lyna5"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#E8845A] px-6 py-3 text-sm font-semibold text-[#E8845A] transition-colors hover:bg-[#E8845A] hover:text-white"
              >
                Открыть видео отдельно
                <ArrowUpRight size={17} />
              </a>
            </div>

            <div className="mx-auto w-full max-w-[390px]">
              <div className="overflow-hidden rounded-[30px] border-[6px] border-[#2f2b29] bg-[#2f2b29] shadow-[0_24px_70px_rgba(47,43,41,0.22)]">
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] bg-black">
                  <iframe
                    src="https://kinescope.io/embed/06cb734c-29a2-410c-92ea-dfaac642be62"
                    title="Видеоэкскурсия по производству Метафарм"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-[32px] border border-[#edcdbd] bg-[#FBE9DF]">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="p-7 md:p-10 lg:p-12">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#c8643c] shadow-sm">
                    <Sprout size={25} />
                  </div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#c8643c]">
                    Что дальше
                  </p>
                  <h2 className="mb-5 text-2xl font-bold leading-tight md:text-4xl">
                    Дальше в «взБАДрись» появится больше семян и продуктов
                  </h2>
                  <p className="leading-relaxed text-[#665b55]">
                    Мы хотим развивать бренд как место, где можно купить добавки и продукты,
                    качество которых мы проверили сами. Скоро рядом с БАДами в каталоге
                    появятся семена, а затем это направление будет расширяться. Штирийские
                    тыквенные семена и нешлифованный кунжут — только первые примеры: мы планируем
                    искать и добавлять другие продукты, если будем уверены в их качестве.
                  </p>
                </div>

                <div className="border-t border-[#edcdbd] bg-white/60 p-7 md:p-10 lg:border-l lg:border-t-0 lg:p-12">
                  <div className="space-y-8">
                    <article>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">01 · Штирийские тыквенные семена</p>
                      <h3 className="mb-3 text-lg font-bold">Когда важен конкретный сорт, одной надписи «семена тыквы» мало</h3>
                      <p className="text-sm leading-relaxed text-[#6b6b6b]">
                        Штирийскую тыкву найти сложнее обычной: у неё тёмно-зелёные семена
                        без жёсткой оболочки и свой насыщенный вкус. В продаже в основном
                        встречаются китайские тыквенные семена, в которых практически нет
                        цинка из-за истощённых почв. Поэтому для нас одной надписи «тыквенные
                        семена» недостаточно: мы ищем именно штирийский сорт, проверяем его
                        происхождение, документы, свежесть партии и условия хранения.
                      </p>
                    </article>

                    <div className="h-px bg-[#edcdbd]" />

                    <article>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">02 · Нешлифованный кунжут</p>
                      <h3 className="mb-3 text-lg font-bold">Мы выбираем цельное семя с сохранённой оболочкой</h3>
                      <p className="text-sm leading-relaxed text-[#6b6b6b]">
                        В магазинах чаще встречается очищенный кунжут. Нам нужен нешлифованный:
                        оболочка остаётся на семени, а вместе с ней сохраняется больше клетчатки
                        и минеральных веществ. При выборе мы смотрим не только на название,
                        но и на вкус, свежесть, чистоту партии, документы и условия хранения.
                      </p>
                    </article>

                    <p className="rounded-2xl bg-white px-5 py-4 text-sm font-medium leading-relaxed text-[#5b514b] shadow-sm">
                      Дальше в ассортименте будут появляться другие семена и продукты,
                      когда мы найдём партии, за качество которых готовы отвечать своим именем.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#E8845A]">
                Проверить самостоятельно
              </p>
              <h2 className="mb-3 text-2xl font-bold md:text-4xl">Документы по каждому БАДу</h2>
              <p className="mx-auto max-w-2xl leading-relaxed text-[#6b6b6b]">
                В карточках добавок доступны свидетельства о государственной регистрации
                и сертификаты системы менеджмента качества производства.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {supplements.map((product) => (
                <article key={product.id} className="rounded-3xl border border-[#f0e8e0] bg-[#fdf8f5] p-5">
                  <Link
                    href={`/product/${product.id}`}
                    className="mb-4 block font-bold leading-snug hover:text-[#E8845A]"
                  >
                    {product.name}
                  </Link>
                  <div className="flex flex-col gap-2">
                    {product.documents.map((document) => (
                      <a
                        key={document.url}
                        href={document.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-[#454545] transition-colors hover:bg-[#FDDCCA]/40"
                      >
                        <FileText size={16} className="shrink-0 text-[#E8845A]" />
                        <span className="min-w-0 flex-1">{document.name}</span>
                        <span className="text-xs text-[#E8845A]">PDF</span>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16 md:pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[32px] bg-[#2f2b29] px-6 py-10 text-center text-white md:px-12 md:py-14">
              <Eye className="mx-auto mb-5 text-[#F5A47F]" size={28} />
              <h2 className="mb-3 text-2xl font-bold md:text-3xl">Изучите составы и документы сами</h2>
              <p className="mx-auto mb-7 max-w-2xl leading-relaxed text-white/70">
                В каталоге можно посмотреть состав, дозировки, способ приёма и документы каждой добавки.
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 rounded-full bg-[#E8845A] px-7 py-3.5 font-semibold transition-colors hover:bg-[#f1936d]"
              >
                Перейти к добавкам
                <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
