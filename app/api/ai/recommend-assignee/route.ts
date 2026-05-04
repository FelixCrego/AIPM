import { NextResponse } from "next/server";

import { recommendAssignee } from "@/lib/ai/assignee-recommendation";
import { recommendAssigneeRequestSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = recommendAssigneeRequestSchema.parse(await request.json());
    const recommendation = await recommendAssignee(body.issueId);

    return NextResponse.json({ ok: true, recommendation });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
