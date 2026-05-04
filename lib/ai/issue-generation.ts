import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getIssues, getProjects } from "@/lib/data";

export const generatedIssueSchema = z.object({
  title: z.string(),
  body: z.string(),
  acceptanceCriteria: z.array(z.string()),
  labels: z.array(z.string()),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  suggestedAssignee: z.string(),
});

export type GeneratedIssueOutput = z.infer<typeof generatedIssueSchema>;

export const generateIssueFromProjectRequest = async (
  plainEnglishProjectRequest: string,
): Promise<GeneratedIssueOutput> => {
  const [projects, issues] = await Promise.all([getProjects(), getIssues()]);

  const ai = await runStructuredOutput({
    system: AI_OPERATOR_STYLE,
    user: `Generate a GitHub issue from this request: "${plainEnglishProjectRequest}".\nProjects:${JSON.stringify(projects)}\nExisting Issues:${JSON.stringify(issues)}`,
    schema: generatedIssueSchema,
  });

  if (ai) {
    return ai;
  }

  return {
    title: `Implement: ${plainEnglishProjectRequest.slice(0, 80)}`,
    body: `## Context\n${plainEnglishProjectRequest}\n\n## Expected Outcome\nDeliver behavior with test coverage and release notes.`,
    acceptanceCriteria: [
      "Feature behavior is implemented",
      "Automated tests cover critical path",
      "QA checklist is completed on preview deployment",
    ],
    labels: ["ai-generated", "needs-triage"],
    priority: "MEDIUM",
    suggestedAssignee: "Narendra",
  };
};
