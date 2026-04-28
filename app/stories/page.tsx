import { BookHeart, CalendarDays, Mail, Sparkles, Trophy } from "lucide-react";
import { retentionLoops, storyExamples } from "@/lib/product";

export default function StoriesPage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 rounded-[2rem] bg-white/80 p-6 shadow-soft ring-1 ring-white/70">
          <p className="eyebrow">Retention hub</p>
          <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
                A bedtime library parents come back to every night.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Saved stories, weekly recommendations, reminders, and streaks create the loop from
                one emotional story into an ongoing family ritual.
              </p>
            </div>
            <div className="rounded-3xl bg-magic-900 p-5 text-white">
              <div className="flex items-center gap-3">
                <Trophy className="h-7 w-7 text-amber-200" />
                <div>
                  <p className="text-3xl font-black">7 nights</p>
                  <p className="text-sm text-magic-100">Current bedtime streak</p>
                </div>
              </div>
              <div className="mt-4 h-3 rounded-full bg-white/15">
                <div className="h-full w-3/4 rounded-full bg-amber-200" />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-3">
          {retentionLoops.map((loop, index) => {
            const Icon = [BookHeart, CalendarDays, Mail][index] ?? Sparkles;
            return (
              <article key={loop.title} className="rounded-[1.6rem] bg-white p-6 shadow-soft">
                <Icon className="h-8 w-8 text-magic-600" />
                <h2 className="mt-4 text-xl font-black text-slate-950">{loop.title}</h2>
                <p className="mt-2 leading-7 text-slate-600">{loop.copy}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Saved stories</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Demo family library</h2>
            </div>
            <a className="btn-secondary" href="/create">
              Create new story
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {storyExamples.map((story) => (
              <article key={story.title} className="rounded-3xl bg-cream-100 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-rose-500">
                  {story.challenge}
                </p>
                <h3 className="mt-3 text-xl font-black text-slate-950">{story.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{story.preview}</p>
                <button className="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-black text-magic-700 shadow-sm">
                  Share magical story
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
