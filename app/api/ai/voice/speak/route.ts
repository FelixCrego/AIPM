import { NextResponse } from "next/server";
import { z } from "zod";

import { synthesizeSpeech } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

const speakRequestSchema = z.object({
  text: z.string().min(2).max(1200),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text } = speakRequestSchema.parse(body);
    const audio = await synthesizeSpeech(text);

    if (!audio) {
      return NextResponse.json(
        { ok: false, error: "Voice synthesis is unavailable. Set OPENAI_API_KEY." },
        { status: 503 },
      );
    }

    const voiceBlob = new Blob([audio], { type: "audio/mpeg" });
    return new NextResponse(voiceBlob, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
