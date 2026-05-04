import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDeveloperWorkload } from "@/lib/data";

export const dynamic = "force-dynamic";

type DeveloperRow = {
  id: string;
  name: string;
  githubUsername?: string | null;
  role: string;
  strengths: string[];
  currentOpenIssues: number;
  openPrs: number;
  workloadScore: number;
  suggestedNextTask: string;
};

export default async function DevelopersPage() {
  const developers = (await getDeveloperWorkload()) as DeveloperRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Developer Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>GitHub Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Strengths</TableHead>
              <TableHead>Current Open Issues</TableHead>
              <TableHead>Open PRs</TableHead>
              <TableHead>Workload Score</TableHead>
              <TableHead>Suggested Next Task</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers.map((developer) => (
              <TableRow key={developer.id}>
                <TableCell className="font-medium text-white">{developer.name}</TableCell>
                <TableCell>{developer.githubUsername ?? "N/A"}</TableCell>
                <TableCell>{developer.role}</TableCell>
                <TableCell>{developer.strengths.join(", ")}</TableCell>
                <TableCell>{developer.currentOpenIssues}</TableCell>
                <TableCell>{developer.openPrs}</TableCell>
                <TableCell>{developer.workloadScore}</TableCell>
                <TableCell>{developer.suggestedNextTask}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
