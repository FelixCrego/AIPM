import { NextResponse } from "next/server";

import { getDashboardData, getDashboardSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

type DashboardIssueSignal = {
  status: string;
};

type DashboardDeploymentSignal = {
  state: string;
};

type DashboardPrSignal = {
  state: string;
  aiReviewStatus?: string | null;
};

export async function GET() {
  try {
    const [summary, data] = await Promise.all([getDashboardSummary(), getDashboardData()]);
    const issues = data.issues as DashboardIssueSignal[];
    const deployments = data.deployments as DashboardDeploymentSignal[];
    const prs = data.prs as DashboardPrSignal[];

    return NextResponse.json({
      ok: true,
      summary,
      signals: {
        blockers: issues.filter((issue) => issue.status === "BLOCKED").slice(0, 5),
        failedDeployments: deployments.filter((deployment) => deployment.state === "ERROR").slice(0, 5),
        prsNeedingReview: prs.filter((pr) => pr.state === "OPEN" && pr.aiReviewStatus !== "APPROVED").slice(0, 5),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 },
    );
  }
}
