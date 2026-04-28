const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token || !appUrl || !secret) {
  console.error(
    "Missing TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL, or TELEGRAM_WEBHOOK_SECRET."
  );
  process.exit(1);
}

const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook`;
const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"]
  })
});

const data = await response.json();
if (!response.ok || !data.ok) {
  console.error(data);
  process.exit(1);
}

console.log(`Telegram webhook set: ${webhookUrl}`);
