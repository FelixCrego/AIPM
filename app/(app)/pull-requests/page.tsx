import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDeployments, getPullRequests } from "@/lib/data";
import { toPercent } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type DeploymentRef = {
  githubPrNumber?: number | null;
  target?: string | null;
  url: string;
};

type PullRequestRow = {
  id: string;
  number: number;
  title: string;
  repository: { fullName: string };
  author: string;
  state: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  aiReviewStatus?: string | null;
  aiRiskScore?: number | null;
};

export default async function PullRequestsPage() {
  const [pullRequests, deployments] = await Promise.all([getPullRequests(), getDeployments()]);
  const prs = pullRequests as PullRequestRow[];
  const deploymentRefs = deployments as DeploymentRef[];

  return (
    <Card className="border-slate-200 bg-white/85">
      <CardHeader>
        <CardTitle>Pull Requests</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Repo</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Changed Files</TableHead>
              <TableHead>Additions/Deletions</TableHead>
              <TableHead>AI Review Status</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Vercel Preview URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prs.map((pr) => {
              const previewDeployment = deploymentRefs.find(
                (deployment) => deployment.githubPrNumber === pr.number && deployment.target === "preview",
              );

              return (
                <TableRow key={pr.id}>
                  <TableCell className="font-medium text-slate-900">
                    <Link href={`/pull-requests/${pr.id}`} className="underline-offset-2 hover:underline">
                      #{pr.number} {pr.title}
                    </Link>
                  </TableCell>
                  <TableCell>{pr.repository.fullName}</TableCell>
                  <TableCell>{pr.author}</TableCell>
                  <TableCell><StatusBadge value={pr.state} /></TableCell>
                  <TableCell>{pr.changedFiles}</TableCell>
                  <TableCell>
                    <span className="text-emerald-700">+{pr.additions}</span> / <span className="text-rose-700">-{pr.deletions}</span>
                  </TableCell>
                  <TableCell><StatusBadge value={pr.aiReviewStatus} /></TableCell>
                  <TableCell>{toPercent(pr.aiRiskScore)}</TableCell>
                  <TableCell>{previewDeployment?.url ?? "N/A"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
