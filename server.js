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

app.use(express.json({ limit: "1mb" }));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(express.static("public"));

function buildMockReply(userMessage) {
  return `Похоже, сейчас включен локальный mock-режим (без OpenAI API ключа).\n\nВаш вопрос: "${userMessage}"\n\nБазовый безопасный план:\n1) Проверьте, сыт ли малыш и сухой ли подгузник.\n2) Снизьте стимуляцию: приглушите свет и звук.\n3) Используйте короткий успокаивающий ритуал (укачивание, белый шум, спокойный голос).\n4) Если плач необычный или длительный, обратитесь к педиатру.`;
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
            content: `Ты — заботливый помощник для родителей детей 0-3 лет.
Не давай медицинских диагнозов.
Объясняй просто и спокойно.
Давай практические советы.`
          },
          {
            role: "user",
            content: userMessage
          }
        ]
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
