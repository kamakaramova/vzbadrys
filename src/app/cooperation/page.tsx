import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Camera,
  Check,
  Dumbbell,
  FileCheck2,
  Handshake,
  MessageCircle,
  UsersRound,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

const FORM_URL = "https://forms.yandex.ru/u/6aec74382c4f892b2b7e11be/";

export const metadata: Metadata = {
  title: "Сотрудничество с брендом — взБАДрись",
  description:
    "Приглашаем нутрициологов, фитнес-тренеров, экспертов и авторов контента к сотрудничеству с брендом БАДов «взБАДрись». Заполните анкету, чтобы обсудить формат и условия.",
  alternates: { canonical: "/cooperation" },
  openGraph: {
    title: "Сотрудничество с брендом «взБАДрись»",
    description:
      "Ищем авторов и экспертов, которым близки честный разговор о здоровье и внимательное отношение к составам.",
    url: "/cooperation",
  },
};

const partnerTypes = [
  {
    icon: BadgeCheck,
    title: "Нутрициологи и эксперты",
    text: "Если вы умеете объяснять сложное простым языком и внимательно относитесь к рекомендациям, нам будет о чём поговорить.",
  },
  {
    icon: Dumbbell,
    title: "Фитнес-тренеры",
    text: "Если вы помогаете людям выстраивать нагрузку, восстановление и полезные привычки без крайностей, нам близок такой подход.",
  },
  {
    icon: Camera,
    title: "Авторы о здоровье и образе жизни",
    text: "Нам близки блоги, где добавки показывают честно: без обещаний вылечить всё одной баночкой и без давления на аудиторию.",
  },
  {
    icon: UsersRound,
    title: "Создатели живых сообществ",
    text: "Размер аккаунта важен, но мы также смотрим на доверие аудитории, качество материалов и то, насколько совпадают наши ценности.",
  },
];

const principles = [
  {
    icon: FileCheck2,
    title: "Можно проверить каждое слово",
    text: "У наших продуктов есть документы, понятные составы и открытая информация о производстве. Мы дадим материалы, которые помогут подготовить точный контент.",
  },
  {
    icon: MessageCircle,
    title: "Общаемся напрямую",
    text: "Вопросы не остаются в переписке на недели. Мы на связи, объясняем детали и заранее договариваемся о формате.",
  },
  {
    icon: Handshake,
    title: "Условия обсуждаем индивидуально",
    text: "Рассматриваем бартерные и коммерческие размещения. Подходящий вариант зависит от площадки, аудитории и идеи материала.",
  },
];

const steps = [
  {
    number: "01",
    title: "Вы заполняете анкету",
    text: "Расскажите об аккаунте, аудитории, охватах и удобном для вас формате сотрудничества.",
  },
  {
    number: "02",
    title: "Мы знакомимся с вашим блогом",
    text: "Смотрим темы, подачу и аудиторию. Нам важно понять, будет ли сотрудничество органичным для обеих сторон.",
  },
  {
    number: "03",
    title: "Связываемся и обсуждаем детали",
    text: "Если мы подходим друг другу, команда «взБАДрись» напишет вам и предложит конкретный формат.",
  },
];

function FormLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[#E8845A] px-7 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(232,132,90,0.25)] transition hover:-translate-y-0.5 hover:bg-[#d4703f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8845A] focus-visible:ring-offset-2 ${className}`}
    >
      Заполнить анкету
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  );
}

export default function CooperationPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-hidden bg-white">
        <section className="border-b border-[#f0e8e0] bg-[#fffaf7] py-12 md:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#C86840]">
                Сотрудничество с «взБАДрись»
              </p>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[#1f1d1b] sm:text-5xl lg:text-6xl">
                Давайте делать полезный контент вместе
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#68615d] md:text-lg">
                Мы открыты к сотрудничеству с нутрициологами, фитнес-тренерами,
                экспертами и авторами, которые бережно относятся к доверию своей
                аудитории. Если вам близки честные составы, понятные объяснения и
                рекомендации без громких обещаний, заполните короткую анкету.
              </p>

              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <FormLink />
                <a
                  href="#how-it-works"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-[#514944] underline decoration-[#E7B49E] decoration-2 underline-offset-4 transition hover:text-[#C86840] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8845A]"
                >
                  Как всё проходит
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#6f6762]">
                <span className="inline-flex items-center gap-2">
                  <Check size={16} className="text-[#C86840]" aria-hidden="true" />
                  Бартерные и коммерческие форматы
                </span>
                <span className="inline-flex items-center gap-2">
                  <Check size={16} className="text-[#C86840]" aria-hidden="true" />
                  Решение после знакомства с аккаунтом
                </span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[580px] pb-8 pt-2 sm:px-6 lg:pb-4">
              <div className="absolute inset-x-5 bottom-0 top-10 rounded-[38px] bg-[#FDDCCA]" />
              <div className="absolute left-0 top-0 z-20 max-w-[220px] -rotate-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-[0_18px_50px_rgba(86,57,42,0.16)] sm:left-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C86840]">Основа для контента</p>
                <p className="mt-1 text-sm font-bold leading-snug text-[#2a2624]">Документы, составы и ответы команды</p>
              </div>

              <div className="relative z-10 ml-auto w-[72%] rotate-2 overflow-hidden rounded-[28px] border-[7px] border-white bg-white shadow-[0_24px_65px_rgba(86,57,42,0.2)]">
                <Image
                  src="/products/selen-tsink/1.png"
                  alt="Селен и цинк «взБАДрись»"
                  width={1080}
                  height={1350}
                  priority
                  sizes="(min-width: 1024px) 34vw, 72vw"
                  className="h-auto w-full"
                />
              </div>
              <div className="relative z-20 -mt-[42%] w-[58%] -rotate-3 overflow-hidden rounded-[24px] border-[7px] border-white bg-white shadow-[0_24px_65px_rgba(86,57,42,0.22)]">
                <Image
                  src="/products/magniy-bisglitinat/1.png"
                  alt="Магний хелат «взБАДрись»"
                  width={1080}
                  height={1350}
                  sizes="(min-width: 1024px) 28vw, 58vw"
                  className="h-auto w-full"
                />
              </div>
              <div className="absolute bottom-2 right-0 z-30 rounded-2xl bg-[#1f1d1b] px-4 py-3 text-white shadow-xl sm:right-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/60">Главное</p>
                <p className="mt-0.5 text-sm font-bold">Доверие аудитории</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C86840]">Кого мы приглашаем</p>
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#1f1d1b] md:text-4xl">
                Нам важно совпасть по отношению к аудитории
              </h2>
              <p className="mt-4 leading-relaxed text-[#6b625d]">
                Мы не выбираем партнёров только по числу подписчиков. Смотрим, как вы
                общаетесь с людьми, объясняете тему здоровья и относитесь к рекламе.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {partnerTypes.map((item) => (
                <article key={item.title} className="rounded-[28px] border border-[#eddfd7] bg-[#fdf8f5] p-6 md:p-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#C86840] shadow-sm">
                    <item.icon size={23} aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-bold text-[#25211f]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b625d]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#f0e8e0] bg-[#fdf8f5] py-14 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:px-8">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C86840]">Что вы получите</p>
              <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] text-[#1f1d1b] md:text-4xl">
                Информация, с которой удобно работать честно
              </h2>
              <p className="mt-5 leading-relaxed text-[#6b625d]">
                «взБАДрись» создали Кама и Полина, обе с биологическим образованием и
                опытом лабораторной работы. Мы сами разбираем составы, проверяем документы
                и приезжаем на производство. Поэтому партнёр получает прямые ответы, а не
                готовый рекламный текст, который нужно повторить слово в слово.
              </p>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#C86840] underline decoration-[#E7B49E] decoration-2 underline-offset-4"
              >
                Как мы создаём продукты
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {principles.map((item) => (
                <article key={item.title} className="flex gap-4 rounded-3xl border border-[#eadfd8] bg-white p-5 md:p-6">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FDDCCA] text-[#C86840]">
                    <item.icon size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#25211f]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#6b625d]">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-40 py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 max-w-3xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#C86840]">Как всё проходит</p>
              <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-[#1f1d1b] md:text-4xl">
                Начнём с короткого знакомства
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="relative overflow-hidden rounded-[28px] border border-[#eddfd7] bg-white p-6 shadow-[0_12px_40px_rgba(86,57,42,0.06)]">
                  <span className="absolute right-5 top-3 text-5xl font-black tracking-[-0.08em] text-[#F6DED1]" aria-hidden="true">
                    {step.number}
                  </span>
                  <h3 className="relative z-10 mt-10 max-w-[85%] text-lg font-bold text-[#25211f]">{step.title}</h3>
                  <p className="relative z-10 mt-3 text-sm leading-relaxed text-[#6b625d]">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-[#24201e] px-6 py-10 text-white sm:px-10 md:py-14 lg:px-14">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0A481]">Стать партнёром</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">
                  Расскажите о себе и своём аккаунте
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
                  В анкете мы попросим ссылку на страницу, данные об аудитории и ваши
                  условия. Заполнение займёт несколько минут. Если увидим подходящий
                  формат, команда свяжется с вами по указанным контактам.
                </p>
              </div>
              <div className="lg:text-right">
                <FormLink className="w-full sm:w-auto" />
                <p className="mt-3 text-center text-xs text-white/45 lg:text-right">Форма откроется в новой вкладке</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
