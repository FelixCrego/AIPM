import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  GitPullRequest,
  Radar,
  Rocket,
  SquareStack,
  Users,
} from "lucide-react";

import { AsyncActionButton } from "@/components/shared/async-action-button";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data";
import { formatRelative, toPercent } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type DashboardDeployment = {
  id: string;
  state: string;
  errorMessage?: string | null;
  aiRiskScore?: number | null;
  url: string;
  target?: string | null;
  branch?: string | null;
  updatedAt?: Date | string;
};

type DashboardIssue = {
  id: string;
  number: number;
  title: string;
  status: string;
  blockedReason?: string | null;
  aiRecommendedAssignee?: string | null;
  aiRiskScore?: number | null;
};

type DashboardPr = {
  id: string;
  number: number;
  title: string;
  state: string;
  author: string;
  aiReviewStatus?: string | null;
  aiRiskScore?: number | null;
};

type DashboardProject = {
  id: string;
  name: string;
  status: string;
  priority: string;
  updatedAt: Date | string;
};

type DashboardDeveloper = {
  id: string;
  name: string;
  role: string;
  currentCapacity: number;
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const deployments = data.deployments as DashboardDeployment[];
  const issues = data.issues as DashboardIssue[];
  const prs = data.prs as DashboardPr[];
  const projects = data.projects as DashboardProject[];
  const developers = data.developers as DashboardDeveloper[];

  const failedDeployments = deployments.filter((deployment) => deployment.state === "ERROR");
  const blockedIssues = issues.filter((issue) => issue.status === "BLOCKED");
  const reviewQueue = prs.filter((pr) => pr.state === "OPEN" && pr.aiReviewStatus !== "APPROVED");
  const previewDeployments = deployments.filter(
    (deployment) => deployment.state === "READY" && deployment.target === "preview",
  );
  const shipQueue = prs.filter((pr) => pr.state === "OPEN");
  const riskLevel =
    failedDeployments.length > 0
      ? { label: "High", className: "border-rose-400/30 bg-rose-500/16 text-rose-100" }
      : blockedIssues.length > 0
        ? { label: "Medium", className: "border-amber-400/30 bg-amber-500/14 text-amber-100" }
        : { label: "Low", className: "border-emerald-400/30 bg-emerald-500/14 text-emerald-100" };

  const trace = [
    failedDeployments[0]
      ? {
          id: `deployment-${failedDeployments[0].id}`,
          icon: "danger",
          title: "Deployment Alert",
          body: failedDeployments[0].errorMessage ?? "Unknown deployment error",
          time: formatRelative(failedDeployments[0].updatedAt),
        }
      : null,
    reviewQueue[0]
      ? {
          id: `pr-${reviewQueue[0].id}`,
          icon: "review",
          title: `PR #${reviewQueue[0].number} in review`,
          body: reviewQueue[0].title,
          time: "needs decision",
        }
      : null,
    blockedIssues[0]
      ? {
          id: `issue-${blockedIssues[0].id}`,
          icon: "blocked",
          title: `Issue #${blockedIssues[0].number} blocked`,
          body: blockedIssues[0].blockedReason ?? blockedIssues[0].title,
          time: blockedIssues[0].aiRecommendedAssignee ?? "unassigned",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    icon: "danger" | "review" | "blocked";
    title: string;
    body: string;
    time: string;
  }>;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard title="Open Issues" value={data.summary.openIssues} hint="Unresolved tasks requiring attention" />
        <MetricCard title="PRs Needing Review" value={data.summary.prsNeedingReview} hint="Active code changes awaiting decision" />
        <MetricCard title="Failed Deployments" value={data.summary.failedDeployments} hint="Release blockers across Vercel environments" />
        <MetricCard title="Blocked Tasks" value={data.summary.blockedTasks} hint="Work stalled by missing specs or dependencies" />
        <MetricCard title="Ready For QA" value={data.summary.readyForQa} hint="Preview URLs cleared for manual verification" />
        <MetricCard title="Developers Active Today" value={data.summary.activeDevelopers} hint="Available engineers across FE, BE, and QA" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card className="overflow-hidden border-l-4 border-l-violet-400/90">
          <CardHeader className="relative flex flex-row items-start justify-between gap-4">
            <div className="absolute right-4 top-2 hidden select-none font-mono text-6xl font-semibold italic text-white/[0.04] sm:block">
              GEN_01
            </div>
            <div>
              <p className="hud-label mb-2">AI Project Orchestration</p>
              <CardTitle className="text-2xl">Today&apos;s Engineering Plan</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/62">
                {data.plan?.summary ?? "Generate a plan to get AI recommendations for release sequencing, blockers, and ownership."}
              </p>
            </div>
            <AsyncActionButton
              endpoint="/api/ai/daily-plan"
              label="Generate Today&apos;s Work Plan"
              pendingLabel="Generating plan..."
            />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="hud-label mb-3">Top_Priorities</p>
                <ul className="space-y-3 text-sm text-white/74">
                  {((data.plan?.priorities as string[] | undefined) ?? []).slice(0, 4).map((item) => (
                    <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <SquareStack className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="hud-label mb-3">Dev_Assignments</p>
                <div className="space-y-3">
                  {((data.plan?.assignments as string[] | undefined) ?? []).slice(0, 4).map((item) => (
                    <div key={item} className="flex items-start justify-between gap-4 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{item.split(":")[0] ?? item}</p>
                        <p className="text-xs text-white/52">{item.includes(":") ? item.split(":").slice(1).join(":").trim() : "Assignment queued"}</p>
                      </div>
                      <span className="glass-pill rounded-full px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/48">
                        Assigned
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/6 pt-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="hud-label">Blockers:</span>
                <span className="text-sm font-medium text-white/74">
                  {failedDeployments.length + blockedIssues.length} active blockers across deployment and issue flow
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="hud-label">Risk_Level:</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${riskLevel.className}`}>
                  {riskLevel.label}
                </span>
                <span className="hud-value text-white/26">VERIFYING_QA_READY...</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <p className="hud-label mb-2">Risk_Radar</p>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Radar className="h-5 w-5 text-rose-300" />
                Immediate Watchlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {failedDeployments.slice(0, 2).map((deployment) => (
                <div key={deployment.id} className="rounded-2xl border border-rose-400/18 bg-rose-500/10 p-4">
                  <p className="font-medium text-rose-100">Failed Deployment</p>
                  <p className="mt-1 text-rose-100/78">{deployment.errorMessage ?? "Unknown error"}</p>
                  <p className="mt-2 text-xs text-rose-200/70">Risk {toPercent(deployment.aiRiskScore)}</p>
                </div>
              ))}
              {blockedIssues.slice(0, 2).map((issue) => (
                <div key={issue.id} className="rounded-2xl border border-amber-400/18 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-100">Blocked Issue #{issue.number}</p>
                  <p className="mt-1 text-amber-100/78">{issue.blockedReason ?? issue.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="hud-label mb-2">Agentic_Trace</p>
              <CardTitle className="text-lg">Live Command Bus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trace.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-2xl border border-white/6 bg-white/[0.03] p-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      event.icon === "danger"
                        ? "bg-rose-500/12 text-rose-200"
                        : event.icon === "review"
                          ? "bg-violet-500/12 text-violet-200"
                          : "bg-amber-500/12 text-amber-100"
                    }`}
                  >
                    <CircleDot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="hud-value text-white/34">{event.time}</p>
                    <p className="mt-1 text-sm font-medium text-white">{event.title}</p>
                    <p className="mt-1 text-sm text-white/58">{event.body}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <p className="hud-label mb-2">Review_Queue</p>
            <CardTitle className="text-lg">PRs Needing Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reviewQueue.slice(0, 4).map((pr) => (
              <div key={pr.id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">#{pr.number} {pr.title}</p>
                    <p className="mt-1 text-xs text-white/46">Owner: {pr.author}</p>
                  </div>
                  <StatusBadge value={pr.aiReviewStatus} />
                </div>
                <p className="mt-3 text-xs text-white/52">Risk {toPercent(pr.aiRiskScore)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="hud-label mb-2">Preview_QA</p>
            <CardTitle className="text-lg">Deployments Ready For QA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewDeployments.slice(0, 4).map((deployment) => (
              <div key={deployment.id} className="rounded-2xl border border-emerald-400/18 bg-emerald-500/10 p-4">
                <p className="truncate text-sm font-medium text-emerald-100">{deployment.url}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-emerald-100/72">Branch: {deployment.branch ?? "unknown"}</span>
                  <StatusBadge value={deployment.state} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="hud-label mb-2">Ship_Readiness</p>
            <CardTitle className="text-lg">What Is Safe To Ship?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shipQueue.slice(0, 4).map((pr) => {
              const safe = (pr.aiRiskScore ?? 0) < 0.35 && pr.aiReviewStatus === "APPROVED";
              return (
                <div key={pr.id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    {safe ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-200" />
                    )}
                    <p className="text-sm font-medium text-white">PR #{pr.number}</p>
                  </div>
                  <p className="mt-2 text-xs text-white/56">{safe ? "Safe to ship" : "Hold until QA or review clears"}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <p className="hud-label mb-2">Active_Projects</p>
            <CardTitle className="text-lg">Current Operating Surface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-medium text-white">{project.name}</p>
                  <p className="mt-1 text-xs text-white/48">Last activity {formatRelative(project.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={project.status} />
                  <StatusBadge value={project.priority} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="hud-label mb-2">Capacity_Map</p>
            <CardTitle className="text-lg">Developer Load</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developers.slice(0, 4).map((developer) => {
              const utilization = 100 - developer.currentCapacity;
              return (
                <div key={developer.id} className="rounded-2xl border border-white/6 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{developer.name}</p>
                      <p className="mt-1 text-xs text-white/46">{developer.role}</p>
                    </div>
                    <span className="font-mono text-xs text-white/54">{utilization}% allocated</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,_#00ff85,_#8b5cf6)]"
                      style={{ width: `${Math.max(utilization, 8)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-4 text-xs text-white/46">
        <span className="inline-flex items-center gap-2"><GitPullRequest className="h-3.5 w-3.5 text-violet-300" /> Review queue active</span>
        <span className="inline-flex items-center gap-2"><Rocket className="h-3.5 w-3.5 text-emerald-300" /> Deployment monitoring active</span>
        <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5 text-sky-300" /> Team workload scoring active</span>
      </section>
    </div>
  );
}
