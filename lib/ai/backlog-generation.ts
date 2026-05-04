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
type BacklogPriority = z.infer<typeof backlogItemSchema>["priority"];
type BacklogColumn = z.infer<typeof backlogItemSchema>["column"];

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const inferPriority = (value: string): BacklogPriority => {
  const text = value.toLowerCase();
  if (/(auth|security|payment|database|schema|api|deploy|production|outage)/.test(text)) {
    return "HIGH";
  }
  if (/(voice|chat|dashboard|ui|frontend|workflow|feature)/.test(text)) {
    return "MEDIUM";
  }
  if (/(test|qa|docs|polish|cleanup|refactor)/.test(text)) {
    return "LOW";
  }
  return "MEDIUM";
};

const buildConversationFallback = (projectPrompt: string): GeneratedBacklog => {
  const normalized = projectPrompt
    .replaceAll(/\b(USER|ASSISTANT):/gi, "")
    .replaceAll(/\s+/g, " ")
    .trim();

  const chunks = normalized
    .split(/[\n.!?;]+/g)
    .map((chunk) => chunk.replaceAll(/["`]/g, "").trim())
    .filter((chunk) => chunk.length > 18);

  const deduped = Array.from(new Set(chunks.map((chunk) => chunk.toLowerCase()))).slice(0, 10);
  const sourceItems = (deduped.length ? deduped : [normalized]).map((item) => item.slice(0, 180));

  const rootWords = normalized
    .replaceAll(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);

  const projectName = rootWords.length
    ? `${titleCase(rootWords.join(" "))} Project`
    : "Conversation Backlog Project";

  const items: GeneratedBacklog["items"] = sourceItems.slice(0, 8).map((snippet, index) => {
    const words = snippet.split(" ").filter(Boolean);
    const title = titleCase(words.slice(0, 7).join(" ")) || `Backlog Item ${index + 1}`;
    const priority = inferPriority(snippet);
    const estimate = priority === "HIGH" ? "5 pts" : priority === "MEDIUM" ? "3 pts" : "2 pts";
    const column: BacklogColumn = index < 4 ? "TODO" : index < 7 ? "IN_PROGRESS" : "DONE";

    return {
      title,
      summary: snippet,
      estimate,
      priority: priority === "HIGH" && index >= 6 ? "MEDIUM" : priority,
      column,
    };
  });

  while (items.length < 5) {
    const idx = items.length + 1;
    items.push({
      title: `Clarify Requirement ${idx}`,
      summary: "Capture missing acceptance criteria from the voice planning conversation.",
      estimate: "2 pts",
      priority: "MEDIUM",
      column: idx < 4 ? "TODO" : "IN_PROGRESS",
    });
  }

  return {
    projectName,
    overview: "Backlog extracted from the current planning conversation.",
    items: items.slice(0, 14),
  };
};

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

  return buildConversationFallback(projectPrompt);
};
