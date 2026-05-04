import OpenAI from "openai";
import { z, ZodType } from "zod";

const openaiApiKey = process.env.OPENAI_API_KEY;

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
    })
  : null;

const extractJson = (raw: string) => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return raw.slice(start, end + 1);
};

export const runStructuredOutput = async <T>({
  system,
  user,
  schema,
}: {
  system: string;
  user: string;
  schema: ZodType<T>;
}): Promise<T | null> => {
  if (!openai) {
    return null;
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = JSON.parse(extractJson(content));
  return schema.parse(parsed);
};

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export const runConversationReply = async ({
  messages,
  userMessage,
}: {
  messages: ConversationMessage[];
  userMessage: string;
}): Promise<string | null> => {
  if (!openai) {
    return null;
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    temperature: 0.35,
    messages: [
      {
        role: "system",
        content:
          `${AI_OPERATOR_STYLE}\nYou are in voice conversation mode. Keep replies concise, ask one clarifying question when needed, and keep context for later ticket extraction.`,
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  return content || null;
};

export const transcribeAudioToText = async (audio: File): Promise<string | null> => {
  if (!openai) {
    return null;
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audio,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe",
  });

  const text = transcription.text?.trim();
  return text ? text : null;
};

export const synthesizeSpeech = async (input: string): Promise<ArrayBuffer | null> => {
  if (!openai) {
    return null;
  }

  const speech = await openai.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE ?? "alloy",
    input,
    response_format: "mp3",
  });

  return speech.arrayBuffer();
};

export const AI_OPERATOR_STYLE = `You are DevPilot AI, acting as an experienced engineering manager, product manager, and QA lead.
Give direct, actionable recommendations.
Every response must include: what matters, why it matters, who should act, what happens next, and risk level.
Avoid vague language and avoid generic summaries.`;

export const zodStringArray = z.array(z.string()).default([]);
