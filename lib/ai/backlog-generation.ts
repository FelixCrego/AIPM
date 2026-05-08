import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getProjects } from "@/lib/data";

export const backlogItemSchema = z.object({
  title: z.string().min(4),
  summary: z.string().min(20),
  estimate: z.string().min(2),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  column: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  commands: z.array(z.string().min(4)).min(1).max(8),
});

export const generatedBacklogSchema = z.object({
  projectName: z.string().min(3),
  overview: z.string().min(20),
  items: z.array(backlogItemSchema).min(5).max(14),
});

export type GeneratedBacklog = z.infer<typeof generatedBacklogSchema>;
export type GeneratedBacklogItem = z.infer<typeof backlogItemSchema>;

const generatedBacklogCardSchema = z.object({
  item: backlogItemSchema,
});

type BacklogCardContext = {
  projectName?: string;
  overview?: string;
  existingTitles?: string[];
};

const buildPrompt = (projectPrompt: string, projectContext: unknown) => `Create an AI-generated, Codex-ready Kanban backlog from this planning conversation.

You must return JSON only.
No placeholders. No generic sample tickets. No static templates.
Every ticket must be directly derived from the conversation context.

Tech/Execution context:
- Repository workflow is GitHub PR based.
- Deploy/validation workflow is Vercel.
- Tickets should be actionable by Codex CLI agents.

Conversation input:
${projectPrompt}

Known project context:
${JSON.stringify(projectContext)}

Output schema:
{
  "projectName": "string",
  "overview": "string",
  "items": [
    {
      "title": "string",
      "summary": "string with Goal, Implementation, Acceptance Criteria, Verification",
      "estimate": "string (e.g. 2 pts, 3 pts, 5 pts)",
      "priority": "LOW|MEDIUM|HIGH|CRITICAL",
      "column": "TODO|IN_PROGRESS|DONE",
      "commands": ["Codex CLI-ready command(s) relevant to this ticket"]
    }
  ]
}

Rules for commands:
- commands must be runnable-oriented strings for implementation or verification.
- Prefer repo-realistic commands such as:
  - npm run build
  - npm test
  - npm run lint
  - vercel deploy --prod --yes
  - git checkout -b <branch>
  - git commit -m "<message>"
- Do not include markdown fences.
- Keep commands concise and specific to each ticket.`;

const buildCardPrompt = (
  cardPrompt: string,
  cardContext: BacklogCardContext,
  projectContext: unknown,
) => `Create one AI-generated, Codex-ready Kanban card for the TODO column.

You must return JSON only.
No placeholders. No generic sample tickets.
The card must be actionable by Codex CLI agents and directly based on the user request.

User request:
${cardPrompt}

Current Kanban context:
${JSON.stringify(cardContext)}

Known project context:
${JSON.stringify(projectContext)}

Output schema:
{
  "item": {
    "title": "string",
    "summary": "string with Goal, Implementation, Acceptance Criteria, Verification",
    "estimate": "string (e.g. 2 pts, 3 pts, 5 pts)",
    "priority": "LOW|MEDIUM|HIGH|CRITICAL",
    "column": "TODO",
    "commands": ["Codex CLI-ready command(s) relevant to this ticket"]
  }
}

Rules:
- Set column to TODO.
- Avoid duplicating existing card titles.
- Keep the title under 90 characters.
- Include concrete acceptance criteria in the summary.
- Do not include markdown fences.`;

export const generateBacklogFromProjectPrompt = async (projectPrompt: string): Promise<GeneratedBacklog> => {
  const projects = await getProjects();
  const projectContext = (projects as Array<{ name?: string; repository?: { fullName?: string } | null; vercelProject?: { name?: string } | null }>)
    .slice(0, 8)
    .map((project) => ({
      name: project.name ?? "Unknown",
      repository: project.repository?.fullName ?? "Unlinked",
      vercelProject: project.vercelProject?.name ?? "Unlinked",
    }));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await runStructuredOutput({
        system: `${AI_OPERATOR_STYLE}\nReturn strict JSON output for the requested schema.`,
        user: buildPrompt(projectPrompt, projectContext),
        schema: generatedBacklogSchema,
      });

      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown AI generation error");
    }
  }

  throw new Error(
    `AI Kanban generation failed. ${lastError?.message ?? "OpenAI did not return a valid Codex-ready backlog."}`,
  );
};

export const generateBacklogCardFromPrompt = async (
  cardPrompt: string,
  cardContext: BacklogCardContext = {},
): Promise<GeneratedBacklogItem> => {
  const projects = await getProjects();
  const projectContext = (projects as Array<{ name?: string; repository?: { fullName?: string } | null; vercelProject?: { name?: string } | null }>)
    .slice(0, 8)
    .map((project) => ({
      name: project.name ?? "Unknown",
      repository: project.repository?.fullName ?? "Unlinked",
      vercelProject: project.vercelProject?.name ?? "Unlinked",
    }));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await runStructuredOutput({
        system: `${AI_OPERATOR_STYLE}\nReturn strict JSON output for the requested schema.`,
        user: buildCardPrompt(cardPrompt, cardContext, projectContext),
        schema: generatedBacklogCardSchema,
      });

      if (result) {
        return { ...result.item, column: "TODO" };
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown AI card generation error");
    }
  }

  if (lastError) {
    throw new Error(`AI card generation failed. ${lastError.message}`);
  }

  const cleanedPrompt = cardPrompt.trim();
  return {
    title: `Implement ${cleanedPrompt.slice(0, 70)}`,
    summary: `Goal: ${cleanedPrompt}\nImplementation: Define the smallest shippable change and wire it through the relevant UI, API, or data layer.\nAcceptance Criteria: The requested behavior works from the project Kanban board.\nVerification: Run the relevant lint, typecheck, or build command before release.`,
    estimate: "3 pts",
    priority: "MEDIUM",
    column: "TODO",
    commands: ["npm run typecheck", "npm run lint"],
  };
};
