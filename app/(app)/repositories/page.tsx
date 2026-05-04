import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRepositories } from "@/lib/data";
import { formatRelative } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type RepositoryRow = {
  id: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  language?: string | null;
  updatedAt: Date | string;
  issues: unknown[];
  pullRequests: unknown[];
  commits: { committedAt: Date | string }[];
};

export default async function RepositoriesPage() {
  const repositories = (await getRepositories()) as RepositoryRow[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Repositories</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Default Branch</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Open Issues</TableHead>
              <TableHead>Open PRs</TableHead>
              <TableHead>Last Commit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repositories.map((repository) => (
              <TableRow key={repository.id}>
                <TableCell className="font-medium text-white">{repository.fullName}</TableCell>
                <TableCell>{repository.owner}</TableCell>
                <TableCell>{repository.defaultBranch}</TableCell>
                <TableCell>{repository.language ?? "N/A"}</TableCell>
                <TableCell>{repository.issues.length}</TableCell>
                <TableCell>{repository.pullRequests.length}</TableCell>
                <TableCell>{repository.commits[0] ? formatRelative(repository.commits[0].committedAt) : formatRelative(repository.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
