import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getDashboardData } from "@/lib/data";

export const dailyPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  topPriorities: z.array(z.string()),
  developerAssignments: z.array(z.string()),
  blockers: z.array(z.string()),
  qaItems: z.array(z.string()),
  deploymentRisks: z.array(z.string()),
  recommendedNextActions: z.array(z.string()),
  riskLevel: z.enum(["Low", "Medium", "High"]),
});

export type DailyPlanOutput = z.infer<typeof dailyPlanSchema>;

type DailyPlanDeployment = {
  aiRiskScore?: number | null;
  errorMessage?: string | null;
};

type DailyPlanIssue = {
  status: string;
  title: string;
};

export const generateDailyPlan = async (): Promise<DailyPlanOutput> => {
  const data = await getDashboardData();
  const deployments = data.deployments as DailyPlanDeployment[];
  const issues = data.issues as DailyPlanIssue[];

  const modelOutput = await runStructuredOutput({
    system: AI_OPERATOR_STYLE,
    user: `Generate today's engineering work plan from this dataset:\n${JSON.stringify(data)}`,
    schema: dailyPlanSchema,
  });

  if (modelOutput) {
    return modelOutput;
  }

  const highRiskDeployment = deployments.find(
    (deployment) => Boolean(deployment.aiRiskScore) && (deployment.aiRiskScore ?? 0) > 0.8,
  );
  const firstBlocked = issues.find((issue) => issue.status === "BLOCKED");

  return {
    title: "Today's Engineering Plan",
    summary:
      "Focus on deployment stability and review bottlenecks first, then clear blocked requirements before additional feature work.",
    topPriorities: [
      "Resolve failed deployments in preview and production",
      "Close high-risk PR review gaps before merge",
      "Unblock issues missing acceptance criteria",
      "Run QA pass on ready preview deployments",
    ],
    developerAssignments: [
      "Michael: Own the failing deployment tied to backend changes",
      "Narendra: Resolve UI-related open issues and PR feedback",
      "Peculiar: Drive QA checklist completion on ready preview deployments",
    ],
    blockers: [firstBlocked?.title ?? "A key issue is blocked by unclear acceptance criteria"],
    qaItems: [
      "Smoke test latest preview deployments",
      "Validate bugfix flows against acceptance criteria",
      "Confirm test coverage for high-risk PRs",
    ],
    deploymentRisks: [
      highRiskDeployment
        ? `Deployment risk: ${highRiskDeployment.errorMessage ?? "Failure details unavailable"}`
        : "No critical deployment risk detected",
    ],
    recommendedNextActions: [
      "Do not merge PRs with REQUEST_CHANGES status",
      "Re-run failed deployments after fixes",
      "Create issues for any QA failures found in preview",
    ],
    riskLevel: "High",
  };
};
