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

app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.static("public"));

function detectLanguage(text) {
  return /[а-яё]/i.test(text) ? "ru" : "en";
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

function buildMockReply(userMessage) {
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
            content: PARENT_COACH_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.6
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
