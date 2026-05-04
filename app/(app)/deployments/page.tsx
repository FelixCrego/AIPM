import { AsyncActionButton } from "@/components/shared/async-action-button";
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
import { getDeployments } from "@/lib/data";
import { toPercent } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type DeploymentRow = {
  id: string;
  url: string;
  state: string;
  target?: string | null;
  branch?: string | null;
  commitSha?: string | null;
  githubPrNumber?: number | null;
  errorMessage?: string | null;
  aiSummary?: string | null;
  aiRiskScore?: number | null;
  vercelProject: { name: string };
};

export default async function DeploymentsPage() {
  const deployments = (await getDeployments()) as DeploymentRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vercel Deployments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Commit SHA</TableHead>
              <TableHead>Related PR #</TableHead>
              <TableHead>Error Message</TableHead>
              <TableHead>AI Summary</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-medium text-white">{deployment.vercelProject.name}</TableCell>
                <TableCell className="max-w-56 truncate">{deployment.url}</TableCell>
                <TableCell><StatusBadge value={deployment.state} /></TableCell>
                <TableCell>{deployment.branch ?? "N/A"}</TableCell>
                <TableCell>{deployment.commitSha ?? "N/A"}</TableCell>
                <TableCell>{deployment.githubPrNumber ?? "N/A"}</TableCell>
                <TableCell className="max-w-64 truncate">{deployment.errorMessage ?? "-"}</TableCell>
                <TableCell className="max-w-64 truncate">{deployment.aiSummary ?? "N/A"}</TableCell>
                <TableCell>{toPercent(deployment.aiRiskScore)}</TableCell>
                <TableCell>
                  {deployment.state === "ERROR" ? (
                    <AsyncActionButton
                      endpoint="/api/ai/analyze-deployment"
                      label="Analyze Failed Deployment"
                      pendingLabel="Analyzing..."
                      payload={{ deploymentId: deployment.id }}
                    />
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
