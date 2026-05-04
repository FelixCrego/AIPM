import { NextResponse } from "next/server";

import { reviewPullRequest } from "@/lib/ai/qa-review";
import { qaReviewRequestSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = qaReviewRequestSchema.parse(await request.json());
    const review = await reviewPullRequest(body.pullRequestId);

    return NextResponse.json({ ok: true, review });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
