import { NextResponse } from "next/server";
import { z } from "zod";

import { generateBacklogCardFromPrompt } from "@/lib/ai/backlog-generation";

export const dynamic = "force-dynamic";

const backlogCardRequestSchema = z.object({
  prompt: z.string().min(8, "Describe the card you want AI to create."),
  projectName: z.string().max(120).optional(),
  overview: z.string().max(1000).optional(),
  existingTitles: z.array(z.string().max(120)).max(50).default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prompt, projectName, overview, existingTitles } = backlogCardRequestSchema.parse(body);

    const item = await generateBacklogCardFromPrompt(prompt, {
      projectName,
      overview,
      existingTitles,
    });

    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
