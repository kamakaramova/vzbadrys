import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Какая форма магния подойдёт вам? Тест нутрициолога — взБАДрись",
  description:
    "Ответьте на несколько вопросов и узнайте, какая из двух форм магния лучше соответствует вашей задаче: бисглицинат или цитрат с витамином B6.",
  alternates: { canonical: "/blog/kakoy-magniy-vybrat" },
  openGraph: {
    title: "Какая форма магния подойдёт вам?",
    description:
      "Короткий тест от нутрициолога Камы Карамовой: пять вопросов, понятный результат и объяснение выбора.",
    type: "article",
    url: "/blog/kakoy-magniy-vybrat",
  },
};

export default function MagnesiumQuizLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
