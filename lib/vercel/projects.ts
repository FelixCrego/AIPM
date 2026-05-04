import { vercelRequest } from "@/lib/vercel/client";

type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
};

export const listVercelProjects = async () => {
  const response = await vercelRequest<{ projects: VercelProject[] }>("/v9/projects");
  return response.projects;
};

export const syncVercelProjects = async () => listVercelProjects();
