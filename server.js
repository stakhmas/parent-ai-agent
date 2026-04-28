import "dotenv/config";
import express from "express";
import fetch from "node-fetch";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const app = express();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PORT = Number(process.env.PORT || 3000);
const LEAD_LOG_PATH = process.env.LEAD_LOG_PATH || path.join(process.cwd(), "data", "leads.ndjson");
const utmFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "yclid"];
const leadInbox = [];
const PARENT_COACH_SYSTEM_PROMPT = `You are an AI assistant for parents.
Your role is to give thoughtful, warm, intelligent, practical, and psychologically informed guidance about children, parenting, emotions, behavior, family relationships, routines, and child development.

CORE IDENTITY:
- Respond like an experienced child psychologist + calm parenting coach + supportive human expert.
- Be empathetic, observant, emotionally intelligent, and practical.
- Never sound robotic, generic, cold, or overly formal.

GOAL:
- Help parents feel understood, calmer, and clearer about what to do next.
- Give personalized, nuanced, emotionally mature, and useful answers.

TONE:
- Warm, respectful, calm.
- Reassuring but honest.
- Intelligent and emotionally deep.
- Never judgmental, never shaming, never lecturing.

RESPONSE LOGIC:
1) First understand the real issue under the surface (stress, guilt, fear, exhaustion, overload, uncertainty, regulation issues, family tension).
2) Validate feelings naturally and briefly.
3) Give developmentally smart insight (age behavior, nervous system overload, attachment needs, boundaries, transitions, sensory factors, routine inconsistency, sibling dynamics).
4) Give practical steps with specifics:
   - what to say,
   - what to do today/tonight,
   - what to change this week,
   - what to observe,
   - what to stop doing.
5) Personalize using details from the user message.
6) Add one deeper psychological insight the parent might not have considered.
7) If suitable, structure answer:
   - empathy,
   - what may be happening,
   - what to do now,
   - what to do long-term,
   - when to seek specialist help.
8) If user is distressed: be extra warm, grounding, reduce guilt, offer one simple next step.
9) For child behavior requests, separate:
   - likely normal developmental phase,
   - parenting pattern factors,
   - environmental stressors,
   - signs that need evaluation.

NEVER:
- shame parents,
- diagnose recklessly,
- promise certainty,
- be generic or overly short.

LANGUAGE:
- Reply in the same language as the user.
- If user writes Russian, reply in Russian.

IMPORTANT SAFETY:
- Do not provide medical diagnosis.
- For severe red flags or danger, advise urgent in-person professional help.`;
const BEDTIME_STORY_SYSTEM_PROMPT = `You are a warm, talented children's storyteller, child psychologist, and emotional parenting assistant.

TASK:
Create deeply personalized bedtime stories where the child is the main hero, helping solve emotional or behavioral challenges through a gentle adventure.

GOAL:
- Make story magical, calming, emotionally helpful, meaningful.
- Help with fear of sleeping alone, bedtime resistance, tantrums, daycare adaptation, sibling jealousy, separation anxiety, aggression/biting, potty training, giving up pacifier, confidence, fear of doctors, moving, sadness/anxiety.

INPUTS TO USE OR ASK FOR:
- child name
- age
- gender (if provided)
- current challenge
- favorite animals/characters/themes
- parent preferred tone (funny/magical/calming/brave)
- story length (short/medium/long)

STYLE RULES:
1) Child must be the hero.
2) Warm, magical, safe feeling.
3) Emotional healing naturally integrated.
4) No punishment, fear, shame, scary scenes.
5) Age-appropriate language.
6) Include gentle repetition phrases.
7) Calming bedtime rhythm.
8) End with safety, love, success, sleepiness.
9) Make it feel unique and premium.

PSYCHOLOGY LAYER:
Model bravery, emotional regulation, confidence, independence, kindness, connection, resilience, safe separation, and healthy routines.

STRUCTURE:
1. Greeting opening with child name
2. Small relatable problem
3. Magical journey begins
4. Child discovers inner strength
5. Gentle resolution
6. Calm sleepy ending
7. Loving final line

LANGUAGE:
- Reply in the same language as the user.
- If user writes Russian, reply in Russian.

OUTPUT FORMAT:
Title:
Story:

Optional bonus:
Message for parent:
(brief explanation how this story supports emotional development)

If critical personalization info is missing, ask for it briefly first and offer a default story meanwhile.`;

app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.static("public"));

function detectLanguage(text) {
  return /[а-яё]/i.test(text) ? "ru" : "en";
}

function isStoryRequest(text) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("сказк") ||
    normalized.includes("истори") ||
    normalized.includes("на ночь") ||
    normalized.includes("story") ||
    normalized.includes("bedtime") ||
    normalized.includes("fairy tale")
  );
}

function detectConcernTopic(text) {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("сон") ||
    normalized.includes("засып") ||
    normalized.includes("пробужд") ||
    normalized.includes("sleep") ||
    normalized.includes("bedtime")
  ) {
    return "sleep";
  }
  if (
    normalized.includes("истер") ||
    normalized.includes("крич") ||
    normalized.includes("tantrum") ||
    normalized.includes("meltdown")
  ) {
    return "tantrum";
  }
  if (
    normalized.includes("агресс") ||
    normalized.includes("бьет") ||
    normalized.includes("кусает") ||
    normalized.includes("hits") ||
    normalized.includes("aggress")
  ) {
    return "aggression";
  }
  if (
    normalized.includes("садик") ||
    normalized.includes("школ") ||
    normalized.includes("трев") ||
    normalized.includes("anxiety") ||
    normalized.includes("kindergarten")
  ) {
    return "anxiety";
  }
  return "general";
}

function extractAgeMention(text, language) {
  const ruMatch = text.match(/(\d+)\s*(года|год|лет|месяц|месяца|месяцев)/i);
  if (ruMatch) {
    return ruMatch[0];
  }
  const enMatch = text.match(/(\d+)\s*(year|years|month|months)/i);
  if (enMatch) {
    return enMatch[0];
  }
  return language === "ru" ? "возраст не указан" : "age not specified";
}

function extractChildName(text, language) {
  const ruPatterns = [
    /(?:для|про)\s+(?:девочк[аи]|мальчик[аи]|реб[её]нк[аи]|сын[аи]?|дочк[аи]?)\s+([А-ЯЁ][а-яё]+)/i,
    /(?:ребенок|ребёнок|дочка|дочь|сын|малыш|малышка|имя)\s+([А-ЯЁ][а-яё]+)/i
  ];
  const enPatterns = [
    /(?:for)\s+(?:a\s+)?(?:girl|boy|child|daughter|son)\s+([A-Z][a-z]+)/,
    /(?:child|daughter|son|name)\s+([A-Z][a-z]+)/
  ];
  const patterns = language === "ru" ? ruPatterns : enPatterns;
  const match = patterns.map((pattern) => text.match(pattern)).find(Boolean);
  if (match?.[1]) {
    return normalizeChildName(match[1], language);
  }
  return language === "ru" ? "малыш" : "little one";
}

function normalizeChildName(rawName, language) {
  const name = cleanText(rawName, 40);
  if (!name || language !== "ru") {
    return name;
  }
  const lower = name.toLowerCase();
  if (lower.endsWith("ии")) {
    return `${name.slice(0, -2)}ия`;
  }
  if (lower.endsWith("ы") || lower.endsWith("и") || lower.endsWith("у")) {
    return `${name.slice(0, -1)}а`;
  }
  if (lower.endsWith("е")) {
    return `${name.slice(0, -1)}я`;
  }
  return name;
}

function detectChildGender(text, language, childName) {
  const normalized = text.toLowerCase();
  if (language === "ru") {
    if (/(девочк|дочка|дочь|малышка)/i.test(normalized)) {
      return "female";
    }
    if (/(мальчик|сын|сыночек|малыш)/i.test(normalized)) {
      return "male";
    }
    if (/[ая]$/.test(childName.toLowerCase())) {
      return "female";
    }
    return "male";
  }
  if (/(girl|daughter)/i.test(normalized)) {
    return "female";
  }
  if (/(boy|son)/i.test(normalized)) {
    return "male";
  }
  return "neutral";
}

function detectStoryTone(text, language) {
  const normalized = text.toLowerCase();
  if (normalized.includes("весел") || normalized.includes("funny")) {
    return language === "ru" ? "веселый" : "funny";
  }
  if (normalized.includes("смел") || normalized.includes("brave")) {
    return language === "ru" ? "смелый" : "brave";
  }
  if (normalized.includes("магич") || normalized.includes("magic")) {
    return language === "ru" ? "магический" : "magical";
  }
  return language === "ru" ? "спокойный" : "calming";
}

function detectStoryLength(text) {
  const normalized = text.toLowerCase();
  if (normalized.includes("длин") || normalized.includes("long")) {
    return "long";
  }
  if (normalized.includes("средн") || normalized.includes("medium")) {
    return "medium";
  }
  if (normalized.includes("корот") || normalized.includes("short")) {
    return "short";
  }
  return "medium";
}

function detectFavoriteCharacter(text, language) {
  const normalized = text.toLowerCase();
  if (normalized.includes("зай") || normalized.includes("rabbit")) {
    return language === "ru" ? "зайчонок" : "little rabbit";
  }
  if (normalized.includes("кот") || normalized.includes("cat")) {
    return language === "ru" ? "котенок" : "kitten";
  }
  if (normalized.includes("диноз") || normalized.includes("dinosaur")) {
    return language === "ru" ? "дружелюбный динозаврик" : "friendly dinosaur";
  }
  if (normalized.includes("единорог") || normalized.includes("unicorn")) {
    return language === "ru" ? "единорожек" : "unicorn";
  }
  return language === "ru" ? "светлячок" : "firefly";
}

function getStoryJourneyTone(tone, language) {
  if (language !== "ru") {
    const map = {
      calming: "gentle and soothing",
      magical: "magical",
      funny: "playful",
      brave: "courage-building"
    };
    return map[tone] || "gentle and soothing";
  }
  const map = {
    спокойный: "тихое и мягкое",
    магический: "волшебное",
    веселый: "игривое и доброе",
    смелый: "смелое и поддерживающее"
  };
  return map[tone] || "тихое и мягкое";
}

function buildMockStory(userMessage) {
  const language = detectLanguage(userMessage);
  const topic = detectConcernTopic(userMessage);
  const childName = extractChildName(userMessage, language);
  const childGender = detectChildGender(userMessage, language, childName);
  const ageHint = extractAgeMention(userMessage, language);
  const tone = detectStoryTone(userMessage, language);
  const length = detectStoryLength(userMessage);
  const favoriteCharacter = detectFavoriteCharacter(userMessage, language);
  const journeyTone = getStoryJourneyTone(tone, language);

  if (language !== "ru") {
    const title = `Title:\n${childName} and the Gentle Moon Bridge`;
    const story = `Story:\nOn a quiet evening, ${childName} (${ageHint}) felt a small worry in their chest before bedtime. Right then, a tiny ${favoriteCharacter} appeared by the pillow and whispered, "Small steps, soft breath, brave heart."\n\nTogether they walked to the Moon Bridge, where every step became easier when ${childName} breathed slowly: "In... and out... in... and out..." Soon ${childName} found their inner lantern of courage and kindness.\n\nWhen a big feeling came, ${childName} put one hand on the heart and said, "I am safe, I am loved, I can do this." The feeling became smaller, like a cloud passing in the night sky.\n\nThat night ended with a warm blanket, a calm body, and sleepy eyes. ${childName} smiled, hugged the ${favoriteCharacter}, and whispered, "Tomorrow I can be brave again."\n\nGood night, little hero. You are loved exactly as you are.`;
    const parent =
      length === "short"
        ? `\n\nMessage for parent:\nThis short story models co-regulation and confidence using repetition, breath cues, and safe-separation language.`
        : `\n\nMessage for parent:\nThis story supports emotional regulation and secure attachment by normalizing big feelings, adding a calming ritual phrase, and ending in safety and success.`;
    return `${title}\n\n${story}${parent}`;
  }

  const challengeLineByTopic = {
    sleep: "перед сном внутри жила тревога, и сердечко начинало стучать чуть быстрее.",
    tantrum: "день был полон больших чувств, и к вечеру эмоции словно вылились наружу.",
    anxiety: "после насыщенного дня рядом особенно хотелось маминого тепла.",
    aggression: "в такой момент важно учиться мягко справляться с сильной злостью.",
    general: "было непросто успокоиться после длинного дня, и внутри жила маленькая тревога."
  };
  const settlesIntoBed = childGender === "female" ? "устроилась" : "устроился";
  const putsHand = childGender === "female" ? "клала" : "клал";
  const smiled = childGender === "female" ? "улыбнулась" : "улыбнулся";
  const whispered = childGender === "female" ? "шепнула" : "шепнул";
  const lovingWord = childGender === "female" ? "Любимая" : "Любимый";
  const sleptWord = childGender === "female" ? "уснула" : "уснул";
  const affirmationLoved = childGender === "female" ? "Я любима" : "Я любим";
  const affirmationCalm = childGender === "female" ? "Вдох — я спокойна" : "Вдох — я спокоен";
  const affirmationBrave = childGender === "female" ? "выдох — я смелая" : "выдох — я смелый";
  const affirmationNotAlone = childGender === "female" ? "вдох — я не одна" : "вдох — я не один";
  const extraMiddle =
    length === "long"
      ? `\nПо дороге они встретили Озеро Тихих Кругов. ${childName} бросал${
          childGender === "female" ? "а" : ""
        } в воду воображаемые камушки-мысли: "Я в безопасности", "Меня любят", "Я справляюсь". Вода отвечала мягкими кругами: "Ш-ш-ш, все хорошо, все хорошо".`
      : "";

  return `Title:
${childName} и Лунный Мост Спокойствия

Story:
В один тихий вечер ${childName} (${ageHint}) ${settlesIntoBed} в кроватке, и вдруг оказалось, что сон спрятался где-то за облаками. Сегодня ${challengeLineByTopic[topic] || challengeLineByTopic.general}

В этот момент из ночника выпорхнул добрый ${favoriteCharacter} и прошептал: "Шаг за шагом, вдох за вдохом, сердечко — в ладошках". И началось ${journeyTone} путешествие.

${childName} вместе со своим волшебным другом — ${favoriteCharacter} — пошли по Лунному Мосту. На каждом шаге нужно было сказать:
"Я в безопасности. ${affirmationLoved}. Я справляюсь".
И с каждым разом плечи становились мягче, дыхание — тише, а глазки — спокойнее.
${extraMiddle}

Когда подкрадывалось волнение, ${childName} ${putsHand} ладошку на грудь и делал${
    childGender === "female" ? "а" : ""
  } три тихих вдоха:
"${affirmationCalm},
${affirmationBrave},
${affirmationNotAlone},
выдох — рядом любовь".

Сон, конечно, услышал этот спокойный ритм и вернулся. В кроватке стало особенно мягко и тепло, а ${favoriteCharacter} сел рядом сторожить добрые сны до утра.

Комната стала очень тихой, очень теплой, очень безопасной.
${childName} ${smiled}, ${whispered}: "У меня получилось", —
и медленно-медленно, сладко-сладко ${sleptWord}.

${lovingWord} ${childName}, ты всегда в любви, в безопасности и в мамино-папином сердце.

Message for parent:
Эта сказка помогает через повторяющиеся фразы, мягкое дыхание и образ "безопасной связи": ребенок проживает тревогу, находит внутреннюю опору и засыпает с чувством защищенности.`;
}

function buildMockReply(userMessage) {
  if (isStoryRequest(userMessage)) {
    return buildMockStory(userMessage);
  }

  const language = detectLanguage(userMessage);
  const topic = detectConcernTopic(userMessage);
  const ageHint = extractAgeMention(userMessage, language);
  if (language !== "ru") {
    return `Local mock mode is active (no OpenAI API key).

I hear how stressful this can feel. You are not overreacting.

What may be happening:
- At this age (${ageHint}), behavior often reflects nervous system overload, not "bad character".
- The pattern is usually a mix of developmental limits + fatigue + transition stress + need for connection.

What to do right now:
1) Regulate first: calm voice, short sentences, lower stimulation.
2) Name feeling + boundary: "I see you're upset. I won't let you hurt."
3) Offer one concrete alternative action (hug, water, breathing, squeeze pillow).

What to change this week:
- Keep one predictable routine anchor (same bedtime or decompression window after daycare).
- Reduce high-pressure moments and long explanations during escalations.
- Track triggers: time, place, people, hunger, tiredness, transitions.

What to stop:
- Repeated lectures during dysregulation.
- Harsh shaming language.

Parent script:
"You're having a hard moment. I'm with you. I won't let you hurt. We'll calm down first, then talk."

When to seek specialist support:
- If episodes become frequent, intense, or affect sleep, social functioning, or safety.`;
  }

  if (topic === "sleep") {
    return `Сейчас включен локальный mock-режим (без OpenAI API ключа).

Понимаю, как это выматывает. Когда тема про сон тянется неделями, родитель быстро оказывается на грани.

Что может происходить:
- В возрасте ${ageHint} проблемы с засыпанием часто связаны не с "упрямством", а с перегрузкой нервной системы к вечеру.
- После садика/активного дня ребенок может держаться из последних сил, и протест перед сном — это разрядка, а не манипуляция.

Что сделать сегодня вечером:
1) За 60 минут до сна уберите яркий свет и активные игры.
2) Дайте короткий предсказуемый ритуал (10-15 минут) в одном порядке.
3) В момент протеста — минимум слов, спокойная твердая опора: "Я рядом. Сейчас успокаиваемся, потом спать."

Что изменить за неделю:
- Держать одинаковое время начала ритуала (допуск до 15 минут).
- После садика добавить 15 минут тихого контакта без требований.
- Вести мини-заметки: когда срывается укладывание и что было за 2 часа до сна.

Что лучше прекратить:
- Длинные переговоры в разгар истерики.
- Часто менять тактику в один и тот же вечер.

Фраза-скрипт для родителя:
"Ты злишься, я вижу. Я рядом и помогу успокоиться. Спать все равно будем."

Когда нужен очный специалист:
- Если нарушение сна стойко ухудшается 2-3 недели подряд, есть резкая дневная вялость, сильные ночные страхи или регресс навыков.`;
  }

  return `Сейчас включен локальный mock-режим (без OpenAI API ключа).

Понимаю, почему вас это тревожит. В таких ситуациях легко почувствовать вину и растерянность.

Что может происходить:
- В возрасте ${ageHint} сложное поведение часто отражает не "плохой характер", а трудности саморегуляции.
- Обычно это сочетание факторов: усталость, нехватка контакта, перегрузка, резкие переходы, непредсказуемые границы.

Что сделать прямо сейчас:
1) Сначала контакт и спокойный тон, потом короткая инструкция.
2) Назовите чувство и обозначьте границу без стыда.
3) Дайте один безопасный способ разрядки (подышать, попить воды, сжать подушку, обняться).

Что поменять в ближайшие 7 дней:
- Выбрать 1-2 "якоря" режима (подъем/сон/время тихого контакта).
- Снизить количество длинных объяснений в пик эмоций.
- Отмечать повторяющиеся триггеры: где, когда, после чего начинается вспышка.

Что важно перестать делать:
- Сравнивать ребенка с другими.
- Усиливать давление, когда ребенок уже в перегрузе.

Фраза-скрипт:
"Я вижу, тебе сложно. Я рядом. Бить/кричать нельзя. Давай успокоимся и решим вместе."

Когда лучше обратиться очно:
- Если вспышки становятся все чаще, есть риск травм, сильный откат сна/аппетита или выраженная тревога у ребенка.`;
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function normalizeUtm(rawUtm) {
  const source = rawUtm && typeof rawUtm === "object" ? rawUtm : {};
  return Object.fromEntries(
    utmFields.map((field) => [field, cleanText(source[field], 120)])
  );
}

function normalizeLead(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return {
    parentName: cleanText(source.parentName, 80),
    contact: cleanText(source.contact, 120),
    childAge: cleanText(source.childAge, 40),
    goal: cleanText(source.goal, 240),
    notes: cleanText(source.notes, 500),
    consent: Boolean(source.consent),
    landingPath: cleanText(source.landingPath, 240),
    sessionId: cleanText(source.sessionId, 80),
    utm: normalizeUtm(source.utm)
  };
}

function isValidLead(lead) {
  return Boolean(lead.contact) && lead.consent;
}

function maskContact(contact) {
  if (!contact) {
    return "";
  }
  if (contact.includes("@")) {
    const [name, domain] = contact.split("@");
    if (!domain) {
      return `${name.slice(0, 2)}***`;
    }
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${contact.slice(0, 3)}***${contact.slice(-2)}`;
}

function getLeadsSummary() {
  const bySource = {};
  for (const lead of leadInbox) {
    const source = lead.utm.utm_source || "direct";
    bySource[source] = (bySource[source] || 0) + 1;
  }
  return {
    count: leadInbox.length,
    bySource,
    latest: leadInbox.slice(-10).reverse().map((lead) => ({
      id: lead.id,
      parentName: lead.parentName,
      contact: maskContact(lead.contact),
      goal: lead.goal,
      createdAt: lead.createdAt,
      source: lead.utm.utm_source || "direct",
      campaign: lead.utm.utm_campaign || ""
    }))
  };
}

async function persistLead(lead) {
  await mkdir(path.dirname(LEAD_LOG_PATH), { recursive: true });
  await appendFile(LEAD_LOG_PATH, `${JSON.stringify(lead)}\n`, "utf8");
}

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body?.message;
    if (typeof userMessage !== "string" || !userMessage.trim()) {
      return res.status(400).json({
        error: "Field \"message\" must be a non-empty string."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.json({
        mode: "mock",
        reply: buildMockReply(userMessage)
      });
    }
    const storyMode = isStoryRequest(userMessage);
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
            content: storyMode ? BEDTIME_STORY_SYSTEM_PROMPT : PARENT_COACH_SYSTEM_PROMPT
          },
          ...(storyMode
            ? [
                {
                  role: "system",
                  content:
                    "If enough details are present, produce the full story now in requested format. If details are missing, ask briefly and provide one default story version immediately."
                }
              ]
            : []),
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: storyMode ? 0.8 : 0.6
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

    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const leadInput = normalizeLead(req.body);
    if (!isValidLead(leadInput)) {
      return res.status(400).json({
        error: "Введите контакт и подтвердите согласие на обработку данных."
      });
    }

    const lead = {
      id: `lead_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      ...leadInput,
      createdAt: new Date().toISOString()
    };

    leadInbox.push(lead);
    if (leadInbox.length > 500) {
      leadInbox.shift();
    }
    await persistLead(lead);

    return res.status(201).json({
      ok: true,
      leadId: lead.id,
      message: "Заявка принята. Мы свяжемся с вами."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Не удалось сохранить заявку.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/api/leads", (_req, res) => {
  return res.json(getLeadsSummary());
});

app.get("/api", (_req, res) => {
  res.json({
    name: "Parent AI Agent API",
    status: "running",
    endpoints: {
      ui: "GET /",
      api: "GET /api",
      health: "GET /health",
      chat: "POST /chat",
      leadsCreate: "POST /api/leads",
      leadsSummary: "GET /api/leads"
    },
    features: {
      leadCapture: true,
      utmTracking: true
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
