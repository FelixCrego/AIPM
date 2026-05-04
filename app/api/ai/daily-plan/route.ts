import { NextResponse } from "next/server";

import { generateDailyPlan } from "@/lib/ai/daily-plan";
import { dailyPlanRequestSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    dailyPlanRequestSchema.parse(body);

    const plan = await generateDailyPlan();
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
