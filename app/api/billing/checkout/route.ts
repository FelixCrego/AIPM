import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/config";
import { getOrganization } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { getAppUrl, getStripeOrThrow, stripePriceId } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (isDemoMode) {
      return NextResponse.json(
        { ok: false, error: "Stripe checkout requires DATABASE_URL so billing can be tied to an organization." },
        { status: 400 },
      );
    }

    if (!stripePriceId) {
      return NextResponse.json({ ok: false, error: "STRIPE_PRICE_ID is not configured." }, { status: 400 });
    }

    const stripe = getStripeOrThrow();
    const organization = await getOrganization();
    let customerId = organization.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: organization.name,
        metadata: { organizationId: organization.id },
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=canceled`,
      subscription_data: {
        metadata: { organizationId: organization.id },
      },
      metadata: { organizationId: organization.id },
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to start checkout" },
      { status: 500 },
    );
  }
}
