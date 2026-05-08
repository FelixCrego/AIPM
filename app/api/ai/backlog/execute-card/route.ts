import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCardExecutionReport } from "@/lib/ai/card-execution";
import { isDemoMode } from "@/lib/config";
import { demoProjects, demoRepositories } from "@/lib/demo-data";
import { createIssue, updateIssue } from "@/lib/github/issues";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cardSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(3),
  estimate: z.string().default("3 pts"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  column: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  commands: z.array(z.string()).default([]),
});

const executeCardRequestSchema = z.object({
  projectId: z.string().min(1),
  card: cardSchema,
});

type GitHubIssueResponse = {
  number?: number;
  html_url?: string;
};

const reportBody = ({
  card,
  projectName,
  repoFullName,
  summary,
  implementationNotes,
  testsRun,
  filesChanged,
  risks,
}: {
  card: z.infer<typeof cardSchema>;
  projectName: string;
  repoFullName: string;
  summary: string;
  implementationNotes: string[];
  testsRun: string[];
  filesChanged: string[];
  risks: string[];
}) => `## AI completion record

Project: ${projectName}
Repository: ${repoFullName}
Priority: ${card.priority}
Estimate: ${card.estimate}

## Card
${card.summary}

## Completion summary
${summary}

## Implementation notes
${implementationNotes.map((item) => `- ${item}`).join("\n")}

## Tests run
${testsRun.map((item) => `- ${item}`).join("\n")}

## Files changed
${filesChanged.length ? filesChanged.map((item) => `- ${item}`).join("\n") : "- Not reported"}

## Remaining risks
${risks.length ? risks.map((item) => `- ${item}`).join("\n") : "- None reported"}
`;

export async function POST(request: Request) {
  try {
    const { projectId, card } = executeCardRequestSchema.parse(await request.json());

    if (isDemoMode) {
      const project = demoProjects.find((item) => item.id === projectId) ?? demoProjects[0];
      const repository = demoRepositories.find((item) => item.id === project.repositoryId) ?? demoRepositories[0];
      const report = await generateCardExecutionReport(card, {
        projectName: project.name,
        repoFullName: repository.fullName,
        defaultBranch: repository.defaultBranch,
      });

      return NextResponse.json({
        ok: true,
        result: {
          status: "DONE",
          report,
          issueUrl: `${repository.url}/issues/ai-${encodeURIComponent(card.title.toLowerCase().replace(/\s+/g, "-"))}`,
        },
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { repository: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (!project.repository) {
      throw new Error("Connect this project to a GitHub repository before running the AI wand.");
    }

    const report = await generateCardExecutionReport(card, {
      projectName: project.name,
      repoFullName: project.repository.fullName,
      defaultBranch: project.repository.defaultBranch,
    });

    let issueUrl: string | null = null;
    let issueError: string | null = null;

    try {
      const issue = (await createIssue(project.repository.fullName, {
        title: `[AI completed] ${card.title}`,
        body: reportBody({
          card,
          projectName: project.name,
          repoFullName: project.repository.fullName,
          summary: report.summary,
          implementationNotes: report.implementationNotes,
          testsRun: report.testsRun,
          filesChanged: report.filesChanged,
          risks: report.risks,
        }),
      })) as GitHubIssueResponse;

      issueUrl = issue.html_url ?? null;
      if (typeof issue.number === "number") {
        await updateIssue(project.repository.fullName, issue.number, { state: "closed" });
      }
    } catch (error) {
      issueError = error instanceof Error ? error.message : "Unable to write GitHub completion issue";
    }

    await prisma.activityLog.create({
      data: {
        organizationId: project.organizationId,
        actor: "AI",
        type: "CARD_COMPLETED",
        message: `AI completed ${card.title}.`,
        metadata: {
          projectId: project.id,
          repositoryId: project.repository.id,
          issueUrl,
          issueError,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      result: {
        status: "DONE",
        report,
        issueUrl,
        issueError,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
