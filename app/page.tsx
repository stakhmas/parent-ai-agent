import Link from "next/link";
import { ArrowRight, Heart, MoonStar, Sparkles, Star } from "lucide-react";
import { challengeExamples, pricingPlans, testimonials } from "@/lib/product";

const steps = [
  "Tell us your child's name, age, and current challenge.",
  "Choose a favorite hero and a gentle emotional tone.",
  "Receive a personalized story plus a practical parent note.",
];

const faqs = [
  {
    question: "Can a story really help behavior?",
    answer:
      "Stories give children a safe way to rehearse bravery, separation, sleep, confidence, and repair. The parent note turns the story theme into real-life next steps.",
  },
  {
    question: "Is this medical or therapy advice?",
    answer:
      "No. Magic Parent AI is a parenting support and storytelling product. It does not diagnose, treat, or replace clinicians.",
  },
  {
    question: "What makes it personalized?",
    answer:
      "The child becomes the hero, and the story uses their age, challenge, favorite characters, tone, and bedtime goal.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden px-5 pb-20 pt-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
              <Sparkles size={16} /> AI Personal Fairy Tales
            </div>
            <h1 className="text-balance text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Personalized bedtime stories that help children sleep, grow and
              feel safe.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Magic Parent AI turns tantrums, fears, jealousy, daycare worries,
              and bedtime resistance into warm stories where your child becomes
              the brave little hero.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary" href="/create">
                Create Story Now <ArrowRight size={18} />
              </Link>
              <Link className="btn-secondary" href="#examples">
                View examples
              </Link>
            </div>
            <div className="mt-8 grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
              {["1 free short preview", "Parent psychology note", "Stripe-ready checkout"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Star className="text-amber-400" size={18} fill="currentColor" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="card relative min-h-[520px] flex-1 p-6">
            <div className="absolute right-8 top-8 rounded-full bg-lavender p-4 text-violet-600">
              <MoonStar size={34} />
            </div>
            <p className="eyebrow">Tonight's story</p>
            <h2 className="mt-4 text-3xl font-black text-slate-950">
              Mila and the Moon Bear Who Guarded Dreams
            </h2>
            <p className="mt-5 leading-8 text-slate-700">
              When Mila felt the room grow too quiet, a tiny moon bear climbed
              down from a silver star and whispered, "Brave hearts can glow even
              in the dark." Together, they lit a trail of dream-lanterns from
              Mila's pillow to the softest cloud in the sky.
            </p>
            <div className="mt-8 rounded-3xl bg-rose-50 p-5">
              <p className="font-bold text-rose-900">Message for Parent</p>
              <p className="mt-2 text-sm leading-6 text-rose-900/80">
                The story externalizes fear as something gentle and solvable,
                then anchors bravery to a bedtime ritual parents can repeat.
              </p>
            </div>
            <Link className="btn-primary mt-8 w-full justify-center" href="/create">
              Make one for my child
            </Link>
          </div>
        </div>
      </section>

      <section className="section bg-white/65" id="how">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-4xl font-black text-slate-950">
            From parenting challenge to magical bedtime ritual.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <div className="card p-6" key={step}>
                <div className="grid size-12 place-items-center rounded-2xl bg-violet-100 font-black text-violet-700">
                  {index + 1}
                </div>
                <p className="mt-5 text-lg font-bold text-slate-900">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="examples">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Instant use cases</p>
          <h2 className="mt-3 text-4xl font-black text-slate-950">
            Built for the moments parents search for at midnight.
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {challengeExamples.map((challenge) => (
              <Link className="rounded-3xl border border-white/80 bg-white/75 p-4 font-semibold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:text-violet-700" href="/create" key={challenge}>
                {challenge}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-white/70">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div className="card p-6" key={testimonial.name}>
                <Heart className="text-rose-400" fill="currentColor" />
                <p className="mt-5 leading-7 text-slate-700">"{testimonial.quote}"</p>
                <p className="mt-5 font-bold text-slate-950">{testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Pricing</p>
          <h2 className="mt-3 text-4xl font-black text-slate-950">
            Start free, unlock the bedtime magic parents return to.
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div className="card flex flex-col p-6" key={plan.name}>
                <p className="text-xl font-black text-slate-950">{plan.name}</p>
                <p className="mt-2 text-3xl font-black text-violet-700">{plan.price}</p>
                <ul className="mt-5 flex flex-1 flex-col gap-3 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature}>* {feature}</li>
                  ))}
                </ul>
                <Link className="btn-primary mt-8 justify-center" href="/create">
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-950 text-white" id="faq">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-rose-200">FAQ</p>
            <h2 className="mt-3 text-4xl font-black">Trust first. Magic second.</h2>
          </div>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <div className="rounded-3xl bg-white/10 p-6" key={faq.question}>
                <p className="font-bold">{faq.question}</p>
                <p className="mt-3 leading-7 text-white/75">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
