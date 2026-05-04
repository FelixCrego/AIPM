import { z } from "zod";

import { AI_OPERATOR_STYLE, runStructuredOutput } from "@/lib/ai/client";
import { getDeployments } from "@/lib/data";

export const deploymentAnalysisSchema = z.object({
  failureSummary: z.string(),
  likelyCause: z.string(),
  suggestedFix: z.string(),
  developerAssignmentRecommendation: z.string(),
  riskLevel: z.enum(["Low", "Medium", "High"]),
});

export type DeploymentAnalysisOutput = z.infer<typeof deploymentAnalysisSchema>;

type DeploymentRecord = {
  id: string;
  state: string;
  errorMessage?: string | null;
  branch?: string | null;
  aiRiskScore?: number | null;
};

export const analyzeDeployment = async (deploymentId: string): Promise<DeploymentAnalysisOutput> => {
  const deployments = (await getDeployments()) as DeploymentRecord[];
  const deployment = deployments.find((item) => item.id === deploymentId);

  if (!deployment) {
    throw new Error("Deployment not found");
  }

  const ai = await runStructuredOutput({
    system: AI_OPERATOR_STYLE,
    user: `Analyze this deployment and provide actionable remediation:\n${JSON.stringify(deployment)}`,
    schema: deploymentAnalysisSchema,
  });

  if (ai) {
    return ai;
  }

  return {
    failureSummary:
      deployment.state === "ERROR"
        ? deployment.errorMessage ?? "Deployment failed with unknown error"
        : "Deployment is healthy",
    likelyCause:
      deployment.state === "ERROR"
        ? "Configuration or code regression on referenced branch"
        : "No immediate cause to investigate",
    suggestedFix:
      deployment.state === "ERROR"
        ? "Patch the failing dependency or env config, then redeploy and run smoke tests"
        : "Continue with QA validation",
    developerAssignmentRecommendation:
      deployment.branch && deployment.branch.includes("billing")
        ? "Assign Michael"
        : deployment.branch && deployment.branch.includes("loading")
          ? "Assign Narendra"
          : "Assign release owner",
    riskLevel: (deployment.aiRiskScore ?? 0) > 0.7 ? "High" : (deployment.aiRiskScore ?? 0) > 0.35 ? "Medium" : "Low",
  };
};
