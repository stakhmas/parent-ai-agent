# Magic Parent AI

AI Personal Fairy Tales is a mobile-first MVP for parents who want personalized bedtime stories that gently support sleep, fears, tantrums, daycare transitions, confidence, jealousy, potty training, and other everyday parenting challenges.

## Stack

- Next.js App Router
- Tailwind CSS
- OpenAI Chat Completions with JSON output
- Supabase for users, stories, purchases, retention, and analytics
- Stripe Checkout for paid story unlocks

## Project structure

- `app/page.tsx` - landing page with hero, how it works, examples, testimonials, pricing, FAQ.
- `app/create/page.tsx` - six-step onboarding flow.
- `components/StoryCreator.tsx` - client-side story wizard, preview, checkout, and share UX.
- `app/api/generate-story/route.ts` - validates inputs, calls OpenAI, saves previews to Supabase.
- `app/api/checkout/route.ts` - creates Stripe Checkout sessions or returns a mock checkout URL.
- `app/stories/page.tsx` - retention hub for saved stories, weekly recommendations, reminders, and streaks.
- `app/admin/page.tsx` - founder dashboard UI.
- `app/api/admin/metrics/route.ts` - Supabase-backed admin metrics endpoint.
- `app/api/telegram/webhook/route.ts` - Telegram bot webhook with step-by-step story creation.
- `lib/prompts.ts` - prompt engineering system and local mock story fallback.
- `lib/story-engine.ts` - shared OpenAI/mock story generation and persistence.
- `lib/telegram.ts` - Telegram Bot API helper.
- `lib/supabase.ts` - Supabase service client helper.
- `lib/stripe.ts` - Stripe helper and pricing primitives.
- `supabase/schema.sql` - database schema.
- `docs/architecture.md` - monetization, growth, and fast launch plan.

## Setup

1. Install dependencies:

   `npm install`

2. Configure environment:

   `cp .env.example .env.local`

3. Add keys as available:

   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PREMIUM_PRICE_ID`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`

4. Run locally:

   `npm run dev`

If OpenAI or Stripe keys are missing, the app runs in mock mode so the MVP can still be tested end-to-end.

## Telegram bot setup

1. Create a bot in Telegram via BotFather and copy the token.
2. Add `TELEGRAM_BOT_TOKEN` to `.env.local`.
3. Add a random `TELEGRAM_WEBHOOK_SECRET` value.
4. Set `NEXT_PUBLIC_APP_URL` to the deployed app URL, for example `https://your-domain.com`.
5. Register the webhook:

   `npm run telegram:webhook`

Telegram will call `/api/telegram/webhook`. In local/mock mode, webhook requests can be tested without a bot token; messages are logged as successful mock sends.

## Quality checks

- `npm run typecheck`
- `npm run lint`
- `npm run build`
