import { prisma } from "@/lib/prisma";
import { listIssues } from "@/lib/github/issues";
import { listPullRequests } from "@/lib/github/pulls";
import { listRepositories } from "@/lib/github/repos";

export const syncGithub = async () => {
  const repositories = await listRepositories();

  if (!process.env.DATABASE_URL) {
    return { repositories: repositories.length, issues: 0, pullRequests: 0, persisted: false };
  }

  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error("No organization found for sync");
  }

  let issueCount = 0;
  let prCount = 0;

  for (const repo of repositories.slice(0, 10)) {
    await prisma.repository.upsert({
      where: { fullName: repo.full_name },
      create: {
        organizationId: organization.id,
        githubId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        url: repo.html_url,
        language: repo.language,
        isPrivate: repo.private,
      },
      update: {
        name: repo.name,
        owner: repo.owner.login,
        defaultBranch: repo.default_branch,
        url: repo.html_url,
        language: repo.language,
        isPrivate: repo.private,
      },
    });

    const [issues, pullRequests] = await Promise.all([
      listIssues(repo.full_name),
      listPullRequests(repo.full_name),
    ]);

    issueCount += Array.isArray(issues) ? issues.length : 0;
    prCount += Array.isArray(pullRequests) ? pullRequests.length : 0;
  }

  return {
    repositories: repositories.length,
    issues: issueCount,
    pullRequests: prCount,
    persisted: true,
  };
};
