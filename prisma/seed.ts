import { PrismaClient } from "@prisma/client";

import {
  demoActivityLogs,
  demoCommits,
  demoDailyPlan,
  demoDeployments,
  demoDevelopers,
  demoIntegrationCredentials,
  demoIssues,
  demoOrganization,
  demoProjectMemories,
  demoProjects,
  demoPullRequests,
  demoQAReviews,
  demoRepositories,
  demoTaskAssignments,
  demoUser,
  demoVercelProjects,
} from "../lib/demo-data";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.taskAssignment.deleteMany(),
    prisma.aIQAReview.deleteMany(),
    prisma.aIDailyPlan.deleteMany(),
    prisma.vercelDeployment.deleteMany(),
    prisma.projectMemory.deleteMany(),
    prisma.integrationCredential.deleteMany(),
    prisma.gitHubCommit.deleteMany(),
    prisma.gitHubPullRequest.deleteMany(),
    prisma.gitHubIssue.deleteMany(),
    prisma.project.deleteMany(),
    prisma.vercelProject.deleteMany(),
    prisma.repository.deleteMany(),
    prisma.developer.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  await prisma.organization.create({ data: demoOrganization });
  await prisma.user.create({ data: demoUser });

  await prisma.developer.createMany({ data: demoDevelopers });
  await prisma.repository.createMany({ data: demoRepositories });
  await prisma.vercelProject.createMany({ data: demoVercelProjects });
  await prisma.project.createMany({ data: demoProjects });

  await prisma.gitHubIssue.createMany({ data: demoIssues });
  await prisma.gitHubPullRequest.createMany({ data: demoPullRequests });
  await prisma.gitHubCommit.createMany({ data: demoCommits });
  await prisma.vercelDeployment.createMany({ data: demoDeployments });

  await prisma.aIDailyPlan.create({ data: demoDailyPlan });
  await prisma.aIQAReview.createMany({ data: demoQAReviews });
  await prisma.taskAssignment.createMany({ data: demoTaskAssignments });
  await prisma.projectMemory.createMany({ data: demoProjectMemories });
  await prisma.activityLog.createMany({ data: demoActivityLogs });
  await prisma.integrationCredential.createMany({ data: demoIntegrationCredentials });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
