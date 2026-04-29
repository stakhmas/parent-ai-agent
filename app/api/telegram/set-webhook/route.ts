import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET in Vercel."
      },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const webhookUrl = `${origin}/api/telegram/webhook`;
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
    return NextResponse.json({ ok: false, telegram: data }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    webhookUrl,
    telegram: data
  });
}
