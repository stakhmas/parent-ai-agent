import { BarChart3, DollarSign, ShieldCheck, Sparkles, Users } from "lucide-react";

const metrics = [
  { label: "Users", value: "1,248", icon: Users },
  { label: "Purchases", value: "$18.4k", icon: DollarSign },
  { label: "Conversion", value: "8.7%", icon: BarChart3 },
  { label: "Top theme", value: "Sleep fears", icon: Sparkles }
];

const themes = [
  { theme: "Afraid to sleep alone", stories: 428, conversion: "12.4%" },
  { theme: "Bedtime resistance", stories: 392, conversion: "9.8%" },
  { theme: "Daycare fear", stories: 287, conversion: "8.9%" },
  { theme: "Sibling jealousy", stories: 211, conversion: "7.1%" }
];

export default function AdminPage() {
  return (
    <main className="section">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Founder dashboard</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">Growth, payments and story demand.</h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              Connect Supabase events and Stripe webhooks to replace the demo values with live startup metrics.
            </p>
          </div>
          <span className="pill border-emerald-200 bg-emerald-50 text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Admin only
          </span>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          {metrics.map((metric) => (
            <div className="card p-5" key={metric.label}>
              <metric.icon className="h-5 w-5 text-violet-500" />
              <p className="mt-4 text-sm font-semibold text-slate-500">{metric.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card overflow-hidden">
            <div className="border-b border-violet-100 p-5">
              <h2 className="text-xl font-black text-slate-950">Top story themes</h2>
            </div>
            <div className="divide-y divide-violet-100">
              {themes.map((theme) => (
                <div className="grid grid-cols-3 gap-3 p-5 text-sm" key={theme.theme}>
                  <strong className="text-slate-900">{theme.theme}</strong>
                  <span className="text-slate-600">{theme.stories} stories</span>
                  <span className="font-bold text-emerald-600">{theme.conversion}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-xl font-black text-slate-950">Next growth moves</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Trigger weekly recommendation emails from child challenge clusters.</li>
              <li>Offer audio narration upsell after full story unlock.</li>
              <li>Track share link opens and parent-to-parent conversion.</li>
              <li>Promote bundles around sleep, confidence and daycare transitions.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
