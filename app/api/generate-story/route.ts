import { NextResponse } from "next/server";
import { storyRequestSchema } from "@/lib/prompts";
import { generateStory, parentMessageToText, saveStory } from "@/lib/story-engine";

export async function POST(request: Request) {
  const parsed = storyRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete the story form." }, { status: 400 });
  }

  const input = parsed.data;
  const { mode, result } = await generateStory(input);
  const storyId = await saveStory(input, result);

  return NextResponse.json({
    mode,
    mock: mode === "mock",
    storyId,
    title: result.title,
    preview: result.preview,
    fullStory: undefined,
    parentMessage: parentMessageToText(result.parentMessage),
    shareText: result.shareText,
    weeklyRecommendation: result.weeklyRecommendation
  });
}
