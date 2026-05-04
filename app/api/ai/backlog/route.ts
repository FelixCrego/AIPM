import { NextResponse } from "next/server";
import { z } from "zod";

import { generateBacklogFromProjectPrompt } from "@/lib/ai/backlog-generation";

export const dynamic = "force-dynamic";

const backlogRequestSchema = z.object({
  prompt: z.string().min(20, "Please share a bit more detail about your app idea."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt } = backlogRequestSchema.parse(body);

    const backlog = await generateBacklogFromProjectPrompt(prompt);
    return NextResponse.json({ ok: true, backlog });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
