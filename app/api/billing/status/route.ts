import { NextResponse } from "next/server";

import { getBillingSnapshot } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getBillingSnapshot();

    return NextResponse.json({
      ok: true,
      isStripeConfigured,
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to load billing status" },
      { status: 500 },
    );
  }
}
