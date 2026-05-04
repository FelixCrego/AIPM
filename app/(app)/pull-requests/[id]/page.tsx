import { notFound } from "next/navigation";

import { AsyncActionButton } from "@/components/shared/async-action-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPullRequestById } from "@/lib/data";
import { toPercent } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type Params = { id: string };
type PullRequestDetail = {
  id: string;
  number: number;
  title: string;
  state: string;
  aiReviewStatus?: string | null;
  aiRiskScore?: number | null;
  aiSummary?: string | null;
  body?: string | null;
  changedFiles: number;
  additions: number;
  deletions: number;
  repository: { fullName: string };
};

export default async function PullRequestDetailsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const pr = (await getPullRequestById(id)) as PullRequestDetail | null;

  if (!pr) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>PR #{pr.number}: {pr.title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={pr.state} />
            <StatusBadge value={pr.aiReviewStatus} />
            <span className="text-sm text-white/62">Risk: {toPercent(pr.aiRiskScore)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-white/72">
          <p>{pr.aiSummary ?? pr.body ?? "No AI summary available."}</p>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/42">Changed Files</p>
              <p className="text-base font-semibold text-white">{pr.changedFiles}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/42">Additions</p>
              <p className="text-base font-semibold text-emerald-300">+{pr.additions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/42">Deletions</p>
              <p className="text-base font-semibold text-rose-300">-{pr.deletions}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI QA Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <AsyncActionButton
              endpoint="/api/ai/qa-review"
              label="Run AI QA Review"
              pendingLabel="Reviewing..."
              payload={{ pullRequestId: pr.id }}
            />
            <AsyncActionButton
              endpoint="/api/github/prs/comment"
              label="Post AI Review to GitHub"
              pendingLabel="Posting..."
              payload={{
                repoFullName: pr.repository.fullName,
                prNumber: pr.number,
                comment: `DevPilot AI Review: ${pr.aiSummary ?? "Review pending"}. Risk: ${toPercent(pr.aiRiskScore)}.`,
              }}
            />
          </div>

          <div className="rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-sm text-white/72">
            <p className="font-medium text-white">QA Checklist</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Issue behavior verified against acceptance criteria</li>
              <li>Tests updated for changed business logic</li>
              <li>Preview deployment validated on target browsers</li>
              <li>No blocking deployment failures linked to this branch</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
