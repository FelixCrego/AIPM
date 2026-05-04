import { AlertTriangle, CheckCircle2, GitPullRequest, Rocket, SquareStack, Users } from "lucide-react";

import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { toPercent } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type DashboardDeployment = {
  id: string;
  state: string;
  errorMessage?: string | null;
  aiRiskScore?: number | null;
  url: string;
  target?: string | null;
  branch?: string | null;
};

type DashboardIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  blockedReason?: string | null;
};

type DashboardPr = {
  id: string;
  number: number;
  title: string;
  state: string;
  aiReviewStatus?: string | null;
  aiRiskScore?: number | null;
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const deployments = data.deployments as DashboardDeployment[];
  const issues = data.issues as DashboardIssue[];
  const prs = data.prs as DashboardPr[];
  const failedDeployments = deployments.filter((deployment) => deployment.state === "ERROR");
  const blockedIssues = issues.filter((issue) => issue.status === "BLOCKED");

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Open Issues" value={data.summary.openIssues} hint="Unresolved tasks requiring attention" />
        <MetricCard title="PRs Needing Review" value={data.summary.prsNeedingReview} hint="Open PRs awaiting quality decisions" />
        <MetricCard title="Failed Deployments" value={data.summary.failedDeployments} hint="Builds currently blocking release flow" />
        <MetricCard title="Blocked Tasks" value={data.summary.blockedTasks} hint="Items blocked by missing specs or deps" />
        <MetricCard title="Ready For QA" value={data.summary.readyForQa} hint="Preview deployments available to validate" />
        <MetricCard title="Developers Active Today" value={data.summary.activeDevelopers} hint="Engineers available for assignment" />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2 border-slate-200 bg-white/85">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Today&apos;s AI Work Plan</CardTitle>
              <p className="mt-1 text-sm text-slate-600">What matters, what is blocked, and who should act next.</p>
            </div>
            <AsyncActionButton
              endpoint="/api/ai/daily-plan"
              label="Generate Today&apos;s Work Plan"
              pendingLabel="Generating plan..."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-slate-900">{data.plan?.title ?? "No plan generated yet"}</p>
              <p className="mt-1 text-sm text-slate-600">{data.plan?.summary ?? "Generate a plan to get AI recommendations."}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Priorities</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {((data.plan?.priorities as string[] | undefined) ?? []).slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <SquareStack className="mt-0.5 h-4 w-4 text-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommended Assignments</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {((data.plan?.assignments as string[] | undefined) ?? []).slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Users className="mt-0.5 h-4 w-4 text-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/85">
          <CardHeader>
            <CardTitle className="text-base">Risk Radar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {failedDeployments.slice(0, 3).map((deployment) => (
              <div key={deployment.id} className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <p className="font-medium text-rose-900">Failed Deployment</p>
                <p className="text-rose-700">{deployment.errorMessage ?? "Unknown error"}</p>
                <p className="mt-1 text-xs text-rose-700">Risk: {toPercent(deployment.aiRiskScore)}</p>
              </div>
            ))}
            {blockedIssues.slice(0, 2).map((issue) => (
              <div key={issue.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="font-medium text-amber-900">Blocked Issue #{issue.number}</p>
                <p className="text-amber-700">{issue.blockedReason ?? issue.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">PRs Needing Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {prs
              .filter((pr) => pr.state === "OPEN" && pr.aiReviewStatus !== "APPROVED")
              .slice(0, 4)
              .map((pr) => (
                <div key={pr.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">#{pr.number} {pr.title}</p>
                    <StatusBadge value={pr.aiReviewStatus} />
                  </div>
                  <p className="text-xs text-slate-500">Risk {toPercent(pr.aiRiskScore)}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Deployments Ready For QA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {deployments
              .filter((deployment) => deployment.state === "READY" && deployment.target === "preview")
              .slice(0, 4)
              .map((deployment) => (
                <div key={deployment.id} className="rounded border border-emerald-200 bg-emerald-50 p-2">
                  <p className="font-medium text-emerald-900">{deployment.url}</p>
                  <p className="text-xs text-emerald-700">Branch: {deployment.branch}</p>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white/85">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What Is Safe To Ship?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {prs
              .filter((pr) => pr.state === "OPEN")
              .slice(0, 4)
              .map((pr) => {
                const safe = (pr.aiRiskScore ?? 0) < 0.35 && pr.aiReviewStatus === "APPROVED";
                return (
                  <div key={pr.id} className="rounded border border-slate-200 p-2">
                    <div className="flex items-center gap-2">
                      {safe ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      )}
                      <p className="font-medium text-slate-900">PR #{pr.number}</p>
                    </div>
                    <p className="text-xs text-slate-600">{safe ? "Safe to ship" : "Hold until QA or review clears"}</p>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><GitPullRequest className="h-3 w-3" /> Review queue active</span>
        <span className="inline-flex items-center gap-1"><Rocket className="h-3 w-3" /> Deployment monitoring active</span>
      </section>
    </div>
  );
}
