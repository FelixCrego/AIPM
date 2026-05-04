import { NextResponse } from "next/server";
import { z } from "zod";

import { runConversationReply } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

const conversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const conversationRequestSchema = z.object({
  messages: z.array(conversationMessageSchema).max(40).default([]),
  userMessage: z.string().min(2).max(2000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages, userMessage } = conversationRequestSchema.parse(body);
    const reply = await runConversationReply({ messages, userMessage });

    if (!reply) {
      return NextResponse.json({
        ok: true,
        reply:
          "I captured that. Keep going with scope, audience, timeline, and acceptance criteria so I can extract stronger Kanban tickets.",
      });
    }

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
