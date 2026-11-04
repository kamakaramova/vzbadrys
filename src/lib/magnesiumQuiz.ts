export type MagnesiumForm = "bisglycinate" | "citrate";

export type MagnesiumQuizAnswers = Record<string, string>;

export interface MagnesiumQuizOption {
  id: string;
  label: string;
  bisglycinate: number;
  citrate: number;
}

export interface MagnesiumQuizQuestion {
  id: string;
  title: string;
  helper?: string;
  companion: "point" | "think" | "heart";
  options: MagnesiumQuizOption[];
}

export const magnesiumQuizQuestions: MagnesiumQuizQuestion[] = [
  {
    id: "goal",
    title: "Что вы хотите изменить в первую очередь?",
    helper: "Выберите одну задачу, которая сейчас беспокоит сильнее остальных.",
    companion: "point",
    options: [
      {
        id: "goal_calm",
        label: "Трудно расслабиться, долго засыпаю, чувствую внутреннее напряжение",
        bisglycinate: 2,
        citrate: 0,
      },
      {
        id: "goal_constipation",
        label: "Есть склонность к запорам, хочется наладить стул",
        bisglycinate: 0,
        citrate: 3,
      },
      {
        id: "goal_muscles",
        label: "Беспокоят мышечное напряжение или судороги",
        bisglycinate: 1,
        citrate: 1,
      },
      {
        id: "goal_general",
        label: "Хочу принимать магний для общей поддержки",
        bisglycinate: 0,
        citrate: 0,
      },
    ],
  },
  {
    id: "stool",
    title: "Какой стул у вас бывает чаще?",
    helper: "Ориентируйтесь на обычную ситуацию за последние несколько недель.",
    companion: "think",
    options: [
      {
        id: "stool_hard",
        label: "Твёрдый, сухой, комочками, приходится тужиться",
        bisglycinate: 0,
        citrate: 2,
      },
      {
        id: "stool_normal",
        label: "Оформленный, без дискомфорта",
        bisglycinate: 0,
        citrate: 0,
      },
      {
        id: "stool_loose",
        label: "Мягкий, неоформленный или есть склонность к диарее",
        bisglycinate: 2,
        citrate: 0,
      },
      {
        id: "stool_alternating",
        label: "То запор, то послабление",
        bisglycinate: 1,
        citrate: 0,
      },
    ],
  },
  {
    id: "frequency",
    title: "Как часто получается сходить в туалет без усилий?",
    companion: "point",
    options: [
      {
        id: "frequency_rare",
        label: "Реже четырёх раз в неделю или бывают перерывы по два дня и больше",
        bisglycinate: 0,
        citrate: 2,
      },
      {
        id: "frequency_regular",
        label: "Почти каждый день или через день, без натуживания",
        bisglycinate: 0,
        citrate: 0,
      },
      {
        id: "frequency_often",
        label: "Несколько раз в день, иногда срочно",
        bisglycinate: 1,
        citrate: 0,
      },
      {
        id: "frequency_varies",
        label: "Каждый раз по-разному",
        bisglycinate: 0,
        citrate: 0,
      },
    ],
  },
  {
    id: "laxative",
    title: "Как вы отнесётесь к возможному лёгкому послаблению стула?",
    helper: "Мы не обещаем этот эффект, но учитываем его при выборе формы.",
    companion: "heart",
    options: [
      {
        id: "lax_helpful",
        label: "Для меня это было бы полезным эффектом",
        bisglycinate: 0,
        citrate: 2,
      },
      {
        id: "lax_unwanted",
        label: "Мне этого точно не нужно, кишечник и так чувствительный",
        bisglycinate: 2,
        citrate: 0,
      },
      {
        id: "lax_neutral",
        label: "Для меня это не имеет значения",
        bisglycinate: 0,
        citrate: 0,
      },
    ],
  },
  {
    id: "sleep",
    title: "Бывает ли, что вечером вы не можете расслабиться и долго не засыпаете?",
    companion: "think",
    options: [
      {
        id: "sleep_often",
        label: "Часто",
        bisglycinate: 2,
        citrate: 0,
      },
      {
        id: "sleep_sometimes",
        label: "Иногда",
        bisglycinate: 1,
        citrate: 0,
      },
      {
        id: "sleep_no",
        label: "Нет, сон сейчас не главная проблема",
        bisglycinate: 0,
        citrate: 0,
      },
    ],
  },
];

export const magnesiumTieBreakerQuestion: MagnesiumQuizQuestion = {
  id: "priority",
  title: "Что для вас важнее в ближайшее время?",
  helper: "По основным ответам обе формы вам близки. Этот выбор определит рекомендацию.",
  companion: "point",
  options: [
    {
      id: "priority_regular",
      label: "Наладить стул",
      bisglycinate: 0,
      citrate: 3,
    },
    {
      id: "priority_calm",
      label: "Легче расслабляться и засыпать",
      bisglycinate: 3,
      citrate: 0,
    },
  ],
};

const allQuestions = [...magnesiumQuizQuestions, magnesiumTieBreakerQuestion];

export function scoreMagnesiumQuiz(
  answers: MagnesiumQuizAnswers,
  includeTieBreaker = true,
) {
  return allQuestions.reduce(
    (score, question) => {
      if (!includeTieBreaker && question.id === magnesiumTieBreakerQuestion.id) {
        return score;
      }

      const selected = question.options.find((option) => option.id === answers[question.id]);
      if (selected) {
        score.bisglycinate += selected.bisglycinate;
        score.citrate += selected.citrate;
      }
      return score;
    },
    { bisglycinate: 0, citrate: 0 },
  );
}

export function needsMagnesiumTieBreaker(answers: MagnesiumQuizAnswers) {
  const score = scoreMagnesiumQuiz(answers, false);
  return Math.abs(score.bisglycinate - score.citrate) <= 2;
}

export function resolveMagnesiumForm(answers: MagnesiumQuizAnswers): MagnesiumForm {
  const score = scoreMagnesiumQuiz(answers);
  return score.citrate > score.bisglycinate ? "citrate" : "bisglycinate";
}

export function buildMagnesiumReasons(
  answers: MagnesiumQuizAnswers,
  form: MagnesiumForm,
) {
  const reasons: string[] = [];

  if (form === "citrate") {
    if (answers.goal === "goal_constipation") {
      reasons.push("Вы хотите прежде всего наладить регулярность стула.");
    }
    if (answers.stool === "stool_hard") {
      reasons.push("Вы чаще сталкиваетесь с твёрдым стулом и натуживанием.");
    }
    if (answers.frequency === "frequency_rare") {
      reasons.push("Стул бывает реже четырёх раз в неделю или с длительными перерывами.");
    }
    if (answers.laxative === "lax_helpful") {
      reasons.push("Возможное мягкое послабление для вас скорее плюс.");
    }
    if (answers.priority === "priority_regular") {
      reasons.push("При близких результатах вы выбрали регулярность стула главным приоритетом.");
    }
    if (reasons.length < 2) {
      reasons.push("По сумме ответов запрос на поддержку регулярного стула оказался сильнее.");
    }
  } else {
    if (answers.goal === "goal_calm") {
      reasons.push("Ваш главный запрос — легче расслабляться и засыпать.");
    }
    if (answers.stool === "stool_loose") {
      reasons.push("Есть склонность к мягкому или неоформленному стулу.");
    }
    if (answers.stool === "stool_alternating") {
      reasons.push("Работа кишечника нестабильна, поэтому нежелательное послабление лучше не усиливать.");
    }
    if (answers.frequency === "frequency_often") {
      reasons.push("Стул бывает несколько раз в день или возникает срочный позыв.");
    }
    if (answers.laxative === "lax_unwanted") {
      reasons.push("Вы отметили, что послабляющий эффект вам не нужен.");
    }
    if (answers.sleep === "sleep_often" || answers.sleep === "sleep_sometimes") {
      reasons.push("Вечером вам бывает трудно успокоиться и перейти ко сну.");
    }
    if (answers.priority === "priority_calm") {
      reasons.push("При близких результатах вы выбрали расслабление и сон главным приоритетом.");
    }
    if (reasons.length < 2) {
      reasons.push("По сумме ответов вам важнее мягкая для ЖКТ форма без цели послабить стул.");
    }
  }

  return reasons.slice(0, 3);
}
