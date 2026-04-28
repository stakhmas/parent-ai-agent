import { NextResponse } from "next/server";
import { challenges } from "@/lib/product";
import { storyRequestSchema, type StoryPayload } from "@/lib/prompts";
import { createStory } from "@/lib/story-engine";
import {
  answerTelegramCallbackQuery,
  parseTelegramUpdate,
  sendTelegramMessage,
  type TelegramFrom,
  type TelegramInlineKeyboardMarkup
} from "@/lib/telegram";
import { createServiceSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramSession = {
  step: "childName" | "age" | "challenge" | "favoriteHero" | "tone" | "length" | "done";
  payload: Partial<StoryPayload>;
};

const inMemorySessions = new Map<number, TelegramSession>();

const toneLabels: Record<StoryPayload["tone"], string> = {
  magical: "волшебная",
  funny: "смешная",
  calming: "спокойная",
  brave: "смелая"
};

const lengthLabels: Record<StoryPayload["length"], string> = {
  short: "короткая",
  medium: "средняя",
  long: "длинная"
};

function createDefaultSession(): TelegramSession {
  return {
    step: "childName",
    payload: {
      gender: "not-specified",
      tone: "magical",
      length: "short",
      parentEmail: ""
    }
  };
}

function getSession(chatId: number) {
  return inMemorySessions.get(chatId) ?? createDefaultSession();
}

function saveSession(chatId: number, session: TelegramSession) {
  inMemorySessions.set(chatId, {
    step: session.step,
    payload: { ...session.payload }
  });
}

function resetSession(chatId: number) {
  saveSession(chatId, createDefaultSession());
}

function keyboard(rows: TelegramInlineKeyboardMarkup["inline_keyboard"]) {
  return { inline_keyboard: rows };
}

function challengeKeyboard() {
  const labels: Record<string, string> = {
    "Afraid to sleep alone": "Боится спать один",
    "Bedtime resistance": "Не хочет ложиться спать",
    Tantrums: "Истерики",
    "Biting or hitting": "Кусается или дерется",
    "Jealous of sibling": "Ревнует к брату/сестре",
    "Fear of daycare": "Боится садика",
    "Separation anxiety": "Тяжело расстается",
    "Doctor fear": "Боится врача",
    "Confidence building": "Нужна уверенность",
    "Potty training": "Приучение к горшку"
  };

  return keyboard(
    challenges.slice(0, 10).map((challenge) => [
      {
        text: labels[challenge] ?? challenge,
        callback_data: `challenge:${challenge}`
      }
    ])
  );
}

function toneKeyboard() {
  return keyboard([
    [
      { text: "Волшебная", callback_data: "tone:magical" },
      { text: "Смешная", callback_data: "tone:funny" }
    ],
    [
      { text: "Спокойная", callback_data: "tone:calming" },
      { text: "Смелая", callback_data: "tone:brave" }
    ]
  ]);
}

function lengthKeyboard() {
  return keyboard([
    [
      { text: "Короткая", callback_data: "length:short" },
      { text: "Средняя", callback_data: "length:medium" },
      { text: "Длинная", callback_data: "length:long" }
    ]
  ]);
}

async function sendWelcome(chatId: number) {
  resetSession(chatId);
  await sendTelegramMessage({
    chatId,
    text:
      "Привет! Я Magic Parent AI. Создам персональную сказку на ночь, где ребенок станет героем и мягко справится со страхом, истерикой, садиком или другой ситуацией.\n\nКак зовут ребенка?"
  });
}

async function saveTelegramUser(chatId: number, from?: TelegramFrom) {
  const supabase = createServiceSupabaseClient();
  if (!supabase || !from) return;

  await supabase.from("telegram_users").upsert(
    {
      telegram_user_id: from.id,
      chat_id: chatId,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      last_seen_at: new Date().toISOString()
    },
    { onConflict: "telegram_user_id" }
  );
}

function escapeMarkdown(value: string) {
  return value.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

async function finishStory(chatId: number, session: TelegramSession) {
  const parsed = storyRequestSchema.safeParse(session.payload);
  if (!parsed.success) {
    resetSession(chatId);
    await sendTelegramMessage({
      chatId,
      text: "Не хватило данных для сказки. Начнем заново: как зовут ребенка?"
    });
    return;
  }

  await sendTelegramMessage({
    chatId,
    text: "Пишу сказку... это займет несколько секунд."
  });

  const { result, mode, storyId } = await createStory(parsed.data, { source: "telegram", chatId });
  const parentMessage = [
    `Почему помогает: ${result.parentMessage.whyItHelps}`,
    `Что может означать поведение: ${result.parentMessage.behaviorMeaning}`,
    `Что делать: ${result.parentMessage.realLifeSteps.join(" ")}`
  ].join("\n\n");

  await sendTelegramMessage({
    chatId,
    text: `*${escapeMarkdown(result.title)}*\n\n${escapeMarkdown(result.preview)}`,
    parseMode: "MarkdownV2"
  });
  await sendTelegramMessage({
    chatId,
    text: `Сообщение для родителя:\n\n${parentMessage}\n\nЧтобы получить полную сказку, аудио и сохранить историю, нажмите кнопку ниже.`,
    replyMarkup: keyboard([
      [
        {
          text: "Открыть полную версию",
          url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/stories?source=telegram&storyId=${storyId ?? "preview"}`
        }
      ],
      [{ text: "Создать новую сказку", callback_data: "restart" }]
    ])
  });

  if (mode === "mock") {
    await sendTelegramMessage({
      chatId,
      text: "Сейчас включен mock-режим. Добавьте OPENAI_API_KEY, чтобы бот писал живые сказки через AI."
    });
  }

  saveSession(chatId, {
    step: "done",
    payload: {
      ...parsed.data,
      age: String(parsed.data.age),
      parentEmail: parsed.data.parentEmail ?? ""
    }
  });
}

async function handleText(chatId: number, text: string, from?: TelegramFrom) {
  await saveTelegramUser(chatId, from);

  if (text === "/start" || text === "/new") {
    await sendWelcome(chatId);
    return;
  }

  const session = getSession(chatId);
  const payload = { ...session.payload };

  if (session.step === "childName") {
    payload.childName = text.trim();
    saveSession(chatId, { step: "age", payload });
    await sendTelegramMessage({ chatId, text: "Сколько лет ребенку? Например: 4" });
    return;
  }

  if (session.step === "age") {
    const age = Number(text);
    if (!Number.isInteger(age) || age < 1 || age > 12) {
      await sendTelegramMessage({ chatId, text: "Введите возраст числом от 1 до 12." });
      return;
    }
    payload.age = String(age);
    saveSession(chatId, { step: "challenge", payload });
    await sendTelegramMessage({
      chatId,
      text: "С какой ситуацией должна помочь сказка?",
      replyMarkup: challengeKeyboard()
    });
    return;
  }

  if (session.step === "challenge") {
    payload.challenge = text.trim();
    saveSession(chatId, { step: "favoriteHero", payload });
    await sendTelegramMessage({ chatId, text: "Любимый герой, животное или игрушка ребенка? Например: лунный лис." });
    return;
  }

  if (session.step === "favoriteHero") {
    payload.favoriteHero = text.trim();
    saveSession(chatId, { step: "tone", payload });
    await sendTelegramMessage({ chatId, text: "Выберите тон сказки:", replyMarkup: toneKeyboard() });
    return;
  }

  await sendTelegramMessage({
    chatId,
    text: "Напишите /new, чтобы создать новую сказку."
  });
}

async function handleCallback(chatId: number, callbackData: string, callbackId: string) {
  await answerTelegramCallbackQuery(callbackId);

  if (callbackData === "restart") {
    await sendWelcome(chatId);
    return;
  }

  const session = getSession(chatId);
  const payload = { ...session.payload };

  if (callbackData.startsWith("challenge:")) {
    payload.challenge = callbackData.replace("challenge:", "");
    saveSession(chatId, { step: "favoriteHero", payload });
    await sendTelegramMessage({ chatId, text: "Любимый герой, животное или игрушка ребенка? Например: лунный лис." });
    return;
  }

  if (callbackData.startsWith("tone:")) {
    const tone = callbackData.replace("tone:", "") as StoryPayload["tone"];
    payload.tone = tone;
    saveSession(chatId, { step: "length", payload });
    await sendTelegramMessage({
      chatId,
      text: `Тон: ${toneLabels[tone]}. Теперь выберите длину:`,
      replyMarkup: lengthKeyboard()
    });
    return;
  }

  if (callbackData.startsWith("length:")) {
    const length = callbackData.replace("length:", "") as StoryPayload["length"];
    payload.length = length;
    await sendTelegramMessage({ chatId, text: `Длина: ${lengthLabels[length]}.` });
    await finishStory(chatId, { step: "done", payload });
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = parseTelegramUpdate(await request.json());
  const message = update.message;
  const callback = update.callback_query;

  if (message?.chat.id && message.text) {
    await handleText(message.chat.id, message.text, message.from);
  } else if (callback?.message?.chat.id && callback.data) {
    await handleCallback(callback.message.chat.id, callback.data, callback.id);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/telegram/webhook",
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
  });
}
