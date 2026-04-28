import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";

const CheckoutSchema = z.object({
  storyId: z.string().optional(),
  email: z.string().email().optional(),
  parentEmail: z.string().email().optional().or(z.literal("")),
  priceId: z.string().optional()
});

export async function POST(request: Request) {
  const body = CheckoutSchema.parse(await request.json());
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json({
      mode: "mock",
      checkoutUrl: "/stories?checkout=mock",
      message: "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_PREMIUM_PRICE_ID."
    });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const price = body.priceId || process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!price) {
    return NextResponse.json(
      { error: "Missing Stripe price id. Set STRIPE_PREMIUM_PRICE_ID." },
      { status: 400 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: body.email || body.parentEmail || undefined,
    line_items: [{ price, quantity: 1 }],
    metadata: {
      storyId: body.storyId || "preview"
    },
    success_url: `${origin}/stories?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/create?checkout=cancelled`
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
