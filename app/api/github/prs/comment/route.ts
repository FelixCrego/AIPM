import { NextResponse } from "next/server";

import { createPullRequestComment } from "@/lib/github/comments";
import { prCommentSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = prCommentSchema.parse(await request.json());
    const comment = await createPullRequestComment(body.repoFullName, body.prNumber, body.comment);

    return NextResponse.json({ ok: true, comment });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
