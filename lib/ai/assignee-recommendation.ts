import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getDevelopers, getIssues, getPullRequests } from "@/lib/data";

export const assigneeRecommendationSchema = z.object({
  recommendedDeveloper: z.string(),
  reason: z.string(),
  backupDeveloper: z.string(),
  risk: z.enum(["Low", "Medium", "High"]),
});

export type AssigneeRecommendationOutput = z.infer<typeof assigneeRecommendationSchema>;

type DeveloperCandidate = {
  name: string;
  githubUsername?: string | null;
  strengths: string[];
  assignments: unknown[];
};

type IssueCandidate = {
  id: string;
  labels: string[];
  aiRiskScore?: number | null;
};

type PullRequestCandidate = {
  author: string;
  state: string;
};

export const recommendAssignee = async (issueId: string): Promise<AssigneeRecommendationOutput> => {
  const [developers, issues, prs] = await Promise.all([getDevelopers(), getIssues(), getPullRequests()]);
  const developerPool = developers as DeveloperCandidate[];
  const issuePool = issues as IssueCandidate[];
  const prPool = prs as PullRequestCandidate[];
  const issue = issuePool.find((item) => item.id === issueId);

  if (!issue) {
    throw new Error("Issue not found");
  }

  const ai = await runStructuredOutput({
    system: AI_OPERATOR_STYLE,
    user: `Recommend assignee for issue using these developers and workload.\nIssue: ${JSON.stringify(issue)}\nDevelopers:${JSON.stringify(developers)}\nPRs:${JSON.stringify(prs)}`,
    schema: assigneeRecommendationSchema,
  });

  if (ai) {
    return ai;
  }

  const ranked = developerPool
    .map((developer) => {
      const activePrCount = prPool.filter(
        (pr) => pr.author === developer.githubUsername && pr.state === "OPEN",
      ).length;
      const loadScore = activePrCount + developer.assignments.length;
      const strengthMatch = developer.strengths.some((strength) =>
        issue.labels.join(" ").toLowerCase().includes(strength.toLowerCase().split("/")[0]),
      )
        ? 2
        : 0;

      return { developer, score: loadScore - strengthMatch };
    })
    .sort((a, b) => a.score - b.score);

  return {
    recommendedDeveloper: ranked[0]?.developer.name ?? "Unassigned",
    reason: "Best balance of relevant strengths and current workload.",
    backupDeveloper: ranked[1]?.developer.name ?? ranked[0]?.developer.name ?? "Unassigned",
    risk: (issue.aiRiskScore ?? 0) > 0.7 ? "High" : "Medium",
  };
};
