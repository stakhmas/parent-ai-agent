import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }

  return new Stripe(key, {
    appInfo: {
      name: "Magic Parent AI",
      version: "1.0.0"
    }
  });
}

export const pricing = {
  premiumStory: {
    label: "Full premium story",
    price: 700,
    currency: "usd"
  },
  storyPack: {
    label: "5 story pack",
    price: 1900,
    currency: "usd"
  },
  weeklySubscription: {
    label: "Weekly magic stories",
    price: 900,
    currency: "usd"
  }
};
