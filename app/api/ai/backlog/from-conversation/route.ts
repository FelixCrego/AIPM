import { NextResponse } from "next/server";

import { generateBacklogFromProjectPrompt } from "@/lib/ai/backlog-generation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawMessages = Array.isArray((body as { messages?: unknown[] })?.messages)
      ? (body as { messages: unknown[] }).messages
      : [];

    const normalizedMessages = rawMessages
      .map((item) => {
        const source = item as { role?: unknown; content?: unknown };
        const role = source?.role === "assistant" ? "assistant" : "user";
        const content = typeof source?.content === "string" ? source.content.trim() : "";
        return { role, content };
      })
      .filter((message) => message.content.length > 0)
      .slice(-30);

    const conversationTranscript = normalizedMessages.length
      ? normalizedMessages
          .map((message) => `${message.role.toUpperCase()}: ${message.content.slice(0, 1200)}`)
          .join("\n")
      : "USER: Create actionable Kanban tickets from the current voice planning conversation.";

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
