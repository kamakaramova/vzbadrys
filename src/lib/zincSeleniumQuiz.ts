export interface ZincSeleniumQuizOption {
  label: string;
  score: 0 | 1 | 2;
}

export interface ZincSeleniumQuizQuestion {
  id: string;
  title: string;
  note?: string;
  options: ZincSeleniumQuizOption[];
}

export type ZincSeleniumQuizLevel = "low" | "medium" | "high";

export const zincSeleniumQuizQuestions: ZincSeleniumQuizQuestion[] = [
  {
    id: "food",
    title: "Как часто вы едите мясо, рыбу или морепродукты?",
    note: "Именно эти продукты относятся к основным источникам хорошо усваиваемого цинка.",
    options: [
      { label: "Каждый день", score: 0 },
      { label: "Два–три раза в неделю", score: 1 },
      { label: "Реже двух раз в неделю или совсем не ем", score: 2 },
    ],
  },
  {
    id: "digestion",
    title: "Что происходит с пищеварением?",
    options: [
      { label: "Стул стабильный, выраженных жалоб нет", score: 0 },
      { label: "Периодически беспокоят вздутие, нестабильный стул или тяжесть после еды", score: 1 },
      { label: "Проблемы с кишечником постоянные или есть диагностированное заболевание ЖКТ", score: 2 },
    ],
  },
  {
    id: "recovery",
    title: "Как вы восстанавливаетесь после простуд и повреждений кожи?",
    options: [
      { label: "Обычно болею редко и восстанавливаюсь в привычные сроки", score: 0 },
      { label: "Стала болеть чаще или дольше прихожу в себя", score: 1 },
      { label: "Частые инфекции сочетаются с медленным заживлением ран или трещин", score: 2 },
    ],
  },
  {
    id: "appearance",
    title: "Есть ли изменения кожи, волос и ногтей?",
    options: [
      { label: "Выраженных изменений нет", score: 0 },
      { label: "Есть один симптом: выпадение волос, ломкость ногтей или проблемная кожа", score: 1 },
      { label: "Несколько симптомов появились одновременно и держатся больше месяца", score: 2 },
    ],
  },
  {
    id: "thyroid",
    title: "Есть ли вопросы к щитовидной железе?",
    options: [
      { label: "Нет диагноза и жалоб", score: 0 },
      { label: "Есть симптомы или изменения в анализах, но причина пока неясна", score: 1 },
      { label: "Есть АИТ или гипотиреоз", score: 2 },
    ],
  },
];

export function getZincSeleniumQuizLevel(score: number): ZincSeleniumQuizLevel {
  if (score <= 2) return "low";
  if (score <= 5) return "medium";
  return "high";
}
