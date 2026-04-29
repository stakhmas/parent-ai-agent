import { NextResponse } from "next/server";
import { z } from "zod";
import { createIllustration } from "@/lib/illustrations";

const illustrationSchema = z.object({
  childName: z.string().min(1).max(60),
  challenge: z.string().min(3).max(280),
  favoriteHero: z.string().min(1).max(120),
  tone: z.enum(["magical", "funny", "calming", "brave"]),
  title: z.string().min(1).max(160).optional(),
  preview: z.string().min(1).max(1200).optional()
});

export async function POST(request: Request) {
  const parsed = illustrationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide story details for the illustration." }, { status: 400 });
  }

  return NextResponse.json(await createIllustration(parsed.data));
}
