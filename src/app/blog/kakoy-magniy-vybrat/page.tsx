import Link from "next/link";
import { ChevronRight, FlaskConical, ShieldCheck } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MagnesiumQuiz, { type MagnesiumQuizProduct } from "@/components/MagnesiumQuiz";
import { products } from "@/lib/products";
import type { MagnesiumForm } from "@/lib/magnesiumQuiz";

function getQuizProduct(id: string): MagnesiumQuizProduct {
  const product = products.find((item) => item.id === id);

  if (!product) {
    throw new Error(`Quiz product not found: ${id}`);
  }

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    oldPrice: product.oldPrice,
    image: product.images[0],
    badge: product.badge,
    howToTake: product.howToTake,
  };
}

const quizProducts: Record<MagnesiumForm, MagnesiumQuizProduct> = {
  bisglycinate: getQuizProduct("magniy-bisglitinat"),
  citrate: getQuizProduct("magniy-citrat-b6"),
};

export default function MagnesiumQuizPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <article>
          <header className="border-b border-[#f0e8e0] bg-[#fdf8f5]">
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
              <nav className="mb-7 flex flex-wrap items-center gap-1.5 text-xs text-[#93877f]" aria-label="Хлебные крошки">
                <Link href="/" className="transition hover:text-[#E8845A]">Главная</Link>
                <ChevronRight size={13} aria-hidden="true" />
                <Link href="/blog" className="transition hover:text-[#E8845A]">Блог</Link>
                <ChevronRight size={13} aria-hidden="true" />
                <span className="text-[#5f554f]">Тест по магнию</span>
              </nav>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#FDDCCA] px-3 py-1.5 text-xs font-bold text-[#7c3d25]">
                <FlaskConical size={14} aria-hidden="true" /> Тест нутрициолога
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-[-0.02em] sm:text-4xl md:text-5xl">
                Какая форма магния подойдёт именно вам?
              </h1>
              <div className="mt-6 max-w-3xl space-y-3 text-base leading-relaxed text-[#625b57] sm:text-lg">
                <p>
                  Привет! Этот тест подготовила нутрициолог нашей команды Кама Карамова. Он поможет понять, какая из двух форм магния — бисглицинат или цитрат с витамином B6 — больше соответствует вашей главной задаче и особенностям ЖКТ.
                </p>
                <p>
                  Ответьте на несколько простых вопросов и сразу получите результат с объяснением. Это не диагностика, а понятная отправная точка, чтобы не выбирать добавку наугад.
                </p>
              </div>

              <div className="mt-7 flex items-center gap-3 text-sm text-[#756b65]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-black text-[#E8845A] shadow-sm">КК</div>
                <div>
                  <p className="font-bold text-[#403a37]">Кама Карамова</p>
                  <p className="text-xs">Нутрициолог, учёный, мама</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <MagnesiumQuiz products={quizProducts} />

            <section className="mx-auto mt-14 max-w-3xl sm:mt-16" aria-labelledby="why-form-matters">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8845A]">Коротко о выборе</p>
              <h2 id="why-form-matters" className="mt-3 text-2xl font-extrabold sm:text-3xl">Почему форма магния имеет значение</h2>
              <div className="mt-5 space-y-4 leading-relaxed text-[#625b57]">
                <p>
                  Разные формы магния могут по-разному ощущаться со стороны ЖКТ и лучше соответствовать разным задачам. Поэтому в тесте мы смотрим не только на сон или напряжение, но и на регулярность, консистенцию стула и то, нужен ли вам возможный послабляющий эффект.
                </p>
                <p>
                  Результат выбирается только между двумя продуктами из теста. Если есть выраженные симптомы, заболевания почек, беременность, грудное вскармливание или вы регулярно принимаете лекарства, форму и дозировку лучше согласовать со специалистом.
                </p>
              </div>
              <div className="mt-7 flex items-start gap-3 rounded-3xl border border-[#f0d7c9] bg-[#fff8f4] p-5 text-sm leading-relaxed text-[#5e534d]">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#E8845A]" size={21} aria-hidden="true" />
                <p><strong className="text-[#3e3835]">Важно:</strong> тест не ставит диагноз и не заменяет индивидуальную консультацию. Он помогает осознаннее выбрать форму, а схема приёма в результате приводится по инструкции конкретного продукта.</p>
              </div>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
