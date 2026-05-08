import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProjects, getProjectHealthScore, getRepositories } from "@/lib/data";
import { AIBacklogKanban } from "@/components/projects/ai-backlog-kanban";
import { ProjectRepositoryControl } from "@/components/projects/project-repository-control";
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
  repository?: {
    id: string;
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string;
    url: string;
    language?: string | null;
    isPrivate?: boolean;
  } | null;
  vercelProject?: { name: string } | null;
};

type RepositoryRow = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  url: string;
  language?: string | null;
  isPrivate?: boolean;
};

export default async function ProjectsPage() {
  const [projects, repositories] = (await Promise.all([getProjects(), getRepositories()])) as [
    ProjectRow[],
    RepositoryRow[],
  ];

  return (
    <div className="space-y-6">
      <AIBacklogKanban
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          repository: project.repository
            ? {
                fullName: project.repository.fullName,
                url: project.repository.url,
                defaultBranch: project.repository.defaultBranch,
              }
            : null,
        }))}
      />
      <Card>
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
                <TableCell className="font-medium text-white">{project.name}</TableCell>
                <TableCell>{project.status.replaceAll("_", " ")}</TableCell>
                <TableCell>{project.priority}</TableCell>
                <TableCell>
                  <ProjectRepositoryControl
                    project={{
                      id: project.id,
                      name: project.name,
                      repository: project.repository ?? null,
                    }}
                    repositories={repositories}
                  />
                </TableCell>
                <TableCell>{project.vercelProject?.name ?? project.vercelProjectId ?? "Unlinked"}</TableCell>
                <TableCell>{getProjectHealthScore(project.id)}</TableCell>
                <TableCell>{formatRelative(project.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      </Card>
    </div>
  );
}
