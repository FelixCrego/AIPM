import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getPullRequestById } from "@/lib/data";

export const qaReviewSchema = z.object({
  summary: z.string(),
  satisfiesIssue: z.boolean(),
  missingTests: z.array(z.string()),
  risks: z.array(z.string()),
  checklist: z.array(
    z.object({
      item: z.string(),
      status: z.enum(["pass", "fail", "needs_attention"]),
    }),
  ),
  recommendation: z.enum(["approve", "request_changes", "needs_qa", "block_merge"]),
  riskLevel: z.enum(["Low", "Medium", "High"]),
});

export type QAReviewOutput = z.infer<typeof qaReviewSchema>;

export const reviewPullRequest = async (pullRequestId: string): Promise<QAReviewOutput> => {
  const pr = await getPullRequestById(pullRequestId);
  if (!pr) {
    throw new Error("Pull request not found");
  }

  const ai = await runStructuredOutput({
    system: AI_OPERATOR_STYLE,
    user: `Review this PR for QA and release readiness:\n${JSON.stringify(pr)}`,
    schema: qaReviewSchema,
  });

  if (ai) {
    return ai;
  }

  const riskLevel = (pr.aiRiskScore ?? 0) > 0.7 ? "High" : (pr.aiRiskScore ?? 0) > 0.35 ? "Medium" : "Low";

  return {
    summary: pr.aiSummary ?? "PR reviewed with fallback QA heuristic.",
    satisfiesIssue: !!pr.body,
    missingTests: pr.aiReviewStatus === "REQUEST_CHANGES" ? ["Add integration tests for changed backend paths"] : [],
    risks:
      riskLevel === "High"
        ? ["High-impact code path changed with insufficient test evidence"]
        : ["No critical risk identified"],
    checklist: [
      { item: "Issue alignment", status: "pass" },
      {
        item: "Adequate test coverage",
        status: pr.aiReviewStatus === "REQUEST_CHANGES" ? "fail" : "needs_attention",
      },
      { item: "Deployment verification", status: "needs_attention" },
    ],
    recommendation:
      pr.aiReviewStatus === "REQUEST_CHANGES"
        ? "request_changes"
        : pr.aiReviewStatus === "NEEDS_QA"
          ? "needs_qa"
          : "approve",
    riskLevel,
  };
};
