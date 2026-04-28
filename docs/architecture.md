# Magic Parent AI MVP architecture

## Product surface

- `/` - emotional landing page with positioning, use cases, testimonials, pricing, FAQ, and CTA.
- `/create` - six-step onboarding flow for child name, age, challenge, favorite hero, tone, length, preview generation, share, and unlock.
- `/stories` - retention hub concept for saved stories, weekly recommendations, reminders, and bedtime streaks.
- `/admin` - founder dashboard concept for users, purchases, conversion, revenue, and top story themes.
- `/api/generate-story` - validates story inputs, builds the psychology-aware prompt, calls OpenAI when configured, falls back to local mock output, and optionally writes to Supabase.
- `/api/checkout` - creates a Stripe Checkout session for a premium story; falls back to a mock success URL when Stripe is not configured.
- `/api/telegram/webhook` - Telegram bot webhook that walks parents through story inputs and sends a preview plus parent guidance.
- `/api/admin/metrics` - returns demo metrics or reads live Supabase counts when configured.

## File architecture

- `app/` - Next.js App Router pages and API routes.
- `components/StoryCreator.tsx` - client onboarding, generation, preview, checkout, and share experience.
- `lib/product.ts` - product constants for use cases, pricing, examples, testimonials, and retention.
- `lib/prompts.ts` - story request schema, prompt engineering system, and local mock generator.
- `lib/story-engine.ts` - shared story generation and persistence used by web and Telegram.
- `lib/telegram.ts` - Telegram Bot API helper, update parser, and webhook URL helper.
- `lib/stripe.ts` - Stripe client and monetization product definitions.
- `lib/supabase.ts` - Supabase service-role helper.
- `supabase/schema.sql` - production table schema, indexes, and row-level security starting point.

## Telegram bot flow

The Telegram MVP supports the fastest chat-based launch:

1. Parent sends `/start`.
2. Bot asks for child name.
3. Bot asks for age.
4. Bot offers common challenges as inline buttons or accepts free text.
5. Bot asks for favorite hero.
6. Bot offers tone and length buttons.
7. Bot generates a preview through the shared story engine.
8. Bot sends the parent guidance note and links to the web app for full story unlock.

Webhook setup:

1. Create a bot in BotFather and copy `TELEGRAM_BOT_TOKEN`.
2. Set `NEXT_PUBLIC_APP_URL` to the production URL.
3. Set `TELEGRAM_WEBHOOK_SECRET` to a random string.
4. Run `npm run telegram:webhook` after deploy.

## Prompt engineering system

The prompt has a strict two-part structure:

1. System prompt defines safety, emotional tone, therapeutic metaphor boundaries, JSON shape, and parent guidance requirements.
2. User prompt injects child attributes, challenge, favorite hero, tone, and length, then requires a healing arc:
   - feeling
   - naming
   - trying
   - support
   - mastery
   - bedtime rest

The output is strict JSON:

- `title`
- `preview`
- `fullStory`
- `parentMessage.whyItHelps`
- `parentMessage.behaviorMeaning`
- `parentMessage.realLifeSteps`
- `shareText`
- `weeklyRecommendation`

## Stripe payment logic

The current flow supports the fastest sellable MVP:

1. Parent generates a free preview.
2. `Unlock full story` posts `storyId`, `email`, and `priceId` to `/api/checkout`.
3. API creates a Stripe Checkout payment session using `STRIPE_PREMIUM_PRICE_ID`.
4. Stripe returns to `/stories?checkout=success`.
5. Next production step: add a Stripe webhook to mark `purchases.status = paid` and unlock `stories.status = paid`.

Suggested product ladder:

- $0 free preview.
- $7 full premium story.
- $19 story pack.
- $9-19/month weekly bedtime club.
- Upsell audio narration after story unlock.

## Viral growth ideas

- Share card: "I made a magical bedtime story for my child."
- Watermarked public story preview with child first name and challenge theme.
- Parent referral: give one extra story credit for each paying friend.
- Seasonal packs: first day of daycare, new sibling, doctor visit, moving house, holiday sleep routine.
- Printable keepsake PDF with "created for" dedication page.
- Audio narration teaser that parents can share in family chats.
- Creator/affiliate program for parenting coaches and sleep consultants.

## Fastest MVP launch plan

1. Configure OpenAI, Supabase, and Stripe environment variables.
2. Create one Stripe product and price for the $7 premium story.
3. Run Supabase schema and store generated preview records.
4. Ship the landing page plus `/create` flow.
5. Add Stripe webhook for paid unlocks.
6. Launch with three high-intent angles: sleep alone, daycare fear, tantrums.
7. Measure preview-to-checkout conversion and top challenge themes in `/admin`.
8. Add audio narration and story packs once checkout conversion is proven.
