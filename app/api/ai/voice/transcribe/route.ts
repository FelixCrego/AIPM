import { NextResponse } from "next/server";

import { transcribeAudioToText } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (!(audio instanceof File)) {
      return NextResponse.json({ ok: false, error: "Audio file is required." }, { status: 400 });
    }

    const transcript = await transcribeAudioToText(audio);
    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Voice transcription is unavailable. Set OPENAI_API_KEY." },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, transcript });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
