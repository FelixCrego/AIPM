import Stripe from "stripe";

export const stripePriceId = process.env.STRIPE_PRICE_ID;
export const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const isStripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && stripePriceId);

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      appInfo: {
        name: "DevPilot AI",
      },
    })
  : null;

export const getStripeOrThrow = () => {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.");
  }

  return stripe;
};

export const getAppUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!appUrl) {
    return "http://localhost:3000";
  }

  return appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
};
