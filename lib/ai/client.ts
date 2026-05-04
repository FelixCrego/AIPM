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

export const AI_OPERATOR_STYLE = `You are DevPilot AI, acting as an experienced engineering manager, product manager, and QA lead.
Give direct, actionable recommendations.
Every response must include: what matters, why it matters, who should act, what happens next, and risk level.
Avoid vague language and avoid generic summaries.`;

export const zodStringArray = z.array(z.string()).default([]);
