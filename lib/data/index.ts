import { isDemoMode } from "@/lib/config";
import {
  demoActivityLogs,
  demoDailyPlan,
  demoDeployments,
  demoDevelopers,
  demoIds,
  demoIntegrationCredentials,
  demoIssues,
  demoOrganization,
  demoProjectMemories,
  demoProjects,
  demoPullRequests,
  demoQAReviews,
  demoRepositories,
  demoTaskAssignments,
  demoVercelProjects,
} from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

const ISSUE_STATE_OPEN = "OPEN";
const PR_STATE_OPEN = "OPEN";
const DEPLOYMENT_STATE_ERROR = "ERROR";
const DEPLOYMENT_STATE_READY = "READY";
const TASK_STATUS_BLOCKED = "BLOCKED";
const TASK_STATUS_TODO = "TODO";
const TASK_STATUS_IN_PROGRESS = "IN_PROGRESS";

export type DashboardSummary = {
  openIssues: number;
  prsNeedingReview: number;
  failedDeployments: number;
  blockedTasks: number;
  readyForQa: number;
  activeDevelopers: number;
};

type WorkloadDeveloper = {
  id: string;
  name: string;
  githubUsername?: string | null;
  role: string;
  strengths: string[];
  currentCapacity: number;
};

type WorkloadIssue = {
  title: string;
  assignees: string[];
};

type WorkloadPr = {
  author: string;
  state: string;
};

const withFallback = async <T>(query: () => Promise<T>, fallback: () => T): Promise<T> => {
  if (isDemoMode) {
    return fallback();
  }

  try {
    return await query();
  } catch {
    return fallback();
  }
};

export const getOrganization = async () =>
  withFallback(
    async () => {
      const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
      return organization ?? demoOrganization;
    },
    () => demoOrganization,
  );

export const getDashboardSummary = async (): Promise<DashboardSummary> =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      const [openIssues, openPrs, failedDeployments, blockedTasks, readyForQa, activeDevelopers] =
        await Promise.all([
          prisma.gitHubIssue.count({
            where: { organizationId: organization.id, state: ISSUE_STATE_OPEN },
          }),
          prisma.gitHubPullRequest.count({
            where: {
              organizationId: organization.id,
              state: PR_STATE_OPEN,
              OR: [{ aiReviewStatus: "NEEDS_QA" }, { aiReviewStatus: "IN_REVIEW" }, { aiReviewStatus: "REQUEST_CHANGES" }],
            },
          }),
          prisma.vercelDeployment.count({
            where: { organizationId: organization.id, state: DEPLOYMENT_STATE_ERROR },
          }),
          prisma.gitHubIssue.count({
            where: { organizationId: organization.id, status: TASK_STATUS_BLOCKED },
          }),
          prisma.vercelDeployment.count({
            where: { organizationId: organization.id, state: DEPLOYMENT_STATE_READY, target: "preview" },
          }),
          prisma.developer.count({
            where: { organizationId: organization.id, isActive: true },
          }),
        ]);

      return {
        openIssues,
        prsNeedingReview: openPrs,
        failedDeployments,
        blockedTasks,
        readyForQa,
        activeDevelopers,
      };
    },
    () => ({
      openIssues: demoIssues.filter((i) => i.state === ISSUE_STATE_OPEN).length,
      prsNeedingReview: demoPullRequests.filter(
        (pr) => pr.state === PR_STATE_OPEN && pr.aiReviewStatus !== "APPROVED",
      ).length,
      failedDeployments: demoDeployments.filter((d) => d.state === DEPLOYMENT_STATE_ERROR).length,
      blockedTasks: demoIssues.filter((i) => i.status === TASK_STATUS_BLOCKED).length,
      readyForQa: demoDeployments.filter((d) => d.state === DEPLOYMENT_STATE_READY && d.target === "preview").length,
      activeDevelopers: demoDevelopers.filter((d) => d.isActive).length,
    }),
  );

export const getProjects = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.project.findMany({
        where: { organizationId: organization.id },
        include: {
          repository: true,
          vercelProject: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    },
    () =>
      demoProjects.map((project) => ({
        ...project,
        repository: demoRepositories.find((repo) => repo.id === project.repositoryId) ?? null,
        vercelProject:
          demoVercelProjects.find((vercelProject) => vercelProject.id === project.vercelProjectId) ?? null,
      })),
  );

export const getRepositories = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.repository.findMany({
        where: { organizationId: organization.id },
        include: {
          issues: { where: { state: ISSUE_STATE_OPEN } },
          pullRequests: { where: { state: PR_STATE_OPEN } },
          commits: { orderBy: { committedAt: "desc" }, take: 1 },
        },
        orderBy: { updatedAt: "desc" },
      });
    },
    () =>
      demoRepositories.map((repo) => ({
        ...repo,
        issues: demoIssues.filter((i) => i.repositoryId === repo.id && i.state === ISSUE_STATE_OPEN),
        pullRequests: demoPullRequests.filter((pr) => pr.repositoryId === repo.id && pr.state === PR_STATE_OPEN),
        commits: [],
      })),
  );

export const getIssues = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.gitHubIssue.findMany({
        where: { organizationId: organization.id },
        include: { repository: true },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      });
    },
    () =>
      demoIssues.map((issue) => ({
        ...issue,
        repository: demoRepositories.find((r) => r.id === issue.repositoryId)!,
      })),
  );

export const getPullRequests = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.gitHubPullRequest.findMany({
        where: { organizationId: organization.id },
        include: {
          repository: true,
          qaReviews: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    },
    () =>
      demoPullRequests.map((pr) => ({
        ...pr,
        repository: demoRepositories.find((r) => r.id === pr.repositoryId)!,
        qaReviews: demoQAReviews.filter((review) => review.pullRequestId === pr.id),
      })),
  );

export const getPullRequestById = async (id: string) =>
  withFallback(
    async () => {
      const pr = await prisma.gitHubPullRequest.findUnique({
        where: { id },
        include: {
          repository: true,
          qaReviews: true,
        },
      });

      return pr;
    },
    () => {
      const pr = demoPullRequests.find((item) => item.id === id);
      if (!pr) {
        return null;
      }
      return {
        ...pr,
        repository: demoRepositories.find((r) => r.id === pr.repositoryId)!,
        qaReviews: demoQAReviews.filter((review) => review.pullRequestId === pr.id),
      };
    },
  );

export const getDeployments = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.vercelDeployment.findMany({
        where: { organizationId: organization.id },
        include: { vercelProject: true },
        orderBy: { updatedAt: "desc" },
      });
    },
    () =>
      demoDeployments.map((deployment) => ({
        ...deployment,
        vercelProject: demoVercelProjects.find((project) => project.id === deployment.vercelProjectId)!,
      })),
  );

export const getDevelopers = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.developer.findMany({
        where: { organizationId: organization.id },
        include: {
          assignments: {
            include: {
              issue: true,
            },
            where: {
              status: { in: [TASK_STATUS_TODO, TASK_STATUS_IN_PROGRESS, TASK_STATUS_BLOCKED] },
            },
          },
        },
        orderBy: { name: "asc" },
      });
    },
    () =>
      demoDevelopers.map((developer) => ({
        ...developer,
        assignments: demoTaskAssignments
          .filter((assignment) => assignment.developerId === developer.id)
          .map((assignment) => ({
            ...assignment,
            issue: demoIssues.find((issue) => issue.id === assignment.issueId)!,
          })),
      })),
  );

export const getLatestDailyPlan = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.aIDailyPlan.findFirst({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
      });
    },
    () => demoDailyPlan,
  );

export const getQaReviews = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      return prisma.aIQAReview.findMany({
        where: { organizationId: organization.id },
        include: {
          pullRequest: true,
          deployment: true,
        },
        orderBy: { createdAt: "desc" },
      });
    },
    () =>
      demoQAReviews.map((review) => ({
        ...review,
        pullRequest: demoPullRequests.find((pr) => pr.id === review.pullRequestId) ?? null,
        deployment: demoDeployments.find((dep) => dep.id === review.deploymentId) ?? null,
      })),
  );

export const getSettingsSnapshot = async () =>
  withFallback(
    async () => {
      const organization = await getOrganization();
      const [credentials, memory] = await Promise.all([
        prisma.integrationCredential.findMany({
          where: { organizationId: organization.id },
        }),
        prisma.projectMemory.findMany({
          where: { organizationId: organization.id },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

      return {
        organization,
        credentials,
        memory,
      };
    },
    () => ({
      organization: demoOrganization,
      credentials: demoIntegrationCredentials,
      memory: demoProjectMemories,
    }),
  );

export const getDashboardData = async () => {
  const [summary, plan, issues, prs, deployments, developers, projects] = await Promise.all([
    getDashboardSummary(),
    getLatestDailyPlan(),
    getIssues(),
    getPullRequests(),
    getDeployments(),
    getDevelopers(),
    getProjects(),
  ]);

  return {
    summary,
    plan,
    issues,
    prs,
    deployments,
    developers,
    projects,
  };
};

export const getDeveloperWorkload = async () => {
  const [developers, prs, issues] = await Promise.all([getDevelopers(), getPullRequests(), getIssues()]);
  const developerRows = developers as WorkloadDeveloper[];
  const prRows = prs as WorkloadPr[];
  const issueRows = issues as WorkloadIssue[];

  return developerRows.map((developer) => {
    const openIssues = issueRows.filter((issue) => issue.assignees.includes(developer.githubUsername ?? ""));
    const openPrs = prRows.filter((pr) => pr.author === developer.githubUsername && pr.state === PR_STATE_OPEN);
    const workloadScore = Math.min(100, openIssues.length * 14 + openPrs.length * 18 + (100 - developer.currentCapacity));

    return {
      id: developer.id,
      name: developer.name,
      githubUsername: developer.githubUsername,
      role: developer.role,
      strengths: developer.strengths,
      currentOpenIssues: openIssues.length,
      openPrs: openPrs.length,
      workloadScore,
      suggestedNextTask: openIssues[0]?.title ?? "Pick next unassigned high-priority issue",
    };
  });
};

export const getProjectHealthScore = (projectId: string) => {
  const project = demoProjects.find((item) => item.id === projectId);
  if (!project) {
    return 0;
  }

  const projectIssues = demoIssues.filter((issue) => issue.repositoryId === project.repositoryId);
  const projectDeployments = demoDeployments.filter((deployment) => deployment.vercelProjectId === project.vercelProjectId);
  const openIssuePenalty = projectIssues.filter((issue) => issue.state === ISSUE_STATE_OPEN).length * 6;
  const blockedPenalty = projectIssues.filter((issue) => issue.status === TASK_STATUS_BLOCKED).length * 14;
  const failedDeployPenalty = projectDeployments.filter((dep) => dep.state === DEPLOYMENT_STATE_ERROR).length * 20;

  return Math.max(5, 100 - openIssuePenalty - blockedPenalty - failedDeployPenalty);
};

export const getDemoMeta = () => ({
  organizationId: demoIds.organization,
  isDemoMode,
  activityLogs: demoActivityLogs,
});
