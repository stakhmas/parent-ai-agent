import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PORT = Number(process.env.PORT || 3000);
const chatMemoryBySession = new Map();
app.use(express.json());
app.use(express.static("public"));

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

function systemPrompt(profile) {
  return `Ты — персональный помощник для родителей детей 0-3 лет.
Твоя задача: дать практичный, спокойный и персонализированный ответ под конкретную семью.
Не ставь диагнозы и не назначай лечение.
Если есть тревожные симптомы — мягко предложи обратиться к педиатру.

Профиль семьи:
${profileSummary(profile)}

Структура ответа (всегда):
1) "Что сделать сегодня (10-20 минут)" — 3-5 конкретных шагов.
2) "Почему это подходит именно вам" — короткая персонализация под профиль.
3) "План на 3 дня" — маленькие реалистичные изменения.
4) "Красные флаги" — когда нужно обратиться к врачу.

Пиши на русском, ясно, без воды, с эмпатией.`;
}

function buildMockReply(userMessage, profile, memory) {
  const displayName = profile.childName || "малыш";
  const age = profile.childAgeMonths || "0-3 года";
  const focus = profile.sleepChallenges || "частые пробуждения и плач";
  const goal = profile.familyGoal || "более спокойные укладывания";
  const lastUserMessage =
    memory
      .slice()
      .reverse()
      .find((entry) => entry.role === "user" && typeof entry.content === "string")
      ?.content || "";
  const continuityHint = lastUserMessage
    ? `\nКонтекст из прошлого вопроса: "${lastUserMessage}".`
    : "";
  return `Похоже, сейчас включен локальный mock-режим (без OpenAI API ключа).

Вопрос: "${userMessage}"
${continuityHint}

Что сделать сегодня (10-20 минут):
1) Для ${displayName} (${age}) задайте короткий стабильный ритуал перед сном: приглушить свет, тихий голос, одно и то же действие 10 минут.
2) За 60 минут до сна снизьте стимуляцию (яркий экран/активные игры).
3) В момент плача используйте один способ успокоения 3-5 минут, не меняя его каждые 20 секунд.

Почему это подходит именно вам:
- Вы отметили сложность: "${focus}".
- Ваша цель: "${goal}", поэтому план направлен на предсказуемость и меньшее перевозбуждение.

План на 3 дня:
- День 1: закрепить одинаковый порядок действий.
- День 2: подвинуть начало ритуала на 10 минут раньше, если есть перегул.
- День 3: оценить, стало ли засыпание быстрее и просыпаний меньше.

Красные флаги:
- высокая температура, вялость, необычный плач или отказ от питья — обратиться к педиатру.`;
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

    if (!OPENAI_API_KEY) {
      const mockReply = buildMockReply(userMessage, profile, memory);
      const updated = [...memory, { role: "user", content: userMessage }, { role: "assistant", content: mockReply }].slice(-8);
      chatMemoryBySession.set(sessionId, updated);
      return res.json({
        mode: "mock",
        reply: mockReply
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
            content: systemPrompt(profile)
          },
          ...memory,
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7
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

    const updated = [...memory, { role: "user", content: userMessage }, { role: "assistant", content: reply }].slice(-8);
    chatMemoryBySession.set(sessionId, updated);

    return res.json({ reply });
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
      sessionMemory: true
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
