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
type BacklogItem = z.infer<typeof backlogItemSchema>;

const aiRawBacklogSchema = z.object({
  projectName: z.string().optional(),
  overview: z.string().optional(),
  items: z
    .array(
      z.object({
        title: z.string().optional(),
        summary: z.string().optional(),
        estimate: z.string().optional(),
        priority: z.string().optional(),
        column: z.string().optional(),
      }),
    )
    .optional(),
});

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

const normalizePriority = (value: string | undefined, fallbackText: string): BacklogPriority => {
  const upper = (value ?? "").trim().toUpperCase().replaceAll(" ", "_");
  if (upper === "LOW" || upper === "MEDIUM" || upper === "HIGH" || upper === "CRITICAL") {
    return upper;
  }
  return inferPriority(fallbackText);
};

const normalizeColumn = (value: string | undefined, index: number): BacklogColumn => {
  const upper = (value ?? "").trim().toUpperCase().replaceAll(" ", "_");
  if (upper === "TODO" || upper === "IN_PROGRESS" || upper === "DONE") {
    return upper;
  }
  if (index < 5) return "TODO";
  if (index < 8) return "IN_PROGRESS";
  return "DONE";
};

const ensureCodexReadySummary = (summary: string, title: string): string => {
  const clean = summary.trim();
  if (clean.length === 0) {
    return [
      `Goal: Implement ${title}.`,
      "Implementation: Use existing Next.js + TypeScript patterns and keep changes scoped to affected modules.",
      "Acceptance Criteria: Behavior is testable and linked to clear output in UI/API.",
      "Verification: Run GitHub checks and validate Vercel preview deployment.",
    ].join("\n");
  }

  const hasGoal = /goal:/i.test(clean);
  const hasImplementation = /implementation:/i.test(clean);
  const hasAcceptance = /acceptance criteria:/i.test(clean);
  const hasVerification = /verification:/i.test(clean);
  const lines = [clean];

  if (!hasGoal) lines.unshift(`Goal: ${title}.`);
  if (!hasImplementation) lines.push("Implementation: Use existing Next.js + TypeScript patterns and keep changes scoped to impacted modules.");
  if (!hasAcceptance) lines.push("Acceptance Criteria: Output is deterministic and reviewable in PR.");
  if (!hasVerification) lines.push("Verification: Run GitHub CI and validate on Vercel preview URL.");

  return lines.join("\n");
};

const normalizeAiBacklog = (raw: z.infer<typeof aiRawBacklogSchema>, projectPrompt: string): GeneratedBacklog => {
  const rawItems = raw.items ?? [];
  const normalizedItems: BacklogItem[] = rawItems
    .map((item, index) => {
      const titleBase = (item.title ?? "").trim();
      const summaryBase = (item.summary ?? "").trim();
      const seed = titleBase || summaryBase || `Conversation task ${index + 1}`;
      const title = titleBase || titleCase(seed.split(" ").slice(0, 8).join(" "));
      const priority = normalizePriority(item.priority, `${title} ${summaryBase}`);
      const column = normalizeColumn(item.column, index);
      const estimate = (item.estimate ?? "").trim() || (priority === "HIGH" || priority === "CRITICAL" ? "5 pts" : priority === "MEDIUM" ? "3 pts" : "2 pts");

      return {
        title,
        summary: ensureCodexReadySummary(summaryBase, title),
        estimate,
        priority,
        column,
      };
    })
    .filter((item) => item.title.length > 0)
    .slice(0, 14);

  if (normalizedItems.length < 5) {
    const fallback = buildConversationFallback(projectPrompt);
    const merged = [...normalizedItems, ...fallback.items].slice(0, 14);
    return {
      projectName: (raw.projectName ?? fallback.projectName).trim() || fallback.projectName,
      overview: (raw.overview ?? fallback.overview).trim() || fallback.overview,
      items: merged.slice(0, Math.max(5, merged.length)),
    };
  }

  return {
    projectName: (raw.projectName ?? "").trim() || "Codex Backlog",
    overview:
      (raw.overview ?? "").trim() ||
      "Codex-ready backlog generated from the planning conversation for GitHub execution and Vercel validation.",
    items: normalizedItems,
  };
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
      summary: ensureCodexReadySummary(snippet, title),
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
  const projectContext = projects
    .slice(0, 6)
    .map((project) => {
      const record = project as {
        name?: string;
        repository?: { fullName?: string } | null;
        vercelProject?: { name?: string } | null;
      };
      return {
        name: record.name ?? "Unknown",
        repository: record.repository?.fullName ?? "Unlinked",
        vercelProject: record.vercelProject?.name ?? "Unlinked",
      };
    });

  try {
    const result = await runStructuredOutput({
      system: AI_OPERATOR_STYLE,
      user: `A user described a project in conversation form. Create codex-ready Kanban tickets.

Rules:
- Tickets must be implementable by Codex in a GitHub PR workflow.
- Prioritize tasks that fit the existing Next.js + TypeScript stack.
- Include concrete verification that references GitHub checks and Vercel preview validation.
- Use repository and Vercel project context when relevant.

Project request:
"${projectPrompt}"

Known repo/project context:
${JSON.stringify(projectContext)}

Return JSON with:
- projectName
- overview
- items[]
Each item must include:
- title
- summary
- estimate
- priority (LOW|MEDIUM|HIGH|CRITICAL)
- column (TODO|IN_PROGRESS|DONE)

Summary format should be codex-ready and include:
Goal:
Implementation:
Acceptance Criteria:
Verification:`,
      schema: aiRawBacklogSchema,
    });

    if (result) {
      return normalizeAiBacklog(result, projectPrompt);
    }
  } catch {
    // If model output fails validation or request errors, continue with deterministic fallback.
  }

  return buildConversationFallback(projectPrompt);
};
