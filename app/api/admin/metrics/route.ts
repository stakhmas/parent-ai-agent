import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const demoMetrics = {
  users: 184,
  purchases: 37,
  conversionRate: "20.1%",
  topThemes: [
    { theme: "Afraid to sleep alone", count: 58 },
    { theme: "Bedtime resistance", count: 43 },
    { theme: "Kindergarten fear", count: 31 },
    { theme: "Sibling jealousy", count: 24 }
  ],
  revenue: "$1,284"
};

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ mode: "demo", ...demoMetrics });
  }

  const [{ count: users }, { count: purchases }, storyThemes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("purchases").select("*", { count: "exact", head: true }).eq("status", "paid"),
    supabase.from("stories").select("challenge").limit(500)
  ]);

  const themeCounts = new Map<string, number>();
  storyThemes.data?.forEach((story) => {
    if (!story.challenge) return;
    themeCounts.set(story.challenge, (themeCounts.get(story.challenge) ?? 0) + 1);
  });

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({ theme, count }));

  const conversionRate =
    users && users > 0 ? `${(((purchases ?? 0) / users) * 100).toFixed(1)}%` : "0%";

  return NextResponse.json({
    mode: "live",
    users: users ?? 0,
    purchases: purchases ?? 0,
    conversionRate,
    topThemes,
    revenue: "Connect Stripe webhooks"
  });
}
