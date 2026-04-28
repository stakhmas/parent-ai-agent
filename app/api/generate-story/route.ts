import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  buildStorySystemPrompt,
  buildStoryUserPrompt,
  mockStory,
  storyRequestSchema,
  type StoryResponse
} from "@/lib/prompts";
import { createServiceSupabaseClient } from "@/lib/supabase";

function parentMessageToText(parentMessage: StoryResponse["parentMessage"]) {
  return [
    `Why this story helps: ${parentMessage.whyItHelps}`,
    `What the behavior may mean: ${parentMessage.behaviorMeaning}`,
    `Try tonight: ${parentMessage.realLifeSteps.join(" ")}`
  ].join("\n\n");
}

export async function POST(request: Request) {
  const parsed = storyRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete the story form." }, { status: 400 });
  }

  const input = parsed.data;
  let result = mockStory(input);
  let mode: "mock" | "openai" = "mock";

  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.86,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildStorySystemPrompt()
        },
        { role: "user", content: buildStoryUserPrompt(input) }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      result = JSON.parse(content) as StoryResponse;
      mode = "openai";
    }
  }

  const supabase = createServiceSupabaseClient();
  let storyId: string | undefined;

  if (supabase) {
    const { data } = await supabase
      .from("stories")
      .insert({
        child_name: input.childName,
        child_age: input.age,
        child_gender: input.gender || null,
        challenge: input.challenge,
        favorite_hero: input.favoriteHero,
        tone: input.tone,
        length: input.length,
        title: result.title,
        preview: result.preview,
        full_story: result.fullStory,
        parent_message: result.parentMessage,
        share_slug: result.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        email: input.parentEmail || null,
        status: "preview"
      })
      .select("id")
      .single();
    storyId = data?.id;
  }

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
