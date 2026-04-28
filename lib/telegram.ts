export type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: {
    id: number;
    type: string;
  };
  from?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
};

export type TelegramFrom = NonNullable<TelegramMessage["from"]>;

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
    from?: TelegramMessage["from"];
  };
};

export type TelegramInlineKeyboardButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

export type TelegramInlineKeyboardMarkup = {
  inline_keyboard: TelegramInlineKeyboardButton[][];
};

type SendMessageOptions = {
  chatId: number;
  text: string;
  parseMode?: "Markdown" | "MarkdownV2" | "HTML";
  replyMarkup?: TelegramInlineKeyboardMarkup;
};

export async function sendTelegramMessage(options: SendMessageOptions) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      ok: true,
      mock: true,
      chatId: options.chatId,
      text: options.text,
      options
    };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: options.chatId,
      text: options.text,
      parse_mode: options.parseMode,
      reply_markup: options.replyMarkup
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.description || "Telegram sendMessage failed.");
  }

  return data;
}

export async function answerTelegramCallbackQuery(callbackQueryId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { ok: true, mock: true, callbackQueryId };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.description || "Telegram answerCallbackQuery failed.");
  }

  return data;
}

export function parseTelegramUpdate(update: unknown): TelegramUpdate {
  return update as TelegramUpdate;
}

export function verifyTelegramSecret(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

export function getTelegramWebhookUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return null;
  }

  return `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
}
