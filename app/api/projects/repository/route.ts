import { NextResponse } from "next/server";
import { z } from "zod";

import { isDemoMode } from "@/lib/config";
import { demoRepositories } from "@/lib/demo-data";
import { getOrganization } from "@/lib/data";
import { createRepository, getAuthenticatedGithubUser, tryGetRepository, type RepoSummary } from "@/lib/github/repos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const repositoryActionSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("connect"),
    projectId: z.string().min(1),
    repoFullName: z.string().min(3),
  }),
  z.object({
    mode: z.literal("create"),
    projectId: z.string().min(1),
    owner: z.string().trim().min(1).optional(),
    repoName: z.string().trim().min(1),
    description: z.string().trim().max(500).optional(),
    isPrivate: z.boolean().default(true),
  }),
]);

const normalizeRepoName = (input: string) =>
  input
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const splitRepoInput = (input: string) => {
  const normalized = normalizeRepoName(input);
  if (normalized.includes("/")) {
    const [owner, repoName] = normalized.split("/");
    return { owner, repoName };
  }

  return { repoName: normalized };
};

const serializeRepository = (repo: {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  url: string;
  language?: string | null;
  isPrivate: boolean;
}) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.fullName,
  owner: repo.owner,
  defaultBranch: repo.defaultBranch,
  url: repo.url,
  language: repo.language ?? null,
  isPrivate: repo.isPrivate,
});

export async function POST(request: Request) {
  try {
    const body = repositoryActionSchema.parse(await request.json());

    if (isDemoMode) {
      if (body.mode === "connect") {
        const existing = demoRepositories.find((repo) => repo.fullName === body.repoFullName);
        if (existing) {
          return NextResponse.json({ ok: true, repository: serializeRepository(existing) });
        }
      }

      const repoInput =
        body.mode === "create" ? splitRepoInput(body.repoName) : splitRepoInput(body.repoFullName);
      const owner = body.mode === "create" ? body.owner ?? repoInput.owner ?? "demo" : repoInput.owner ?? "demo";
      const name = repoInput.repoName || "new-project-repo";
      return NextResponse.json({
        ok: true,
        repository: {
          id: `demo_repo_${body.projectId}_${name}`,
          name,
          fullName: `${owner}/${name}`,
          owner,
          defaultBranch: "main",
          url: `https://github.com/${owner}/${name}`,
          language: "TypeScript",
          isPrivate: body.mode === "create" ? body.isPrivate : true,
        },
      });
    }

    const organization = await getOrganization();
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, organizationId: organization.id },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    let githubRepo: RepoSummary | null = null;

    if (body.mode === "connect") {
      const { owner, repoName } = splitRepoInput(body.repoFullName);
      if (!owner || !repoName) {
        throw new Error("Use owner/repo to connect an existing repository.");
      }

      const fullName = `${owner}/${repoName}`;
      githubRepo = await tryGetRepository(fullName);
      if (!githubRepo) {
        throw new Error("Repository not found. Use create to make it first.");
      }
    } else {
      const repoInput = splitRepoInput(body.repoName);
      const authenticatedUser = await getAuthenticatedGithubUser();
      const owner = body.owner ?? repoInput.owner ?? authenticatedUser.login;
      const repoName = repoInput.repoName;

      githubRepo = await tryGetRepository(`${owner}/${repoName}`);
      if (!githubRepo) {
        githubRepo = await createRepository({
          owner,
          name: repoName,
          description: body.description || `Repository for ${project.name}`,
          isPrivate: body.isPrivate,
        });
      }
    }

    const repository = await prisma.repository.upsert({
      where: { fullName: githubRepo.full_name },
      create: {
        organizationId: organization.id,
        githubId: String(githubRepo.id),
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        owner: githubRepo.owner.login,
        defaultBranch: githubRepo.default_branch,
        url: githubRepo.html_url,
        language: githubRepo.language,
        isPrivate: githubRepo.private,
      },
      update: {
        githubId: String(githubRepo.id),
        name: githubRepo.name,
        owner: githubRepo.owner.login,
        defaultBranch: githubRepo.default_branch,
        url: githubRepo.html_url,
        language: githubRepo.language,
        isPrivate: githubRepo.private,
      },
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { repositoryId: repository.id },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: organization.id,
        actor: "System",
        type: "PROJECT_REPOSITORY",
        message: `${project.name} connected to ${repository.fullName}.`,
        metadata: { projectId: project.id, repositoryId: repository.id },
      },
    });

    return NextResponse.json({ ok: true, repository: serializeRepository(repository) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 400 },
    );
  }
}
