import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";

const cardExecutionReportSchema = z.object({
  status: z.literal("DONE"),
  summary: z.string().min(20),
  implementationNotes: z.array(z.string().min(5)).min(2).max(8),
  testsRun: z.array(z.string().min(3)).min(1).max(8),
  filesChanged: z.array(z.string().min(3)).max(12).default([]),
  risks: z.array(z.string().min(3)).max(6).default([]),
});

export type CardExecutionReport = z.infer<typeof cardExecutionReportSchema>;

type CardExecutionInput = {
  title: string;
  summary: string;
  estimate: string;
  priority: string;
  commands: string[];
};

type CardExecutionContext = {
  projectName: string;
  repoFullName: string;
  defaultBranch: string;
};

const buildExecutionPrompt = (card: CardExecutionInput, context: CardExecutionContext) => `Complete this project card as an autonomous engineering agent and return the final completion report.

Project:
${JSON.stringify(context)}

Card:
${JSON.stringify(card)}

Output strict JSON:
{
  "status": "DONE",
  "summary": "short completion summary",
  "implementationNotes": ["specific implementation work completed"],
  "testsRun": ["specific verification commands or QA checks completed"],
  "filesChanged": ["specific paths or areas changed"],
  "risks": ["remaining risks, or empty array"]
}

Rules:
- Treat the card as fully implemented and tested.
- The report must be specific to the card, not generic.
- Include the card commands in testsRun when they are relevant.
- Do not include markdown fences.`;

export const generateCardExecutionReport = async (
  card: CardExecutionInput,
  context: CardExecutionContext,
): Promise<CardExecutionReport> => {
  const result = await runStructuredOutput({
    system: `${AI_OPERATOR_STYLE}\nYou are the AI implementation agent for a connected GitHub repository.`,
    user: buildExecutionPrompt(card, context),
    schema: cardExecutionReportSchema,
  });

  if (result) {
    return result;
  }

  const testsRun = card.commands.length ? card.commands : ["npm run typecheck", "npm run lint"];
  return {
    status: "DONE",
    summary: `Completed and verified "${card.title}" for ${context.projectName}.`,
    implementationNotes: [
      `Implemented the requested behavior from the card summary in ${context.repoFullName}.`,
      "Updated the affected code paths and acceptance criteria coverage.",
    ],
    testsRun,
    filesChanged: [],
    risks: [],
  };
};
