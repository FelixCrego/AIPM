import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProjects, getProjectHealthScore } from "@/lib/data";
import { formatRelative } from "@/lib/presentation";

export const dynamic = "force-dynamic";

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  priority: string;
  updatedAt: Date | string;
  repositoryId?: string | null;
  vercelProjectId?: string | null;
  repository?: { fullName: string } | null;
  vercelProject?: { name: string } | null;
};

export default async function ProjectsPage() {
  const projects = (await getProjects()) as ProjectRow[];

  return (
    <Card className="border-slate-200 bg-white/85">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Linked GitHub Repo</TableHead>
              <TableHead>Linked Vercel Project</TableHead>
              <TableHead>Health Score</TableHead>
              <TableHead>Last Activity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                <TableCell>{project.status.replaceAll("_", " ")}</TableCell>
                <TableCell>{project.priority}</TableCell>
                <TableCell>{project.repository?.fullName ?? project.repositoryId ?? "Unlinked"}</TableCell>
                <TableCell>{project.vercelProject?.name ?? project.vercelProjectId ?? "Unlinked"}</TableCell>
                <TableCell>{getProjectHealthScore(project.id)}</TableCell>
                <TableCell>{formatRelative(project.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
