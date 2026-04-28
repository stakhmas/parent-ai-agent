"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, Share2, Sparkles } from "lucide-react";
import { challenges, lengthOptions, toneOptions } from "@/lib/product";
import type { StoryPayload } from "@/lib/prompts";

type GenderValue = StoryPayload["gender"];

type StoryResponse = {
  storyId?: string;
  preview: string;
  fullStory?: string;
  parentMessage: string;
  shareText: string;
  mock?: boolean;
};

const initialPayload: StoryPayload = {
  childName: "",
  age: "5",
  gender: "",
  challenge: "Afraid to sleep alone",
  favoriteHero: "",
  tone: "magical",
  length: "medium",
  parentEmail: ""
};

const steps = [
  "Child",
  "Age",
  "Challenge",
  "Hero",
  "Tone",
  "Generate"
];

export function StoryCreator() {
  const [payload, setPayload] = useState<StoryPayload>(initialPayload);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<StoryResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState("");

  const canContinue = useMemo(() => {
    if (step === 0) return payload.childName.trim().length > 1;
    if (step === 1) return Number(payload.age) >= 2 && Number(payload.age) <= 10;
    if (step === 2) return payload.challenge.trim().length > 2;
    if (step === 3) return payload.favoriteHero.trim().length > 1;
    return true;
  }, [payload, step]);

  function updateField<K extends keyof StoryPayload>(key: K, value: StoryPayload[K]) {
    setPayload((current) => ({ ...current, [key]: value }));
  }

  async function generateStory() {
    setError("");
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Story generation failed.");
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create story.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function unlockStory() {
    setError("");
    setIsCheckingOut(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: result?.storyId,
          childName: payload.childName,
          parentEmail: payload.parentEmail
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout failed.");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError(data.message || "Stripe is not configured yet. Add keys to enable checkout.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start checkout.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  async function shareStory() {
    const text = result?.shareText || `I made a magical bedtime story for ${payload.childName}.`;
    if (navigator.share) {
      await navigator.share({ title: "Magic Parent AI story", text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    setError("Share text copied to clipboard.");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12" id="create">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-violet-200/50 backdrop-blur">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-500">Story Studio</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Create a personalized story</h2>
            </div>
            <Sparkles className="h-9 w-9 text-amber-400" />
          </div>

          <div className="mb-6 grid grid-cols-6 gap-2">
            {steps.map((label, index) => (
              <div key={label} className="space-y-2">
                <div
                  className={`h-2 rounded-full ${index <= step ? "bg-violet-500" : "bg-violet-100"}`}
                />
                <p className="hidden text-xs font-semibold text-slate-500 sm:block">{label}</p>
              </div>
            ))}
          </div>

          {step === 0 && (
            <Field label="What is your child's name?">
              <input
                className="input"
                placeholder="Mia"
                value={payload.childName}
                onChange={(event) => updateField("childName", event.target.value)}
              />
              <input
                className="input mt-3"
                placeholder="Parent email for saved stories (optional)"
                type="email"
                value={payload.parentEmail}
                onChange={(event) => updateField("parentEmail", event.target.value)}
              />
            </Field>
          )}

          {step === 1 && (
            <Field label="How old is your child?">
              <input
                className="input"
                max="10"
                min="2"
                type="number"
                value={payload.age}
                onChange={(event) => updateField("age", event.target.value)}
              />
              <select
                className="input mt-3"
                value={payload.gender}
                onChange={(event) => updateField("gender", event.target.value as GenderValue)}
              >
                <option value="">Gender optional</option>
                <option value="girl">Girl</option>
                <option value="boy">Boy</option>
                <option value="not-specified">Keep it neutral</option>
              </select>
            </Field>
          )}

          {step === 2 && (
            <Field label="What challenge should the story gently help with?">
              <select
                className="input"
                value={payload.challenge}
                onChange={(event) => updateField("challenge", event.target.value)}
              >
                {challenges.map((challenge) => (
                  <option key={challenge}>{challenge}</option>
                ))}
              </select>
              <textarea
                className="input mt-3 min-h-28"
                placeholder="Add context: bedtime tears, fear of the dark, new baby..."
                onChange={(event) => updateField("challenge", event.target.value || payload.challenge)}
              />
            </Field>
          )}

          {step === 3 && (
            <Field label="Favorite animal, toy, or character">
              <input
                className="input"
                placeholder="A brave moon fox, a blue dinosaur, a plush bunny..."
                value={payload.favoriteHero}
                onChange={(event) => updateField("favoriteHero", event.target.value)}
              />
            </Field>
          )}

          {step === 4 && (
            <Field label="Choose a tone and length">
              <div className="grid grid-cols-2 gap-3">
                {toneOptions.map((tone) => (
                  <button
                    className={`choice ${payload.tone === tone.value ? "choice-active" : ""}`}
                    key={tone.value}
                    onClick={() => updateField("tone", tone.value)}
                    type="button"
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {lengthOptions.map((option) => (
                  <button
                    className={`choice ${payload.length === option.value ? "choice-active" : ""}`}
                    key={option.value}
                    onClick={() => updateField("length", option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {step === 5 && (
            <div className="rounded-3xl bg-violet-50 p-5">
              <h3 className="text-xl font-bold text-slate-950">Ready to make bedtime easier?</h3>
              <p className="mt-2 text-slate-600">
                We will create a premium story where {payload.childName || "your child"} becomes the hero
                and practices a calmer way through {payload.challenge.toLowerCase()}.
              </p>
              <button className="primary-button mt-5 w-full" disabled={isGenerating} onClick={generateStory}>
                {isGenerating ? "Writing with moonlight..." : "Generate free preview"}
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              type="button"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 5 && (
              <button
                className="primary-button"
                disabled={!canContinue}
                onClick={() => setStep((current) => current + 1)}
                type="button"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          {error && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-700">{error}</p>}
        </div>

        <div className="rounded-[2rem] border border-violet-100 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">Preview</p>
              <h2 className="mt-2 text-3xl font-black">Your magical story</h2>
            </div>
            <div className="rounded-full bg-white/10 p-3">
              <Check className="h-6 w-6 text-emerald-300" />
            </div>
          </div>

          {!result ? (
            <div className="grid min-h-[440px] place-items-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
              <div>
                <p className="text-5xl">🌙</p>
                <p className="mt-4 text-lg font-semibold">A short free preview appears here.</p>
                <p className="mt-2 text-sm text-slate-300">
                  The full story, parent guidance, audio narration, and saved bedtime pack are premium.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <article className="rounded-3xl bg-white p-5 text-slate-900">
                <p className="whitespace-pre-wrap leading-8">{result.preview}</p>
                <div className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-semibold text-violet-700">
                  <Lock className="mr-2 inline h-4 w-4" />
                  Unlock the full premium story with bedtime ending, printable keepsake, and audio narration.
                </div>
              </article>
              <article className="rounded-3xl bg-white/10 p-5">
                <h3 className="font-bold text-amber-100">Message for Parent</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{result.parentMessage}</p>
              </article>
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="primary-button justify-center" disabled={isCheckingOut} onClick={unlockStory}>
                  {isCheckingOut ? "Opening checkout..." : "Unlock full story"}
                </button>
                <button className="secondary-button justify-center border-white/20 bg-white/10 text-white" onClick={shareStory}>
                  <Share2 className="h-4 w-4" /> Share story
                </button>
              </div>
              {result.mock && <p className="text-xs text-slate-400">Local mock mode: add OpenAI keys for live stories.</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="block">
      <span className="mb-3 block text-lg font-bold text-slate-900">{label}</span>
      {children}
    </div>
  );
}
