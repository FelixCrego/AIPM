import { NextResponse } from "next/server";

import { createIssue } from "@/lib/github/issues";
import { issueCreateSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = issueCreateSchema.parse(await request.json());
    const issue = await createIssue(body.repoFullName, {
      title: body.title,
      body: body.body,
      labels: body.labels,
      assignees: body.assignees,
    });

    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
