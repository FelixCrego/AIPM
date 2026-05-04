import { vercelRequest } from "@/lib/vercel/client";

type Deployment = {
  uid: string;
  url: string | null;
  state: string;
  target: string | null;
  createdAt: number;
  meta?: Record<string, string>;
};

export const listDeployments = async (projectId: string) => {
  const response = await vercelRequest<{ deployments: Deployment[] }>(
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=30`,
  );
  return response.deployments;
};

export const getDeployment = async (deploymentId: string) =>
  vercelRequest<Record<string, unknown>>(`/v13/deployments/${encodeURIComponent(deploymentId)}`);

export const analyzeDeploymentFailure = async (deploymentId: string) => {
  const deployment = await getDeployment(deploymentId);
  const state = String(deployment.state ?? "UNKNOWN");
  const errorMessage = String(
    (deployment as { errorMessage?: string }).errorMessage ??
      (deployment as { error?: { message?: string } }).error?.message ??
      "Unknown deployment failure",
  );

  return {
    deploymentId,
    state,
    errorMessage,
    summary:
      state === "ERROR"
        ? `Deployment failed. Probable cause: ${errorMessage}`
        : "Deployment is not in a failed state.",
  };
};
