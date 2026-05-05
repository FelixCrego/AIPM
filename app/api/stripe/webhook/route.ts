import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { markCustomerSubscriptionCanceled, upsertOrganizationBillingFromSubscription } from "@/lib/billing";
import { getStripeOrThrow, stripeWebhookSecret } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const handledSubscriptionEvents = new Set<Stripe.Event.Type>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export async function POST(request: Request) {
  const stripe = getStripeOrThrow();
  const signature = request.headers.get("stripe-signature");

  if (!stripeWebhookSecret) {
    return NextResponse.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, stripeWebhookSecret);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid webhook signature" },
      { status: 400 },
    );
  }

  try {
    if (handledSubscriptionEvents.has(event.type)) {
      await upsertOrganizationBillingFromSubscription(event.data.object as Stripe.Subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      await markCustomerSubscriptionCanceled(event.data.object as Stripe.Subscription);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertOrganizationBillingFromSubscription(subscription);
      }
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to process Stripe webhook" },
      { status: 500 },
    );
  }
}
