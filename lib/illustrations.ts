import type { StoryRequest } from "@/lib/prompts";

type IllustrationInput = Pick<StoryRequest, "childName" | "challenge" | "favoriteHero" | "tone"> & {
  title?: string;
  preview?: string;
};

export type IllustrationResult = {
  imageUrl: string;
  mode: "gemini" | "mock";
  prompt: string;
};

export function buildIllustrationPrompt(input: IllustrationInput) {
  return [
    "Создай одну добрую иллюстрацию к персональной детской сказке на ночь.",
    "Стиль: премиальная книжная иллюстрация, мягкий свет, уютная спальня, сказочная атмосфера, безопасно для детей, без страшных деталей.",
    `Главный герой: ребенок по имени ${input.childName}.`,
    `Сюжетная трудность: ${input.challenge}.`,
    `Важный спутник или символ поддержки: ${input.favoriteHero}.`,
    `Тон: ${input.tone}.`,
    input.title ? `Название сказки: ${input.title}.` : "",
    input.preview ? `Ключевой фрагмент: ${input.preview.slice(0, 500)}.` : "",
    "Не добавляй текст, буквы, логотипы, водяные знаки или реалистичные лица. Кадр должен быть теплым, эмоциональным и подходящим для обложки сказки."
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildMockIllustrationSvg(input: IllustrationInput) {
  const title = escapeSvg(input.title || `${input.childName} и ${input.favoriteHero}`);
  const subtitle = escapeSvg(input.challenge.slice(0, 72));

  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="moon" cx="35%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#fff7cc"/>
      <stop offset="45%" stop-color="#f8d5ff"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </radialGradient>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="55%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#f9a8d4"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="72" fill="url(#sky)"/>
  <circle cx="260" cy="220" r="128" fill="url(#moon)" opacity="0.95"/>
  <path d="M120 740 C260 610 390 650 510 550 C660 430 805 500 920 365 L920 1024 L120 1024 Z" fill="#fdf2f8" opacity="0.95"/>
  <path d="M185 820 C330 715 460 745 600 645 C720 560 820 585 910 500 L910 1024 L185 1024 Z" fill="#ede9fe"/>
  <g fill="#fff7ed" opacity="0.95">
    <circle cx="720" cy="170" r="7"/><circle cx="815" cy="250" r="5"/><circle cx="585" cy="210" r="4"/><circle cx="410" cy="130" r="5"/><circle cx="160" cy="360" r="4"/>
  </g>
  <g transform="translate(345 405)">
    <ellipse cx="165" cy="215" rx="210" ry="86" fill="#ffffff" opacity="0.82"/>
    <circle cx="145" cy="115" r="76" fill="#fde68a"/>
    <circle cx="250" cy="142" r="58" fill="#fca5a5"/>
    <path d="M95 188 C155 130 245 142 300 208 C250 265 145 270 95 188 Z" fill="#fef3c7"/>
    <circle cx="125" cy="108" r="10" fill="#4c1d95"/>
    <circle cx="225" cy="128" r="9" fill="#4c1d95"/>
    <path d="M155 160 C185 185 220 182 248 158" stroke="#4c1d95" stroke-width="9" stroke-linecap="round" fill="none"/>
  </g>
  <rect x="96" y="810" width="832" height="128" rx="36" fill="#ffffff" opacity="0.86"/>
  <text x="512" y="865" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#3b0764">${title}</text>
  <text x="512" y="908" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#6b21a8">${subtitle}</text>
</svg>`).toString("base64")}`;
}

export async function generateGeminiIllustration(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";

  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"]
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini image generation failed.");
  }

  const inlineData = data?.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { data?: string; mimeType?: string } }) => part.inlineData?.data
  )?.inlineData;

  if (!inlineData?.data) {
    return null;
  }

  return `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
}

export function generateFallbackIllustration(input: IllustrationInput) {
  return buildMockIllustrationSvg(input);
}

export async function createIllustration(input: IllustrationInput): Promise<IllustrationResult> {
  const prompt = buildIllustrationPrompt(input);
  const imageUrl = await generateGeminiIllustration(prompt);

  return {
    imageUrl: imageUrl ?? generateFallbackIllustration(input),
    mode: imageUrl ? "gemini" : "mock",
    prompt
  };
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
