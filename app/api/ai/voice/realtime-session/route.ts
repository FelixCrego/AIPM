import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RealtimeClientSecretResponse = {
  value?: string;
  expires_at?: number;
  client_secret?: {
    value?: string;
    expires_at?: number;
  };
};

export async function POST() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview",
          instructions:
            "You are DevPilot AI in live voice mode. Keep replies concise, ask one focused question when needed, and retain details for Kanban ticket extraction.",
          audio: {
            input: {
              transcription: {
                model: process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
              },
              turn_detection: {
                type: "server_vad",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              voice: process.env.OPENAI_REALTIME_VOICE ?? "alloy",
            },
          },
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as RealtimeClientSecretResponse | { error?: { message?: string } } | null;

    if (!response.ok) {
      const errorPayload = payload as { error?: { message?: string } } | null;
      throw new Error(errorPayload?.error?.message ?? `OpenAI realtime session failed: ${response.status}`);
    }

    const successPayload = payload as RealtimeClientSecretResponse | null;
    const clientSecret = successPayload?.client_secret?.value ?? successPayload?.value;
    const expiresAt = successPayload?.client_secret?.expires_at ?? successPayload?.expires_at ?? null;

    if (!clientSecret) {
      throw new Error("OpenAI realtime session did not return a client secret");
    }

    return NextResponse.json({
      ok: true,
      clientSecret,
      expiresAt,
      model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview",
      transcriptionModel: process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
