import { NextResponse } from "next/server";

import { isDemoMode } from "@/lib/config";
import { getOrganization } from "@/lib/data";
import { getAppUrl, getStripeOrThrow } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (isDemoMode) {
      return NextResponse.json(
        { ok: false, error: "Stripe customer portal requires DATABASE_URL so billing can be tied to an organization." },
        { status: 400 },
      );
    }

    const organization = await getOrganization();
    if (!organization.stripeCustomerId) {
      return NextResponse.json({ ok: false, error: "No Stripe customer exists yet. Start checkout first." }, { status: 400 });
    }

    const stripe = getStripeOrThrow();
    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${getAppUrl()}/settings`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to open billing portal" },
      { status: 500 },
    );
  }
}
