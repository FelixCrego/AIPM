import { prisma } from "@/lib/prisma";
import { listDeployments } from "@/lib/vercel/deployments";
import { listVercelProjects } from "@/lib/vercel/projects";

export const syncVercel = async () => {
  const projects = await listVercelProjects();

  if (!process.env.DATABASE_URL) {
    return { projects: projects.length, deployments: 0, persisted: false };
  }

  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error("No organization found for sync");
  }

  let deploymentCount = 0;

  for (const project of projects.slice(0, 10)) {
    await prisma.vercelProject.upsert({
      where: { vercelId: project.id },
      create: {
        organizationId: organization.id,
        vercelId: project.id,
        name: project.name,
        framework: project.framework,
      },
      update: {
        name: project.name,
        framework: project.framework,
      },
    });

    const deployments = await listDeployments(project.id);
    deploymentCount += deployments.length;
  }

  return {
    projects: projects.length,
    deployments: deploymentCount,
    persisted: true,
  };
};
