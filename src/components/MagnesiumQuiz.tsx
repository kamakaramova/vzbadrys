"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, RotateCcw, Sparkles } from "lucide-react";
import {
  buildMagnesiumReasons,
  magnesiumQuizQuestions,
  magnesiumTieBreakerQuestion,
  needsMagnesiumTieBreaker,
  resolveMagnesiumForm,
  type MagnesiumForm,
  type MagnesiumQuizAnswers,
  type MagnesiumQuizQuestion,
} from "@/lib/magnesiumQuiz";
import styles from "./MagnesiumQuiz.module.css";

export interface MagnesiumQuizProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: string;
  howToTake: string;
}

interface MagnesiumQuizProps {
  products: Record<MagnesiumForm, MagnesiumQuizProduct>;
}

const companionCopy: Record<
  string,
  { image: string; phrase: string; alt: string }
> = {
  start: {
    image: "/mini-kama/wave.png",
    phrase: "Привет! Здесь нет правильных ответов. Выбирайте то, что чаще бывает именно у вас.",
    alt: "Мини-Кама приветствует перед началом теста",
  },
  goal: {
    image: "/mini-kama/point.png",
    phrase: "Сначала определим главную задачу. Если беспокоит сразу всё, выберите самое заметное.",
    alt: "Мини-Кама обращает внимание на главный вопрос",
  },
  stool: {
    image: "/mini-kama/think.png",
    phrase: "Вспомните не один случайный день, а то, как кишечник ведёт себя обычно.",
    alt: "Мини-Кама задумалась над ответом",
  },
  frequency: {
    image: "/mini-kama/point.png",
    phrase: "Частота и консистенция стула — разные вещи. Поэтому уточняю отдельно.",
    alt: "Мини-Кама поясняет важную деталь",
  },
  laxative: {
    image: "/mini-kama/heart.png",
    phrase: "Если послабление вам не нужно, это действительно влияет на выбор формы.",
    alt: "Мини-Кама поддерживает выбор ответа",
  },
  sleep: {
    image: "/mini-kama/think.png",
    phrase: "Сон учитываем, но не делаем по нему вывод в одиночку.",
    alt: "Мини-Кама помогает оценить сон",
  },
  priority: {
    image: "/mini-kama/point.png",
    phrase: "Обе формы вам близки. Осталось выбрать задачу, которая сейчас важнее.",
    alt: "Мини-Кама помогает сделать финальный выбор",
  },
  complete: {
    image: "/mini-kama/celebrate.png",
    phrase: "Готово! Ниже объясняю, почему получился именно этот вариант.",
    alt: "Мини-Кама радуется завершению теста",
  },
};

const resultCopy: Record<
  MagnesiumForm,
  { eyebrow: string; explanation: string; accent: string }
> = {
  bisglycinate: {
    eyebrow: "Мягкая форма для чувствительного ЖКТ и вечернего расслабления",
    explanation:
      "По вашим ответам важнее избежать нежелательного послабления и поддержать спокойное переключение ко сну. Поэтому из двух вариантов вам больше подходит бисглицинат.",
    accent: "#9c5570",
  },
  citrate: {
    eyebrow: "Форма для тех, кому важна регулярность стула",
    explanation:
      "По вашим ответам запрос на регулярный, более мягкий стул оказался сильнее. Поэтому из двух вариантов вам больше подходит цитрат магния с витамином B6.",
    accent: "#d46f45",
  },
};

function MiniKama({ state }: { state: keyof typeof companionCopy }) {
  const companion = companionCopy[state];
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <aside
      className="pointer-events-none order-first grid grid-cols-[92px_minmax(0,1fr)] items-end gap-3 md:order-none md:flex md:flex-col md:items-center md:justify-end"
      aria-live="polite"
    >
      <div className="relative order-2 rounded-[22px_22px_8px_22px] border border-[#f2d5c5] bg-white/95 px-4 py-3 text-sm leading-relaxed text-[#5d4a42] shadow-[0_12px_35px_rgba(138,87,60,0.12)] md:order-1 md:w-full">
        {companion.phrase}
        <span className="absolute -bottom-2 left-7 h-4 w-4 rotate-45 border-b border-r border-[#f2d5c5] bg-white md:left-1/2 md:-translate-x-1/2" />
      </div>
      <div className="order-1 flex min-h-[116px] items-end justify-center md:order-2 md:min-h-[250px]">
        {imageFailed ? (
          <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-[#FDDCCA] text-sm font-bold text-[#8b4513] md:h-28 md:w-28">
            Кама
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={companion.image}
            src={companion.image}
            alt={companion.alt}
            onError={() => setImageFailed(true)}
            className={`${styles.miniKamaImage} max-h-[122px] w-auto object-contain md:max-h-[270px]`}
          />
        )}
      </div>
    </aside>
  );
}

export default function MagnesiumQuiz({ products }: MagnesiumQuizProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<MagnesiumQuizAnswers>({});
  const [showTieBreaker, setShowTieBreaker] = useState(false);
  const [result, setResult] = useState<MagnesiumForm | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const question: MagnesiumQuizQuestion = showTieBreaker
    ? magnesiumTieBreakerQuestion
    : magnesiumQuizQuestions[step];
  const selectedAnswer = answers[question.id];
  const displayStep = showTieBreaker ? 6 : step + 1;
  const progress = showTieBreaker ? 100 : ((step + 1) / magnesiumQuizQuestions.length) * 100;

  const reasons = useMemo(
    () => (result ? buildMagnesiumReasons(answers, result) : []),
    [answers, result],
  );

  const scrollToPanel = () => {
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const startQuiz = () => {
    setStarted(true);
    setStep(0);
    scrollToPanel();
  };

  const showResult = () => {
    setResult(resolveMagnesiumForm(answers));
    scrollToPanel();
  };

  const goNext = () => {
    if (!selectedAnswer) return;

    if (showTieBreaker) {
      showResult();
      return;
    }

    if (step === magnesiumQuizQuestions.length - 1) {
      if (needsMagnesiumTieBreaker(answers)) {
        setShowTieBreaker(true);
      } else {
        showResult();
      }
      scrollToPanel();
      return;
    }

    setStep((current) => current + 1);
    scrollToPanel();
  };

  const goBack = () => {
    if (showTieBreaker) {
      setShowTieBreaker(false);
      setStep(magnesiumQuizQuestions.length - 1);
      return;
    }
    setStep((current) => Math.max(0, current - 1));
  };

  const restart = () => {
    setStarted(false);
    setStep(0);
    setAnswers({});
    setShowTieBreaker(false);
    setResult(null);
    scrollToPanel();
  };

  if (result) {
    const product = products[result];
    const copy = resultCopy[result];

    return (
      <section ref={panelRef} className="scroll-mt-32" aria-labelledby="quiz-result-title">
        <div className={`${styles.quizPanel} overflow-hidden rounded-[32px] border border-[#efd8cb] shadow-[0_24px_70px_rgba(110,66,42,0.13)]`}>
          <div className="grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_220px] md:p-10">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#FDDCCA] px-3 py-1.5 text-xs font-bold text-[#7c3d25]">
                <Sparkles size={14} aria-hidden="true" /> Результат теста
              </div>
              <p className="mb-2 text-sm font-semibold" style={{ color: copy.accent }}>
                {copy.eyebrow}
              </p>
              <h2 id="quiz-result-title" className="max-w-xl text-2xl font-extrabold leading-tight sm:text-3xl">
                Вам больше всего подойдёт {product.name}
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-[#5f5a57]">{copy.explanation}</p>
            </div>
            <MiniKama state="complete" />
          </div>

          <div className="border-t border-[#efd8cb] bg-white p-5 sm:p-8 md:p-10">
            <div className="grid items-start gap-7 lg:grid-cols-[310px_minmax(0,1fr)]">
              <Link
                href={`/product/${product.id}`}
                className="group overflow-hidden rounded-[28px] border border-[#eee4df] bg-white shadow-[0_16px_45px_rgba(74,45,31,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(74,45,31,0.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/30"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-[#fffaf7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} className="h-full w-full object-contain p-6" />
                  {product.badge && (
                    <span className="absolute left-4 top-4 rounded-full bg-[#1a1a1a] px-3 py-1.5 text-xs font-bold text-white">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="text-lg font-extrabold transition-colors group-hover:text-[#E8845A]">{product.name}</p>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#f0e8e0] pt-4">
                    <div>
                      <span className="text-xl font-black text-[#E8845A]">{product.price.toLocaleString("ru-RU")} ₽</span>
                      {product.oldPrice && (
                        <span className="ml-2 text-sm text-[#aaa] line-through">{product.oldPrice.toLocaleString("ru-RU")} ₽</span>
                      )}
                    </div>
                    <ArrowRight className="text-[#E8845A] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </div>
              </Link>

              <div>
                <h3 className="text-xl font-extrabold">Почему получился такой результат</h3>
                <ul className="mt-4 space-y-3">
                  {reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-3 rounded-2xl bg-[#fdf8f5] px-4 py-3 text-sm leading-relaxed text-[#554d49]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8845A] text-white">
                        <Check size={13} aria-hidden="true" />
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-3xl border border-[#f0cdbb] bg-[#fff6f1] p-5">
                  <p className="text-sm font-extrabold text-[#8b4513]">Рекомендация Камы</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5d514b]">
                    По инструкции к продукту: {product.howToTake}
                  </p>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-[#8a817c]">
                  Тест помогает выбрать форму, но не заменяет индивидуальную консультацию. При заболеваниях почек, беременности или грудном вскармливании, а также при регулярном приёме лекарств согласуйте добавку и дозировку со специалистом.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/product/${product.id}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d4703f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/30"
                  >
                    Посмотреть этот магний <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={restart}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#dfcfc7] bg-white px-6 py-3 text-sm font-bold text-[#5f514a] transition hover:border-[#E8845A] hover:text-[#E8845A] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/20"
                  >
                    <RotateCcw size={16} aria-hidden="true" /> Пройти ещё раз
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section ref={panelRef} className="scroll-mt-32" aria-labelledby="quiz-start-title">
        <div className={`${styles.quizPanel} grid overflow-hidden rounded-[32px] border border-[#efd8cb] p-5 shadow-[0_24px_70px_rgba(110,66,42,0.13)] sm:p-8 md:grid-cols-[minmax(0,1fr)_220px] md:p-10`}>
          <div className="self-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#E8845A]">5 вопросов · около 2 минут</p>
            <h2 id="quiz-start-title" className="max-w-xl text-2xl font-extrabold leading-tight sm:text-3xl">
              Подберём форму магния под вашу главную задачу
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-[#625b57]">
              В конце вы получите одну рекомендацию, объяснение выбора и карточку подходящего продукта.
            </p>
            <button
              type="button"
              onClick={startQuiz}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-7 py-3 text-sm font-bold text-white shadow-[0_10px_25px_rgba(232,132,90,0.26)] transition hover:-translate-y-0.5 hover:bg-[#d4703f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/30"
            >
              Начать тест <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <MiniKama state="start" />
        </div>
      </section>
    );
  }

  return (
    <section ref={panelRef} className="scroll-mt-32" aria-labelledby="quiz-question-title">
      <div className={`${styles.quizPanel} overflow-hidden rounded-[32px] border border-[#efd8cb] shadow-[0_24px_70px_rgba(110,66,42,0.13)]`}>
        <div className="border-b border-[#eaded7] px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-[#81736b]">
            <span>{showTieBreaker ? "Дополнительный вопрос" : `Вопрос ${displayStep} из 5`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-[#f2e5de]"
            role="progressbar"
            aria-label="Прогресс теста"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div className="h-full rounded-full bg-gradient-to-r from-[#E8845A] to-[#f5b898] transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid gap-7 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_220px] md:p-10">
          <div>
            <h2 id="quiz-question-title" className="text-2xl font-extrabold leading-tight sm:text-3xl">
              {question.title}
            </h2>
            {question.helper && <p className="mt-3 text-sm leading-relaxed text-[#716863]">{question.helper}</p>}

            <div className="mt-7 space-y-3" role="radiogroup" aria-label={question.title}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                    className={`${styles.answerButton} flex min-h-14 w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-semibold leading-relaxed transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/20 ${
                      isSelected
                        ? "border-[#E8845A] bg-[#fff2eb] text-[#7a3c23] shadow-[0_8px_24px_rgba(232,132,90,0.13)]"
                        : "border-[#eadfd9] bg-white text-[#413b38] hover:border-[#efb497] hover:bg-[#fffaf7]"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#E8845A] bg-[#E8845A] text-white" : "border-[#cdbfb7] bg-white"}`}>
                      {isSelected && <Check size={13} aria-hidden="true" />}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={!showTieBreaker && step === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-[#756860] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/20"
              >
                <ChevronLeft size={17} aria-hidden="true" /> Назад
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedAnswer}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#E8845A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d4703f] disabled:cursor-not-allowed disabled:bg-[#dcc8be] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E8845A]/30"
              >
                {showTieBreaker || step === magnesiumQuizQuestions.length - 1 ? "Показать результат" : "Дальше"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          <MiniKama key={question.id} state={question.id as keyof typeof companionCopy} />
        </div>
      </div>
    </section>
  );
}
