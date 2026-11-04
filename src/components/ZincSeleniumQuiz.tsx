"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { productMainImage } from "@/lib/productImages";
import type { Product } from "@/lib/products";
import {
  getZincSeleniumQuizLevel,
  zincSeleniumQuizQuestions,
  type ZincSeleniumQuizLevel,
} from "@/lib/zincSeleniumQuiz";
import { useProducts } from "@/store/productStore";

interface ZincSeleniumQuizProps {
  fallbackProduct: Product;
}

const results: Record<ZincSeleniumQuizLevel, { title: string; text: string; tone: string }> = {
  low: {
    title: "Явных факторов риска немного",
    text: "Скорее всего, сейчас достаточно следить за рационом и регулярно добавлять источники цинка и селена из еды. Принимать комплекс «на всякий случай» необязательно.",
    tone: "#64816b",
  },
  medium: {
    title: "Цинка и селена может не хватать",
    text: "По вашим ответам есть несколько признаков, что цинка и селена может не хватать. Можно рассмотреть комплекс «Цинк + Селен» курсом на один месяц.",
    tone: "#c06f43",
  },
  high: {
    title: "Вероятность нехватки выше",
    text: "У вас совпало сразу несколько признаков нехватки цинка и селена. Я бы рассмотрела комплекс курсом на один месяц, если этих минералов нет в других ваших добавках.",
    tone: "#a9523b",
  },
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value) + " ₽";
}

export default function ZincSeleniumQuiz({ fallbackProduct }: ZincSeleniumQuizProps) {
  const { products } = useProducts();
  const product = useMemo(
    () => products.find((item) => item.id === fallbackProduct.id) ?? fallbackProduct,
    [fallbackProduct, products],
  );
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const question = zincSeleniumQuizQuestions[step];
  const selected = answers[question?.id];
  const score = Object.values(answers).reduce((sum, value) => sum + value, 0);
  const level = getZincSeleniumQuizLevel(score);
  const result = results[level];
  const progress = ((step + 1) / zincSeleniumQuizQuestions.length) * 100;

  const scrollToPanel = () => {
    window.requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const start = () => {
    setStarted(true);
    setFinished(false);
    setStep(0);
    scrollToPanel();
  };

  const next = () => {
    if (selected === undefined) return;
    if (step === zincSeleniumQuizQuestions.length - 1) {
      setFinished(true);
    } else {
      setStep((current) => current + 1);
    }
    scrollToPanel();
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setStep(0);
    setAnswers({});
    scrollToPanel();
  };

  if (finished) {
    return (
      <section ref={panelRef} className="scroll-mt-28 overflow-hidden rounded-[30px] border border-[#ead9ce] bg-white shadow-[0_22px_70px_rgba(103,70,50,0.12)]" aria-labelledby="zinc-result-title">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0e7] px-3 py-1.5 text-xs font-bold text-[#8a4b30]">
              <Sparkles size={14} aria-hidden="true" /> Результат теста · {score} из 10
            </div>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em]" style={{ color: result.tone }}>
              {level === "low" ? "0–2 балла" : level === "medium" ? "3–5 баллов" : "6–10 баллов"}
            </p>
            <h2 id="zinc-result-title" className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{result.title}</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#5f5854]">{result.text}</p>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f8f4f0] p-4 text-sm leading-relaxed text-[#665e59]">
              <ShieldCheck className="mt-0.5 shrink-0 text-[#E8845A]" size={20} aria-hidden="true" />
              <p>Результат не является диагнозом или прямой индивидуальной рекомендацией. При беременности, грудном вскармливании, хронических заболеваниях и регулярном приёме лекарств согласуйте добавку со специалистом.</p>
            </div>

            <button type="button" onClick={restart} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-[#6f625b] transition hover:bg-[#f8f1ec] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8845A]">
              <RotateCcw size={17} aria-hidden="true" /> Пройти заново
            </button>
          </div>

          <Link href={`/product/${product.id}`} className="group overflow-hidden rounded-[26px] border border-[#eadfd8] bg-[#fffaf7] transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8845A]">
            <div className="relative aspect-[4/3] bg-[radial-gradient(circle_at_50%_42%,#fff_0%,#fff6ef_48%,#f9dfce_100%)]">
              <Image src={productMainImage(product)} alt={product.name} fill sizes="(min-width: 1024px) 330px, 100vw" className="object-contain p-5 transition duration-500 group-hover:scale-[1.03]" />
              {product.badge && <span className="absolute left-4 top-4 rounded-full bg-[#1d1b1a] px-3 py-1 text-xs font-bold text-white">{product.badge}</span>}
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#E8845A]">Рекомендация Камы</p>
              <h3 className="mt-2 text-lg font-extrabold group-hover:text-[#d76f47]">{product.name}</h3>
              <p className="mt-1 text-sm text-[#756b65]">25 мг цинка · 150 мкг селена · витамин C</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-xl font-extrabold text-[#E8845A]">{formatPrice(product.price)}</span>
                {product.oldPrice && product.oldPrice > product.price && <span className="pb-0.5 text-sm text-[#aaa] line-through">{formatPrice(product.oldPrice)}</span>}
              </div>
              <span className="mt-4 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-5 text-sm font-bold text-white transition group-hover:bg-[#d8734b]">
                Посмотреть комплекс <ArrowRight size={17} aria-hidden="true" />
              </span>
              <p className="mt-3 text-center text-xs text-[#8a817c]">БАД — не является лекарственным средством</p>
            </div>
          </Link>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section ref={panelRef} className="scroll-mt-28 overflow-hidden rounded-[30px] border border-[#ead6ca] bg-[linear-gradient(135deg,#fffaf7_0%,#fff3eb_58%,#f8e5d7_100%)] shadow-[0_22px_70px_rgba(103,70,50,0.12)]" aria-labelledby="zinc-quiz-title">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_270px] lg:p-11">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">Тест нутрициолога · 2 минуты</p>
            <h2 id="zinc-quiz-title" className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight sm:text-3xl">Может ли вам не хватать цинка и селена?</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#625954]">Пять простых вопросов помогут посмотреть на питание и симптомы вместе. В конце вы получите понятный результат и мой комментарий.</p>
            <button type="button" onClick={start} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-6 text-sm font-bold text-white shadow-[0_10px_25px_rgba(232,132,90,0.24)] transition hover:bg-[#d8734b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8845A]">
              Начать тест <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-3" aria-hidden="true">
            <div className="flex h-32 w-28 rotate-[-4deg] flex-col justify-between rounded-[24px] border border-white/80 bg-white p-5 shadow-[0_18px_40px_rgba(95,68,50,0.12)]">
              <span className="text-xs font-bold text-[#9b8b81]">30</span><strong className="text-4xl text-[#c46d45]">Zn</strong><span className="text-xs text-[#8a7e76]">цинк</span>
            </div>
            <div className="mt-8 flex h-32 w-28 rotate-[5deg] flex-col justify-between rounded-[24px] border border-white/80 bg-[#fff9ef] p-5 shadow-[0_18px_40px_rgba(95,68,50,0.12)]">
              <span className="text-xs font-bold text-[#9b8b81]">34</span><strong className="text-4xl text-[#9c7352]">Se</strong><span className="text-xs text-[#8a7e76]">селен</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={panelRef} className="scroll-mt-28 rounded-[30px] border border-[#ead9ce] bg-white p-5 shadow-[0_22px_70px_rgba(103,70,50,0.12)] sm:p-8 lg:p-10" aria-labelledby="zinc-question-title">
      <div className="flex items-center justify-between gap-4 text-xs font-bold text-[#8b7e76]">
        <span>Вопрос {step + 1} из {zincSeleniumQuizQuestions.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f4e9e2]" aria-hidden="true">
        <div className="h-full rounded-full bg-[#E8845A] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mx-auto mt-8 max-w-3xl">
        <h2 id="zinc-question-title" className="text-2xl font-extrabold leading-tight sm:text-3xl">{question.title}</h2>
        {question.note && <p className="mt-3 leading-relaxed text-[#746a64]">{question.note}</p>}
        <div className="mt-6 grid gap-3" role="radiogroup" aria-label={question.title}>
          {question.options.map((option) => {
            const active = selected === option.score;
            return (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.score }))}
                className={`flex min-h-14 items-start gap-3 rounded-2xl border p-4 text-left text-sm leading-relaxed transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8845A] sm:text-base ${active ? "border-[#E8845A] bg-[#fff4ed] text-[#3f3935]" : "border-[#eee2db] bg-[#fdfbf9] text-[#5e5753] hover:border-[#e5b79f] hover:bg-[#fffaf7]"}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#E8845A] bg-[#E8845A] text-white" : "border-[#cfc2ba] bg-white"}`}>
                  {active && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#6f625b] transition hover:bg-[#f8f1ec] disabled:pointer-events-none disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8845A]">
            <ChevronLeft size={18} aria-hidden="true" /> Назад
          </button>
          <button type="button" onClick={next} disabled={selected === undefined} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-6 text-sm font-bold text-white transition hover:bg-[#d8734b] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E8845A]">
            {step === zincSeleniumQuizQuestions.length - 1 ? "Узнать результат" : "Дальше"} <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
