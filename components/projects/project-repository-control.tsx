"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Link2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RepositoryOption = {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  url: string;
  language?: string | null;
  isPrivate?: boolean;
};

type ProjectSummary = {
  id: string;
  name: string;
  repository?: RepositoryOption | null;
};

const repoNameFromProject = (projectName: string) =>
  projectName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "new-project-repo";

export function ProjectRepositoryControl({
  project,
  repositories,
}: {
  project: ProjectSummary;
  repositories: RepositoryOption[];
}) {
  const router = useRouter();
  const [connectedRepo, setConnectedRepo] = useState<RepositoryOption | null>(project.repository ?? null);
  const [selectedFullName, setSelectedFullName] = useState(project.repository?.fullName ?? repositories[0]?.fullName ?? "");
  const [repoName, setRepoName] = useState(repoNameFromProject(project.name));
  const [pendingMode, setPendingMode] = useState<"connect" | "create" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repositoryOptions = useMemo(() => {
    const seen = new Set<string>();
    return repositories.filter((repository) => {
      if (seen.has(repository.fullName)) {
        return false;
      }
      seen.add(repository.fullName);
      return true;
    });
  }, [repositories]);

  const runAction = async (payload: Record<string, unknown>, mode: "connect" | "create") => {
    setPendingMode(mode);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/projects/repository", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; repository?: RepositoryOption; error?: string }
        | null;

      if (!response.ok || !body?.ok || !body.repository) {
        throw new Error(body?.error ?? "Repository action failed");
      }

      setConnectedRepo(body.repository);
      setSelectedFullName(body.repository.fullName);
      setMessage(mode === "create" ? "Repository ready." : "Repository connected.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Repository action failed");
    } finally {
      setPendingMode(null);
    }
  };

  const connectRepository = () => {
    if (!selectedFullName) {
      setError("Select a repository first.");
      return;
    }

    void runAction(
      {
        mode: "connect",
        projectId: project.id,
        repoFullName: selectedFullName,
      },
      "connect",
    );
  };

  const createRepository = () => {
    const cleanName = repoName.trim();
    if (!cleanName) {
      setError("Enter a repository name.");
      return;
    }

    void runAction(
      {
        mode: "create",
        projectId: project.id,
        repoName: cleanName,
        description: `Repository for ${project.name}`,
        isPrivate: true,
      },
      "create",
    );
  };

  return (
    <div className="min-w-[22rem] space-y-2">
      <div className="flex items-center gap-2">
        {connectedRepo ? (
          <a
            href={connectedRepo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-200 hover:text-emerald-100"
          >
            <GitBranch className="h-3.5 w-3.5" />
            {connectedRepo.fullName}
          </a>
        ) : (
          <Badge variant="outline">Unlinked</Badge>
        )}
      </div>

      <div className="flex gap-2">
        <select
          value={selectedFullName}
          onChange={(event) => setSelectedFullName(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-xl border border-input bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus-visible:border-emerald-300/40 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <option value="">Select repo</option>
          {repositoryOptions.map((repository) => (
            <option key={repository.id} value={repository.fullName}>
              {repository.fullName}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={connectRepository}
          disabled={pendingMode !== null || !selectedFullName}
          title="Connect repository"
        >
          <Link2 className="h-3.5 w-3.5" />
          {pendingMode === "connect" ? "Connecting" : "Connect"}
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={repoName}
          onChange={(event) => setRepoName(event.target.value)}
          placeholder="new-repo or owner/new-repo"
          className="h-9"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={createRepository}
          disabled={pendingMode !== null || repoName.trim().length === 0}
          title="Create and connect repository"
        >
          <Plus className="h-3.5 w-3.5" />
          {pendingMode === "create" ? "Creating" : "Create"}
        </Button>
      </div>

      {message ? <p className="text-xs text-emerald-200">{message}</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
