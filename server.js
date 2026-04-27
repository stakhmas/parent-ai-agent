import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PORT = Number(process.env.PORT || 3000);
const MAX_MEMORY_MESSAGES = 8;
const chatMemoryBySession = new Map();
app.use(express.json());
app.use(express.static("public"));

const RED_FLAG_KEYWORDS = [
  "температура 39",
  "высокая температура",
  "судороги",
  "не дышит",
  "тяжело дышит",
  "сильная рвота",
  "обезвоживание",
  "кровь в стуле",
  "вялый",
  "вялость",
  "потеря сознания",
  "синеет",
  "сыпь с температурой"
];

const CLASSIC_PSYCH_SOURCES = [
  {
    author: "Л.С. Выготский",
    title: "Мышление и речь",
    note: "про развитие мышления, речи и роль взрослого в обучении"
  },
  {
    author: "Ж. Пиаже",
    title: "Речь и мышление ребенка",
    note: "про возрастные особенности познания ребенка"
  },
  {
    author: "Джон Боулби",
    title: "Привязанность",
    note: "про базовую потребность в безопасной связи с родителем"
  },
  {
    author: "Дональд Винникотт",
    title: "Маленькие дети и их матери",
    note: "про поддерживающую среду и чувствительность родителя"
  },
  {
    author: "Эрик Эриксон",
    title: "Детство и общество",
    note: "про задачи раннего психосоциального развития"
  },
  {
    author: "Ю.Б. Гиппенрейтер",
    title: "Общаться с ребенком. Как?",
    note: "про уважительную коммуникацию и эмоциональный контакт"
  },
  {
    author: "В.И. Вернадский",
    title: "Научная мысль как планетное явление",
    note: "междисциплинарный научный контекст о человеке и среде"
  }
];

function sourceToLine(source) {
  return `- ${source.author} — "${source.title}" (${source.note})`;
}

function getSourceByAuthor(author) {
  return CLASSIC_PSYCH_SOURCES.find((source) => source.author === author);
}

function pickSourcesByTopic(topicKey) {
  const topicToAuthors = {
    bedtime_tantrums: ["Ю.Б. Гиппенрейтер", "Дональд Винникотт", "Л.С. Выготский"],
    emotional_outbursts: ["Ю.Б. Гиппенрейтер", "Эрик Эриксон", "Дональд Винникотт"],
    night_wakings: ["Джон Боулби", "Дональд Винникотт", "Эрик Эриксон"],
    sleep_onset: ["Джон Боулби", "Ю.Б. Гиппенрейтер", "Ж. Пиаже"],
    daily_routine: ["Л.С. Выготский", "Ж. Пиаже", "Ю.Б. Гиппенрейтер"],
    nutrition_feeding: ["Ж. Пиаже", "Ю.Б. Гиппенрейтер", "Дональд Винникотт"],
    anxiety_adaptation: ["Джон Боулби", "Эрик Эриксон", "Л.С. Выготский"],
    repetitive_self_touch: ["Ю.Б. Гиппенрейтер", "Л.С. Выготский", "Дональд Винникотт"],
    general_sleep: ["Джон Боулби", "Ю.Б. Гиппенрейтер", "Л.С. Выготский"]
  };
  return (topicToAuthors[topicKey] || topicToAuthors.general_sleep)
    .map(getSourceByAuthor)
    .filter(Boolean);
}

function sanitizeProfile(rawProfile) {
  const profile = rawProfile && typeof rawProfile === "object" ? rawProfile : {};
  return {
    childName:
      typeof profile.childName === "string" ? profile.childName.trim().slice(0, 80) : "",
    childAgeMonths:
      typeof profile.childAgeMonths === "string"
        ? profile.childAgeMonths.trim().slice(0, 20)
        : "",
    sleepChallenges:
      typeof profile.sleepChallenges === "string"
        ? profile.sleepChallenges.trim().slice(0, 300)
        : "",
    familyGoal:
      typeof profile.familyGoal === "string" ? profile.familyGoal.trim().slice(0, 300) : "",
    parentStyle:
      typeof profile.parentStyle === "string" ? profile.parentStyle.trim().slice(0, 120) : "",
    locale:
      typeof profile.locale === "string" ? profile.locale.trim().slice(0, 80) : ""
  };
}

function profileSummary(profile) {
  const named =
    profile.childName && profile.childAgeMonths
      ? `${profile.childName}, ${profile.childAgeMonths}`
      : profile.childName || profile.childAgeMonths || "не указан";
  return [
    `Ребенок: ${named}`,
    `Текущие сложности: ${profile.sleepChallenges || "не указаны"}`,
    `Цель семьи: ${profile.familyGoal || "не указана"}`,
    `Стиль родителя: ${profile.parentStyle || "поддерживающий, спокойный"}`,
    `Локаль/контекст семьи: ${profile.locale || "не указан"}`
  ].join("\n");
}

function extractAgeInMonths(ageText) {
  if (typeof ageText !== "string" || !ageText.trim()) {
    return null;
  }
  const normalized = ageText.toLowerCase();
  const match = normalized.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (normalized.includes("год") || normalized.includes("лет")) {
    return value * 12;
  }
  return value;
}

function detectPrimaryTopic(userMessage, profile) {
  const text = `${userMessage} ${profile.sleepChallenges || ""}`.toLowerCase();
  const hasSleepWords =
    text.includes("сон") ||
    text.includes("засып") ||
    text.includes("укладыв") ||
    text.includes("пробужд") ||
    text.includes("просып");
  const hasTantrumWords =
    text.includes("истер") || text.includes("крич") || text.includes("плачет") || text.includes("срывы");

  if (
    text.includes("трогает поп") ||
    text.includes("трогает ягод") ||
    text.includes("трогает промежност") ||
    text.includes("трогает себя") ||
    text.includes("мастурб") ||
    text.includes("навязчив") ||
    text.includes("тереб")
  ) {
    return "repetitive_self_touch";
  }
  if (
    text.includes("еда") ||
    text.includes("не ест") ||
    text.includes("аппетит") ||
    text.includes("питан") ||
    text.includes("кормлен") ||
    text.includes("продукт")
  ) {
    return "nutrition_feeding";
  }
  if (
    text.includes("садик") ||
    text.includes("детсад") ||
    text.includes("разлук") ||
    text.includes("боится") ||
    text.includes("страх") ||
    text.includes("тревож")
  ) {
    return "anxiety_adaptation";
  }
  if (hasTantrumWords && hasSleepWords) {
    return "bedtime_tantrums";
  }
  if (hasTantrumWords) {
    return "emotional_outbursts";
  }
  if (text.includes("пробужд") || text.includes("просып")) {
    return "night_wakings";
  }
  if (text.includes("укладыв") || text.includes("засып")) {
    return "sleep_onset";
  }
  if (text.includes("режим") || text.includes("расписан")) {
    return "daily_routine";
  }
  return "general_sleep";
}

function detectSafetyFlags(text) {
  const normalized = typeof text === "string" ? text.toLowerCase() : "";
  const matched = RED_FLAG_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  return {
    needsAttention: matched.length > 0,
    matchedKeywords: matched
  };
}

function buildTopicPlan(topicKey, profile, userMessage) {
  const child = profile.childName || "ребенок";
  const age = profile.childAgeMonths || "0-3 года";
  const goal = profile.familyGoal || "более спокойные укладывания";
  const challenge = profile.sleepChallenges || userMessage;
  const locale = profile.locale || "вашем ритме семьи";
  const ageMonths = extractAgeInMonths(profile.childAgeMonths);

  const ageHint =
    ageMonths && ageMonths < 12
      ? "Учитывайте короткие окна бодрствования: не тяните укладывание дольше 2.5-3 часов подряд."
      : ageMonths && ageMonths <= 36
        ? "Сохраняйте предсказуемые границы: в этом возрасте ритуал + спокойные правила обычно работают лучше резких запретов."
        : "Держите один и тот же порядок действий каждый вечер 7-10 дней подряд.";

  if (topicKey === "repetitive_self_touch") {
    return {
      explanation: `${child} (${age}) может использовать повторяющееся касание ягодиц/промежности как способ саморегуляции или снятия напряжения. Это может выглядеть как навязчивое действие, особенно если повторяется в похожих ситуациях.`,
      causes: [
        "Незрелость и повышенная чувствительность нервной системы (в быту это часто называют «слабой нервной системой»).",
        "Стресс, тревога, усталость или перегрузка впечатлениями за день.",
        "Сенсорный дискомфорт: тесная одежда, зуд кожи, потливость, раздражение.",
        "Телесные причины: запор, дискомфорт в области промежности, аллергическое раздражение."
      ],
      todaySteps: [
        `В ${locale} отслеживайте 3 триггера в течение 2 дней: когда, где и после чего ${child} начинает это движение.`,
        "Добавьте 2 безопасные замены в моменты напряжения: мяч-антистресс, глубокое давление/объятие, спокойное дыхание 4 цикла.",
        "Снизьте стыжение: без ругани и запретов «прекрати немедленно», вместо этого мягко переключайте в нейтральное действие.",
        "Проверьте базовый комфорт тела сегодня: кожа, белье, запор, гигиена, раздражение."
      ],
      plan3Days: [
        "День 1: ведите дневник эпизодов (время, длительность, триггер).",
        "День 2: внедрите один стабильный ритуал переключения перед сном и после детсада.",
        "День 3: оцените, сократилась ли частота, и решите, нужен ли очный педиатр/детский невролог/психолог."
      ],
      whenDoctor: [
        "Если действие усиливается, мешает сну/саду/игре, сопровождается болью, зудом, воспалением.",
        "Если есть резкие изменения поведения, тревога, регресс навыков или самоповреждение."
      ],
      ageHint
    };
  }

  if (topicKey === "nutrition_feeding") {
    return {
      todaySteps: [
        `Для ${child} (${age}) сегодня оставьте 3 приема еды + 2 перекуса в одинаковое время, без постоянных "докармливаний".`,
        "На каждый прием ставьте 1 знакомый продукт + 1 новый микро-кусочек (без давления «съешь обязательно»).",
        "Ограничьте длительность приема пищи до 20-25 минут и завершайте спокойно, даже если съел мало.",
        `В ${locale} фиксируйте не «сколько съел», а «что попробовал» — так снижается конфликт вокруг еды.`
      ],
      whyItFits: [
        `Сложность семьи: "${challenge}".`,
        `Цель "${goal}" чаще достигается через предсказуемую структуру, а не через уговоры и торг.`,
        `${child} получает безопасный контакт с новой едой без стыда и давления.`
      ],
      plan3Days: [
        "День 1: стабилизируйте расписание приемов пищи и уберите перекусы между ними.",
        "День 2: добавьте 1 новый продукт в мини-дозе рядом со знакомым.",
        "День 3: повторите тот же новый продукт снова (без принуждения) и отметьте реакцию."
      ],
      ageHint
    };
  }

  if (topicKey === "anxiety_adaptation") {
    return {
      todaySteps: [
        `Перед садом/разлукой с ${child} используйте короткий ритуал 3 минуты: объятие, фраза-поддержка, понятный план возвращения.`,
        "Не затягивайте прощание: одна теплая последовательность и спокойный выход без многократных возвратов.",
        "После садика дайте 15 минут «тихого контакта» без вопросов-допроса, чтобы нервная система восстановилась.",
        `В ${locale} повторяйте одну и ту же фразу безопасности каждый день: «Ты в безопасности, я вернусь после ...».`
      ],
      whyItFits: [
        `Текущая трудность: "${challenge}".`,
        `Цель "${goal}" лучше достигается через предсказуемость разлуки и восстановления, а не через длинные объяснения.`,
        `${child} (${age}) получает повторяемый сценарий, который снижает тревогу.`
      ],
      plan3Days: [
        "День 1: введите постоянный ритуал прощания (одинаковые слова и последовательность).",
        "День 2: согласуйте с воспитателем короткий ритуал входа в группу.",
        "День 3: оцените интенсивность тревоги по шкале 1-10 и закрепите, что сработало."
      ],
      ageHint
    };
  }

  if (topicKey === "emotional_outbursts") {
    return {
      todaySteps: [
        `При вспышке эмоций у ${child} сначала снижайте интенсивность (тон ниже, 2-3 короткие фразы, минимум слов).`,
        "После успокоения называйте чувство и границу: «Ты злишься, я рядом; бить нельзя, можно топнуть/сжать подушку».",
        "Подготовьте 2 заранее оговоренных способа разрядки (дыхание, мять подушку, вода, тихий уголок).",
        `В ${locale} повторяйте одну модель реакции всей семьей, чтобы ребенок не получал противоречивые сигналы.`
      ],
      whyItFits: [
        `Семейный запрос: "${challenge}".`,
        `Цель "${goal}" достигается быстрее, когда родитель стабилен и последователен в реакциях.`,
        `${child} (${age}) учится саморегуляции через повторяемые сценарии, а не через наказание.`
      ],
      plan3Days: [
        "День 1: определите 2 частых триггера и заранее план реакции на них.",
        "День 2: отработайте короткую фразу-границу и способ разрядки.",
        "День 3: отметьте, уменьшились ли длительность и сила вспышек."
      ],
      ageHint
    };
  }

  if (topicKey === "bedtime_tantrums") {
    return {
      todaySteps: [
        `За 90 минут до сна уберите яркий свет и активные игры, оставьте 2 спокойных действия на выбор ${child}.`,
        "Сделайте короткий ритуал 12 минут: вода/ванна (3 мин) → пижама (2 мин) → книга/объятие (7 мин).",
        "В момент истерики: сядьте на уровень глаз, 4 медленных вдоха вместе, повторяйте одну фразу: \"Я рядом, помогаю успокоиться\".",
        `В ${locale} закрепите одинаковое время старта ритуала 3 вечера подряд, с допуском не больше 15 минут.`
      ],
      whyItFits: [
        `Точка боли семьи: "${challenge}".`,
        `Цель "${goal}" достигается быстрее, когда вечер становится предсказуемым, а не "переговорным".`,
        `${child} (${age}) получает понятные шаги и меньше триггеров на переключениях.`
      ],
      plan3Days: [
        "День 1: измерьте время начала истерики и сократите активные стимулы за 90 минут до сна.",
        "День 2: добавьте визуальную мини-последовательность из 3 карточек (ванна → книга → сон).",
        "День 3: закрепите одну реакцию родителя на протест без смены тактики каждые 30 секунд."
      ],
      ageHint
    };
  }

  if (topicKey === "night_wakings") {
    return {
      todaySteps: [
        `Проверьте последнее бодрствование: сократите его на 15-20 минут, если ${child} засыпает перевозбужденным.`,
        "Ночью используйте один и тот же сценарий 3-5 минут: тихий голос, минимум света, без новых стимулов.",
        "Перед сном добавьте 8-10 минут \"тихого контакта\" (книга/поглаживание), чтобы снизить тревожные пробуждения.",
        `Зафиксируйте 2 пробуждения по времени и реакцию семьи в ${locale}, чтобы на 2-й день убрать лишние действия.`
      ],
      whyItFits: [
        `Семья отмечает: "${challenge}".`,
        `Цель "${goal}" требует не "идеальной ночи", а последовательной реакции на одинаковые пробуждения.`,
        `${child} (${age}) получает стабильный сигнал "ночь = спокойно и коротко".`
      ],
      plan3Days: [
        "День 1: ведите короткий лог пробуждений (время + длительность + реакция).",
        "День 2: оставьте только один ночной сценарий успокоения без смены подхода.",
        "День 3: сдвиньте ритуал на 10-15 минут раньше, если есть частое пробуждение в первые 1-2 часа сна."
      ],
      ageHint
    };
  }

  if (topicKey === "daily_routine") {
    return {
      todaySteps: [
        `Определите якоря дня для ${child}: подъем, дневной сон, старт вечернего ритуала.`,
        "Делайте переходы по таймеру: предупреждение за 5 минут + мягкий сигнал смены активности.",
        "Сократите хаотичные перекусы за 2 часа до сна, чтобы стабилизировать вечернее поведение.",
        `Пропишите семейный минимум на сегодня в ${locale}: одно и то же время сна ±20 минут.`
      ],
      whyItFits: [
        `Сложность семьи: "${challenge}".`,
        `Цель "${goal}" легче достичь через стабильные якоря, а не через разовые меры.`,
        `${child} (${age}) быстрее адаптируется, когда день предсказуем по 2-3 опорным точкам.`
      ],
      plan3Days: [
        "День 1: зафиксируйте текущие окна бодрствования и время вечернего спада.",
        "День 2: выровняйте начало ритуала до постоянного времени.",
        "День 3: оцените, снизились ли протесты и время засыпания."
      ],
      ageHint
    };
  }

  return {
    todaySteps: [
      `Выберите одну цель на вечер для ${child} (${age}): спокойное засыпание без спешки.`,
      "Сделайте короткий ритуал 10-15 минут и повторите его в том же порядке.",
      "Снизьте стимуляцию за 60 минут до сна и оставьте один способ успокоения на 3-5 минут.",
      `Запишите, что сработало именно в ${locale}, чтобы повторить это завтра без импровизации.`
    ],
    whyItFits: [
      `Семейный запрос: "${challenge}".`,
      `Цель "${goal}" требует повторяемости, а не идеального вечера с первого раза.`,
      `${child} получает безопасный и предсказуемый сценарий завершения дня.`
    ],
    plan3Days: [
      "День 1: закрепите порядок из 3 шагов перед сном.",
      "День 2: проверьте время старта ритуала и уберите лишние раздражители.",
      "День 3: сохраните лучший вариант и добавьте только одно маленькое улучшение."
    ],
    ageHint
  };
}

function getTopicInstruction(topicKey) {
  if (topicKey === "repetitive_self_touch") {
    return [
      "Структура ответа для этой темы:",
      "1) Что это может быть (объясни явление первым блоком).",
      "2) Возможные причины: отдельно перечисли нервную незрелость/чувствительность, стресс, сенсорный дискомфорт, телесные причины.",
      "3) Что делать дома в ближайшие 7 дней: конкретные шаги.",
      "4) Когда очно к врачу.",
      "5) Психологические источники.",
      "Важно: не утверждай, что причина только одна; формулируй как вероятные факторы."
    ].join("\n");
  }

  return [
    "Структура ответа (всегда):",
    "1) Что сделать сегодня (10-20 минут) — 3-5 конкретных шагов.",
    "2) Почему это подходит именно вам — короткая персонализация под профиль.",
    "3) План на 3 дня — маленькие реалистичные изменения.",
    "4) Красные флаги — когда нужно обратиться к врачу.",
    "5) Психологические источники — 2-3 пункта."
  ].join("\n");
}

function systemPrompt(profile, topicKey) {
  const sourcesList = CLASSIC_PSYCH_SOURCES.map(sourceToLine).join("\n");
  return `Ты — персональный помощник для родителей детей 0-3 лет.
Твоя задача: дать практичный, спокойный и персонализированный ответ под конкретную семью.
Не ставь диагнозы и не назначай лечение.
Если есть тревожные симптомы — мягко предложи обратиться к педиатру.

Профиль семьи:
${profileSummary(profile)}

${getTopicInstruction(topicKey)}

Обязательно:
- Используй минимум 3 конкретных факта из профиля/контекста (имя, возраст, цель, сложность, локаль, прошлый вопрос).
- Добавляй конкретику (минуты, порядок шагов, временные окна), избегай расплывчатых формулировок.
- Не давай общий текст без привязки к семье.

Опирайся на классические и проверенные источники:
${sourcesList}

Если упоминаешь Вернадского, явно помечай как междисциплинарный источник (не клиническая психология).

Пиши на русском, ясно, без воды, с эмпатией.`;
}

function ensureSourcesBlock(reply, topicKey) {
  if (typeof reply !== "string") {
    return "";
  }
  if (reply.toLowerCase().includes("психологические источники")) {
    return reply;
  }
  const sources = pickSourcesByTopic(topicKey);
  return `${reply.trim()}\n\nПсихологические источники:\n${sources.map(sourceToLine).join("\n")}`;
}

function buildMockReply(userMessage, profile, memory, safety) {
  const topicKey = detectPrimaryTopic(userMessage, profile);
  const plan = buildTopicPlan(topicKey, profile, userMessage);
  const sourcesBlock = pickSourcesByTopic(topicKey).map(sourceToLine).join("\n");
  const lastUserMessage =
    memory
      .slice()
      .reverse()
      .find((entry) => entry.role === "user" && typeof entry.content === "string")
      ?.content || "";
  const continuityHint = lastUserMessage
    ? `\nКонтекст из прошлого вопроса: "${lastUserMessage}".`
    : "";
  const urgentNote = safety.needsAttention
    ? "\nВНИМАНИЕ: есть признаки, которые требуют очной оценки врача. При ухудшении состояния или выраженных симптомах обратитесь за срочной медицинской помощью.\n"
    : "";

  if (topicKey === "repetitive_self_touch") {
    return `Похоже, сейчас включен локальный mock-режим (без OpenAI API ключа).

Вопрос: "${userMessage}"
${continuityHint}
${urgentNote}

Что это может быть:
${plan.explanation}

Возможные причины:
${plan.causes.map((line) => `- ${line}`).join("\n")}

Что делать дома в ближайшие 7 дней:
${plan.todaySteps.map((step, index) => `${index + 1}) ${step}`).join("\n")}

План на 3 дня:
${plan.plan3Days.map((line) => `- ${line}`).join("\n")}

Когда очно к врачу:
${plan.whenDoctor.map((line) => `- ${line}`).join("\n")}

Психологические источники:
${sourcesBlock}`;
  }

  return `Похоже, сейчас включен локальный mock-режим (без OpenAI API ключа).

Вопрос: "${userMessage}"
${continuityHint}
${urgentNote}

Что сделать сегодня (10-20 минут):
${plan.todaySteps.map((step, index) => `${index + 1}) ${step}`).join("\n")}

Почему это подходит именно вам:
- ${plan.whyItFits.join("\n- ")}
- Возрастная поправка: ${plan.ageHint}

План на 3 дня:
${plan.plan3Days.map((line) => `- ${line}`).join("\n")}

Красные флаги:
- высокая температура, вялость, необычный плач или отказ от питья — обратиться к педиатру.

Психологические источники:
${sourcesBlock}`;
}

function normalizeSessionId(value) {
  if (typeof value !== "string") {
    return "default-session";
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : "default-session";
}

function normalizeHistory(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.filter(
    (msg) =>
      msg &&
      (msg.role === "user" || msg.role === "assistant") &&
      typeof msg.content === "string" &&
      msg.content.trim()
  );
}

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message;
    if (typeof userMessage !== "string" || !userMessage.trim()) {
      return res.status(400).json({
        error: "Field \"message\" must be a non-empty string."
      });
    }
    const sessionId = normalizeSessionId(req.body?.sessionId);
    const profile = sanitizeProfile(req.body?.profile);
    const memory = normalizeHistory(chatMemoryBySession.get(sessionId));
    const safety = detectSafetyFlags(userMessage);
    const topicKey = detectPrimaryTopic(userMessage, profile);
    const topicPlan = buildTopicPlan(topicKey, profile, userMessage);

    if (!OPENAI_API_KEY) {
      const mockReply = buildMockReply(userMessage, profile, memory, safety);
      const updated = [...memory, { role: "user", content: userMessage }, { role: "assistant", content: mockReply }].slice(
        -MAX_MEMORY_MESSAGES
      );
      chatMemoryBySession.set(sessionId, updated);
      return res.json({
        mode: "mock",
        reply: mockReply,
        safety,
        topic: topicKey
      });
    }

    const previousUserQuestion =
      memory
        .slice()
        .reverse()
        .find((entry) => entry.role === "user")
        ?.content || "нет";
    const personalizationContext = [
      `Тема запроса: ${topicKey}`,
      `Прошлый вопрос в этой сессии: ${previousUserQuestion}`,
      `Текущая сложность: ${profile.sleepChallenges || "не указана"}`,
      `Цель семьи: ${profile.familyGoal || "не указана"}`,
      `Локаль: ${profile.locale || "не указана"}`,
      `Возрастная поправка: ${topicPlan.ageHint || "не указана"}`
    ].join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt(profile, topicKey)
          },
          {
            role: "system",
            content: `Персональный контекст (обязательно встроить в ответ):\n${personalizationContext}`
          },
          ...(safety.needsAttention
            ? [
                {
                  role: "system",
                  content:
                    "Пользователь описывает потенциально тревожные симптомы. Начни ответ с короткого блока осторожности и порекомендуй очно обратиться к врачу при ухудшении."
                }
              ]
            : []),
          ...memory,
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.5
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API request failed."
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({
        error: "OpenAI API returned an unexpected response format."
      });
    }
    const enrichedReply = ensureSourcesBlock(reply, topicKey);

    const updated = [...memory, { role: "user", content: userMessage }, { role: "assistant", content: enrichedReply }].slice(
      -MAX_MEMORY_MESSAGES
    );
    chatMemoryBySession.set(sessionId, updated);

    return res.json({ reply: enrichedReply, safety, topic: topicKey });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/api", (_req, res) => {
  res.json({
    name: "Parent AI Agent API",
    status: "running",
    endpoints: {
      ui: "GET /",
      api: "GET /api",
      health: "GET /health",
      chat: "POST /chat"
    },
    features: {
      personalization: true,
      sessionMemory: true,
      sourceCitations: true
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
