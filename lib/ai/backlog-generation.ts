import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getProjects } from "@/lib/data";

const backlogItemSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimate: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  column: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

export const generatedBacklogSchema = z.object({
  projectName: z.string(),
  overview: z.string(),
  items: z.array(backlogItemSchema).min(5).max(14),
});

export type GeneratedBacklog = z.infer<typeof generatedBacklogSchema>;

const fallbackBacklog = (): GeneratedBacklog => ({
  projectName: "AI generated project",
  overview: "Initial backlog generated from the provided product brief.",
  items: [
    { title: "Define user stories", summary: "Capture top user workflows and edge cases.", estimate: "3 pts", priority: "HIGH", column: "TODO" },
    { title: "Set up data model", summary: "Draft entities and relationships for core features.", estimate: "5 pts", priority: "HIGH", column: "TODO" },
    { title: "Build auth flow", summary: "Implement sign in and session handling.", estimate: "5 pts", priority: "MEDIUM", column: "IN_PROGRESS" },
    { title: "Create primary dashboard", summary: "Add initial UI shell and navigation.", estimate: "5 pts", priority: "MEDIUM", column: "IN_PROGRESS" },
    { title: "QA release checklist", summary: "Prepare smoke tests and acceptance checklist.", estimate: "2 pts", priority: "LOW", column: "DONE" },
  ],
});

export const generateBacklogFromProjectPrompt = async (projectPrompt: string): Promise<GeneratedBacklog> => {
  const projects = await getProjects();

  try {
    const result = await runStructuredOutput({
      system: AI_OPERATOR_STYLE,
      user: `A user described a new app project. Build a practical Kanban backlog with actionable tasks.\nProject request: "${projectPrompt}"\nExisting projects for context: ${JSON.stringify(projects)}`,
      schema: generatedBacklogSchema,
    });

    if (result) {
      return result;
    }
  } catch {
    // If model output fails validation or request errors, continue with deterministic fallback.
  }

  return fallbackBacklog();
};
