import { NextResponse } from "next/server";
import { z } from "zod";

import { generateBacklogFromProjectPrompt } from "@/lib/ai/backlog-generation";

export const dynamic = "force-dynamic";

const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const extractBacklogSchema = z.object({
  messages: z.array(conversationMessageSchema).min(2).max(80),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages } = extractBacklogSchema.parse(body);

    const conversationTranscript = messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const backlog = await generateBacklogFromProjectPrompt(
      `Generate Kanban tickets from this product conversation:\n${conversationTranscript}`,
    );

    return NextResponse.json({ ok: true, backlog });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
