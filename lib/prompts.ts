import { z } from "zod";

export const storyRequestSchema = z.object({
  childName: z.string().min(1).max(60),
  age: z.coerce.number().min(1).max(12),
  gender: z.enum(["girl", "boy", "not-specified", ""]).default(""),
  challenge: z.string().min(3).max(280),
  favoriteHero: z.string().min(1).max(120),
  tone: z.enum(["magical", "funny", "calming", "brave"]),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  parentEmail: z.string().email().optional().or(z.literal(""))
});

export type StoryRequest = z.infer<typeof storyRequestSchema>;

export type StoryPayload = {
  childName: string;
  age: string;
  gender: "" | "girl" | "boy" | "not-specified";
  challenge: string;
  favoriteHero: string;
  tone: "magical" | "funny" | "calming" | "brave";
  length: "short" | "medium" | "long";
  parentEmail: string;
};

export type StoryResponse = {
  title: string;
  preview: string;
  fullStory: string;
  parentMessage: {
    whyItHelps: string;
    behaviorMeaning: string;
    realLifeSteps: string[];
  };
  shareText: string;
  weeklyRecommendation: string;
};

const lengthGuide = {
  short: "650-850 words total",
  medium: "950-1,250 words total",
  long: "1,500-1,900 words total"
};

const toneGuide = {
  magical: "soft wonder, moonlight, tiny enchantments, protective warmth",
  funny: "gentle humor, silly sidekicks, playful pacing without overstimulation",
  calming: "slow rhythm, sensory grounding, low stakes, sleep-ready ending",
  brave: "courage, mastery, self-trust, emotionally safe challenge resolution"
};

export function buildStorySystemPrompt() {
  return `You are Magic Parent AI, a premium story therapist for families.
Create personalized bedtime stories that help children process normal parenting challenges through metaphor.

Rules:
- Never diagnose, shame, threaten, moralize, or use fear.
- Do not provide medical, legal, or emergency advice.
- Keep the child emotionally safe and heroic.
- The story must feel premium, specific, lyrical, and non-generic.
- Resolve the challenge through connection, practice, courage, and secure attachment.
- End with a cozy bedtime image.
- Parent guidance must be practical, compassionate, and brief.
- Return strict JSON only with keys: title, preview, fullStory, parentMessage, shareText, weeklyRecommendation.
- parentMessage must include whyItHelps, behaviorMeaning, and realLifeSteps array.`;
}

export function buildStoryUserPrompt(input: StoryRequest) {
  const pronouns =
    input.gender === "girl"
      ? "she/her"
      : input.gender === "boy"
        ? "he/him"
        : "they/them";

  return `Create a personalized parenting story.

Child:
- Name: ${input.childName}
- Age: ${input.age}
- Pronouns: ${pronouns}
- Current challenge: ${input.challenge}
- Favorite animal/character/hero: ${input.favoriteHero}
- Tone: ${input.tone} (${toneGuide[input.tone]})
- Length: ${input.length} (${lengthGuide[input.length]})

Story requirements:
1. Open with a vivid bedtime-friendly scene.
2. Make ${input.childName} the hero, not a passive listener.
3. Use ${input.favoriteHero} as a meaningful companion or symbol.
4. Mirror the real-life challenge through a magical problem that can be solved.
5. Include one repeated calming phrase parents can reuse.
6. Show a healing arc: feeling -> naming -> trying -> support -> mastery -> rest.
7. Avoid generic phrases like "once upon a time" unless transformed.
8. The preview must be the first emotionally strong 120-180 words and end with an unlock tease.
9. fullStory must contain the complete premium story.
10. Parent message must explain why the story helps, what the behavior may mean, and 3-5 real-life steps.
11. shareText must be a short viral line a parent would share.
12. weeklyRecommendation must recommend the next story theme for retention.`;
}

export function mockStory(input: StoryRequest): StoryResponse {
  const hero = input.favoriteHero || "little moon fox";
  return {
    title: `${input.childName} and the Moonlit ${capitalize(hero)}`,
    preview: `${input.childName} tucked a tiny silver star into a pajama pocket and listened as the room grew soft and blue. Tonight, ${hero} had arrived with whiskers full of moon-dust and a very important problem: the Sleepy Lantern in the Cloud Garden would not glow until a brave child taught it how to feel safe. ${input.childName} took one small breath and whispered, "I am safe, I am loved, I can try." Together they stepped onto a ribbon of starlight, where every worry became a firefly waiting to be understood. Unlock the full story to follow ${input.childName}'s whole magical journey to courage and rest.`,
    fullStory: `${input.childName} tucked a tiny silver star into a pajama pocket and listened as the room grew soft and blue. Tonight, ${hero} arrived with whiskers full of moon-dust and a very important problem: the Sleepy Lantern in the Cloud Garden would not glow until a brave child taught it how to feel safe.\n\n${input.childName} took one small breath and whispered, "I am safe, I am loved, I can try." The words made a warm circle around the bed. Together, ${input.childName} and ${hero} followed a ribbon of starlight to a garden where every cloud looked like a pillow.\n\nAt the center of the garden sat the Sleepy Lantern, hiding behind a leaf. "I want to shine," it said, "but ${input.challenge.toLowerCase()} feels too big." ${input.childName} understood that feeling. Instead of pushing the lantern, ${input.childName} sat beside it, counted three quiet breaths, and told it about one small brave thing to try.\n\nThe lantern blinked. ${hero} did a tiny dance. ${input.childName} tried the brave thing too: one breath, one soft word, one little step. The garden brightened from blue to gold. "I am safe, I am loved, I can try," ${input.childName} whispered again.\n\nBy the time the moon climbed high, the lantern was glowing like honey. It promised to remember ${input.childName}'s brave lesson every night. ${hero} carried ${input.childName} home on a cloud no bigger than a blanket. The room was still waiting, cozy and kind. ${input.childName} closed sleepy eyes, knowing that courage can be small, soft, and enough.`,
    parentMessage: {
      whyItHelps:
        "The story turns the challenge into a safe symbolic problem, letting your child practice courage without feeling criticized.",
      behaviorMeaning:
        "This behavior can be a sign your child is asking for connection, predictability, autonomy, or reassurance while their nervous system matures.",
      realLifeSteps: [
        "Reuse the story phrase during the real moment: I am safe, I am loved, I can try.",
        "Name the feeling before correcting the behavior.",
        "Offer one small next step instead of a big demand.",
        "Praise the effort, not only the result."
      ]
    },
    shareText: `I made ${input.childName} a personalized bedtime story with Magic Parent AI.`,
    weeklyRecommendation: `Next, create a ${input.tone} confidence story where ${input.childName} practices the same skill in a new setting.`
  };
}

export function buildStoryPrompt(input: StoryRequest) {
  return `${buildStorySystemPrompt()}\n\n${buildStoryUserPrompt(input)}`;
}

export const fallbackStory = mockStory;

function capitalize(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
